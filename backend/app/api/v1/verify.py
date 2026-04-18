import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Header, Request, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.common import ErrorCode, SessionState, Verdict
from app.schemas.verify import (
    HeatmapArtifact,
    SignalBreakdown,
    VerifyFrameEnvelope,
    VerifyFrameRequest,
    VerifyFrameResponse,
    VerifyStartEnvelope,
    VerifyStartRequest,
    VerifyStartResponse,
    VerifySubmitEnvelope,
    VerifySubmitRequest,
    VerifySubmitResponse,
)
from app.services.behavioral_analyzer import BehavioralAnalyzer
from app.services.challenge_engine import ChallengeEngine
from app.services.clip_detector import ClipDetector
from app.services.explainability import ExplainabilityService
from app.services.face_extractor import FaceExtractor
from app.services.face_matcher import FaceMatcher
from app.services.frequency_detector import FrequencyDetector
from app.services.fusion_engine import FusionEngine
from app.services.liveness_detector import LivenessDetector
from app.services.spatial_detector import SpatialDetector
from app.services.temporal_detector import TemporalDetector
from app.storage.redis_store import store
from app.utils.errors import raise_api_error
from app.utils.response import success_envelope
from app.utils.validation import ImageValidationError, validate_base64_image

router = APIRouter(prefix="/verify", tags=["verify"])

_face_extractor = FaceExtractor()
_face_matcher = FaceMatcher()
_liveness_detector = LivenessDetector()
_spatial_detector = SpatialDetector()
_frequency_detector = FrequencyDetector()
_temporal_detector = TemporalDetector()
_clip_detector = ClipDetector()
_behavioral_analyzer = BehavioralAnalyzer()
_challenge_engine = ChallengeEngine()
_fusion_engine = FusionEngine()
_explainability = ExplainabilityService()


def _get_session_or_error(session_id: str):
    record = store.get_session(session_id)
    if not record:
        raise_api_error(
            ErrorCode.SESSION_NOT_FOUND,
            "Session not found",
            status.HTTP_404_NOT_FOUND,
        )
    if record.state == SessionState.EXPIRED:
        raise_api_error(
            ErrorCode.SESSION_EXPIRED,
            "Session expired",
            status.HTTP_410_GONE,
        )
    return record


def _normalize_base64(value: str) -> str:
    return "".join(value.split())


def _hash_payload(payload: dict) -> str:
    normalized = dict(payload)
    if "id_image_b64" in normalized and isinstance(normalized["id_image_b64"], str):
        normalized["id_image_b64"] = _normalize_base64(normalized["id_image_b64"])
    encoded = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    composite = f"{normalized.get('session_id','')}.{normalized.get('id_image_b64','')}.{encoded}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def _build_signals(liveness_score: float) -> SignalBreakdown:
    return SignalBreakdown(
        face_match_score=0.85,
        liveness_score=liveness_score,
        spatial_fake_score=0.1,
        frequency_fake_score=0.1,
        temporal_score=0.5,
        clip_score=0.6,
        behavioral_score=0.7,
        challenge_score=1.0 if liveness_score >= 1.0 else 0.6,
    )


def _score_from(result: dict, default: float = 0.5) -> float:
    score = result.get("score", default)
    if not isinstance(score, (int, float)):
        return default
    return max(0.0, min(1.0, float(score)))


@router.post("/start", response_model=VerifyStartEnvelope)
async def start_verification(request: Request, body: VerifyStartRequest):
    record = store.create_session(body.user_id, body.session_type)
    data = VerifyStartResponse(session_id=record.session_id, challenges=record.challenges)
    return success_envelope(request, data)


