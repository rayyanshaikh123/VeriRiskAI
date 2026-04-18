import logging

from fastapi import APIRouter, Request, status

from app.core.config import settings
from app.schemas.common import ErrorCode, Verdict
from app.schemas.verify import (
    InputType,
    SignalBreakdown,
    SignalFlags,
    VerifyUploadEnvelope,
    VerifyUploadRequest,
    VerifyUploadResponse,
)
from app.services.face_extractor import FaceExtractor
from app.services.frequency_detector import FrequencyDetector
from app.services.fusion_engine import FusionEngine
from app.services.image_processor import ImageProcessor
from app.services.spatial_detector import SpatialDetector
from app.services.temporal_detector import TemporalDetector
from app.services.video_processor import VideoProcessor
from app.utils.errors import raise_api_error
from app.utils.response import success_envelope
from app.utils.validation import (
    ImageValidationError,
    VideoValidationError,
    validate_base64_image,
    validate_base64_video,
)

router = APIRouter(prefix="/verify", tags=["verify"])

_face_extractor = FaceExtractor()
_spatial_detector = SpatialDetector()
_frequency_detector = FrequencyDetector()
_temporal_detector = TemporalDetector()
_image_processor = ImageProcessor(_face_extractor, _spatial_detector, _frequency_detector)
_video_processor = VideoProcessor(_spatial_detector, _frequency_detector, _temporal_detector)
_fusion_engine = FusionEngine()
_logger = logging.getLogger("verify_pipeline")


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


@router.post("/upload", response_model=VerifyUploadEnvelope)
async def upload_verification(request: Request, body: VerifyUploadRequest):
    expected_keys = {
        "spatial_fake_score",
        "frequency_fake_score",
        "artifact_flag",
        "artifact_score",
        "watermark_detected",
    }
    if body.input_type == InputType.video:
        expected_keys.add("temporal_score")

    if body.input_type == InputType.image:
        try:
            payload = validate_base64_image(
                body.file,
                settings.max_image_upload_bytes,
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
        raw_signals = _image_processor.process(payload)
    else:
        try:
            payload = validate_base64_video(
                body.file,
                settings.max_video_upload_bytes,
                settings.allowed_video_formats,
                ErrorCode.INVALID_VIDEO.value,
            )
        except VideoValidationError as exc:
            status_code = (
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                if "size" in str(exc).lower()
                else status.HTTP_400_BAD_REQUEST
            )
            raise_api_error(ErrorCode(exc.error_code), str(exc), status_code)
        raw_signals = _video_processor.process(payload)

    missing = [key for key in expected_keys if key not in raw_signals]
    if missing:
        _logger.warning("Missing detector outputs: %s", missing)
    _logger.info(
        "Detector outputs: %s",
        {
            "input_type": body.input_type.value,
            "spatial_fake_score": raw_signals.get("spatial_fake_score"),
            "frequency_fake_score": raw_signals.get("frequency_fake_score"),
            "temporal_score": raw_signals.get("temporal_score"),
            "artifact_flag": raw_signals.get("artifact_flag"),
            "artifact_score": raw_signals.get("artifact_score"),
            "watermark_detected": raw_signals.get("watermark_detected"),
        },
    )

    signals = SignalBreakdown(
        spatial_fake_score=_clamp(raw_signals.get("spatial_fake_score", 0.0)),
        frequency_fake_score=_clamp(raw_signals.get("frequency_fake_score", 0.0)),
        temporal_score=(
            _clamp(raw_signals["temporal_score"])
            if raw_signals.get("temporal_score") is not None
            else None
        ),
    )

    flags = SignalFlags(
        artifact_flag=bool(raw_signals.get("artifact_flag", False)),
        frequency_anomaly=signals.frequency_fake_score > settings.frequency_anomaly_threshold,
        temporal_inconsistency=(
            signals.temporal_score is not None
            and signals.temporal_score > settings.temporal_inconsistency_threshold
        ),
        watermark_detected=bool(raw_signals.get("watermark_detected", False)),
    )

    fusion_payload = signals.model_dump() | {
        "artifact_score": raw_signals.get("artifact_score", 0.0),
        "watermark_detected": flags.watermark_detected,
    }
    fusion_result = _fusion_engine.fuse(fusion_payload)
    confidence = _clamp(fusion_result.get("confidence", 0.5))
    verdict_value = fusion_result.get("verdict")
    if isinstance(verdict_value, str) and verdict_value in Verdict._value2member_map_:
        verdict = Verdict(verdict_value)
    else:
        verdict = Verdict.REVIEW

    data = VerifyUploadResponse(
        verdict=verdict,
        confidence=confidence,
        signals=signals,
        flags=flags,
    )
    return success_envelope(request, data)