@router.post("/frame", response_model=VerifyFrameEnvelope)
async def submit_frame(request: Request, body: VerifyFrameRequest):
    record = _get_session_or_error(body.session_id)
    client_ip = request.client.host if request.client else None
    if not store.check_rate_limit(record.session_id, client_ip, settings.max_frames_per_second):
        raise_api_error(
            ErrorCode.RATE_LIMITED,
            "Frame rate limit exceeded",
            status.HTTP_429_TOO_MANY_REQUESTS,
            details={"max_frames_per_second": settings.max_frames_per_second},
        )
    try:
        frame_bytes = validate_base64_image(
            body.frame_b64,
            settings.max_frame_bytes,
            settings.allowed_image_formats,
            ErrorCode.INVALID_FRAME.value,
            settings.max_frame_pixels,
        )
    except ImageValidationError as exc:
        status_code = (
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            if "size" in str(exc).lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise_api_error(ErrorCode(exc.error_code), str(exc), status_code)
    if record.state in {SessionState.SUBMITTED, SessionState.COMPLETED}:
        raise_api_error(
            ErrorCode.VALIDATION_ERROR,
            "Session already submitted",
            status.HTTP_400_BAD_REQUEST,
        )
    if record.frame_count >= settings.max_frames:
        raise_api_error(
            ErrorCode.INVALID_FRAME,
            "Max frames reached",
            status.HTTP_400_BAD_REQUEST,
            details={"max_frames": settings.max_frames},
        )
    try:
        frame_ref = f"frame:{body.frame_index}"
        record = store.append_frame(record.session_id, body.frame_index, frame_ref)
    except RuntimeError:
        raise_api_error(
            ErrorCode.INTERNAL_ERROR,
            "Session busy",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    base_liveness = _score_from(_liveness_detector.detect([frame_bytes]))
    progress = min(1.0, record.frame_count / float(settings.min_frames))
    liveness_score = min(1.0, base_liveness * progress)
    data = VerifyFrameResponse(
        liveness_score=liveness_score,
        face_detected=True,
        challenge_passed=record.challenge_passed,
    )
    return success_envelope(request, data)


@router.post("/submit", response_model=VerifySubmitEnvelope)
async def submit_verification(
    request: Request,
    body: VerifySubmitRequest,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    if not idempotency_key or not idempotency_key.strip():
        raise_api_error(
            ErrorCode.VALIDATION_ERROR,
            "Idempotency-Key header is required",
            status.HTTP_400_BAD_REQUEST,
        )
    try:
        id_bytes = validate_base64_image(
            body.id_image_b64,
            settings.max_frame_bytes,
            settings.allowed_image_formats,
            ErrorCode.INVALID_IMAGE.value,
            settings.max_frame_pixels,
        )
    except ImageValidationError as exc:
        status_code = (
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            if "size" in str(exc).lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise_api_error(ErrorCode(exc.error_code), str(exc), status_code)

    payload_hash = _hash_payload(body.model_dump())
    entry = store.get_idempotency(idempotency_key)
    if entry:
        if entry.request_hash == payload_hash:
            return JSONResponse(status_code=status.HTTP_200_OK, content=entry.response_payload)
        raise_api_error(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            "Idempotency-Key reused with different payload",
            status.HTTP_409_CONFLICT,
        )

    lock_key = store.idempotency_lock_key(idempotency_key)
    lock_token = store.acquire_lock(lock_key)
    if not lock_token:
        raise_api_error(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            "Idempotency-Key is locked by another request",
            status.HTTP_409_CONFLICT,
        )
    try:
        entry = store.get_idempotency(idempotency_key)
        if entry:
            if entry.request_hash == payload_hash:
                return JSONResponse(status_code=status.HTTP_200_OK, content=entry.response_payload)
            raise_api_error(
                ErrorCode.IDEMPOTENCY_CONFLICT,
                "Idempotency-Key reused with different payload",
                status.HTTP_409_CONFLICT,
            )
        record = _get_session_or_error(body.session_id)
        if record.state == SessionState.COMPLETED:
            raise_api_error(
                ErrorCode.VALIDATION_ERROR,
                "Session already completed",
                status.HTTP_400_BAD_REQUEST,
            )
        if record.frame_count < settings.min_frames or not record.challenge_passed:
            raise_api_error(
                ErrorCode.VALIDATION_ERROR,
                "Minimum frames or challenge requirement not met",
                status.HTTP_400_BAD_REQUEST,
                details={
                    "min_frames": settings.min_frames,
                    "frame_count": record.frame_count,
                    "challenge_passed": record.challenge_passed,
                },
            )
        _face_extractor.extract(id_bytes)
        face_match_result = _face_matcher.match(id_bytes, id_bytes)
        liveness_result = _liveness_detector.detect([id_bytes])
        spatial_result = _spatial_detector.detect(id_bytes)
        frequency_result = _frequency_detector.detect(id_bytes)
        temporal_result = _temporal_detector.detect([id_bytes])
        clip_result = _clip_detector.detect([id_bytes])
        behavioral_result = _behavioral_analyzer.analyze([id_bytes])
        challenge_result = _challenge_engine.evaluate([id_bytes])

        liveness_score = _score_from(liveness_result)
        signals = SignalBreakdown(
            face_match_score=_score_from(face_match_result),
            liveness_score=liveness_score,
            spatial_fake_score=_score_from(spatial_result),
            frequency_fake_score=_score_from(frequency_result),
            temporal_score=_score_from(temporal_result),
            clip_score=_score_from(clip_result),
            behavioral_score=_score_from(behavioral_result),
            challenge_score=_score_from({"score": challenge_result.get("score", 0.5)}),
        )
        confidence = min(1.0, (signals.face_match_score + signals.liveness_score) / 2.0)
        fusion_result = _fusion_engine.fuse(
            {
                "face_match_score": signals.face_match_score,
                "liveness_score": signals.liveness_score,
                "spatial_fake_score": signals.spatial_fake_score,
                "frequency_fake_score": signals.frequency_fake_score,
                "temporal_score": signals.temporal_score or 0.0,
                "clip_score": signals.clip_score,
                "behavioral_score": signals.behavioral_score,
                "challenge_score": signals.challenge_score,
            }
        )
        fusion_verdict = fusion_result.get("verdict")
        if isinstance(fusion_verdict, str) and fusion_verdict in Verdict._value2member_map_:
            verdict = Verdict(fusion_verdict)
        else:
            verdict = Verdict.ACCEPT if confidence >= 0.8 else Verdict.REVIEW

        explain = _explainability.generate(
            {
                "face_match_score": signals.face_match_score,
                "liveness_score": signals.liveness_score,
                "spatial_fake_score": signals.spatial_fake_score,
                "frequency_fake_score": signals.frequency_fake_score,
                "temporal_score": signals.temporal_score,
                "clip_score": signals.clip_score,
                "behavioral_score": signals.behavioral_score,
                "challenge_score": signals.challenge_score,
            }
        )
        heatmap_url = explain.get("heatmap_url")
        if heatmap_url:
            heatmap = HeatmapArtifact(
                url=str(heatmap_url),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
                mime_type="image/png",
            )
        else:
            heatmap = HeatmapArtifact(
                url=f"https://cdn.verifyiq.example/heatmaps/{record.session_id}.png",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
                mime_type="image/png",
            )
        try:
            record = store.submit_session(record.session_id, verdict, confidence, signals, heatmap)
        except RuntimeError:
            raise_api_error(
                ErrorCode.INTERNAL_ERROR,
                "Session busy",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        data = VerifySubmitResponse(
            verdict=verdict,
            confidence=confidence,
            heatmap=heatmap,
            signals=signals,
            session_id=record.session_id,
        )
        envelope = success_envelope(request, data)
        store.set_idempotency(idempotency_key, payload_hash, envelope.model_dump(mode="json"))
        return envelope
    finally:
        store.release_lock(lock_key, lock_token)
