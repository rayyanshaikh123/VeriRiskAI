"""
video_processor.py
------------------
Advanced video deepfake detection pipeline.

NEW PIPELINE (replaces the simple frame-average approach):

    Video bytes
        ↓
    Frame Extraction  (sample every N frames via OpenCV)
        ↓
    Face Detection + Crop  (InsightFace / RetinaFace per frame)
        ↓
    Face Preprocessing  (resize to 224×224, JPEG encode)
        ↓
    CNN Feature Extraction  (Xception with head removed → 2048-dim embedding)
    CNN Classification      (full Xception head → per-frame fake score)
        ↓  ↓
    LSTM Temporal Model     (sequence of embeddings → temporal_score)
    Heuristic Analyzer      (blink, lip-sync, frame-diff → heuristic_score)
        ↓
    Score Fusion (FusionEngine.video_fuse)
        ↓
    Final Output: verdict, confidence, risk_level, all sub-scores
"""
from __future__ import annotations

import logging
import tempfile
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.core.config import settings
from app.services.artifact_analyzer import ArtifactAnalyzer
from app.services.frequency_detector import FrequencyDetector
from app.services.fusion_engine import FusionEngine
from app.services.heuristics import HeuristicAnalyzer
from app.services.lstm_model import LSTMTemporalDetector
from app.services.spatial_detector import SpatialDetector
from app.services.watermark_detector import WatermarkDetector
from app.utils.normalization import clamp01


class VideoProcessor:
    """
    Orchestrates the full multi-stage video deepfake detection pipeline.

    Each component is injected via the constructor so they can be shared
    (and lazily initialised) across requests.
    """

    def __init__(
        self,
        spatial_detector: SpatialDetector,
        frequency_detector: FrequencyDetector,
        temporal_detector: LSTMTemporalDetector,  # updated type
    ) -> None:
        self._spatial_detector = spatial_detector
        self._frequency_detector = frequency_detector
        self._temporal_detector = temporal_detector   # now the LSTM wrapper
        self._artifact_analyzer = ArtifactAnalyzer()
        self._watermark_detector = WatermarkDetector()
        self._heuristic_analyzer = HeuristicAnalyzer()  # NEW
        self._fusion_engine = FusionEngine()            # used for video_fuse
        self._logger = logging.getLogger("video_processor")

    # ------------------------------------------------------------------
    # Stage 1: Frame extraction
    # ------------------------------------------------------------------

    def _extract_frames(self, video_bytes: bytes) -> List[np.ndarray]:
        """
        Decode the video and sample `video_frame_sample_count` frames
        evenly distributed across the clip duration.

        Returns raw BGR numpy frames (original resolution).
        """
        target_count = max(1, settings.video_frame_sample_count)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        try:
            capture = cv2.VideoCapture(tmp_path)
            if not capture.isOpened():
                self._logger.warning("Video decode failed — could not open file")
                return []

            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            if frame_count <= 0:
                frame_count = target_count  # fallback

            indices = np.linspace(0, max(0, frame_count - 1), target_count).astype(int)
            frames: List[np.ndarray] = []

            for idx in indices:
                capture.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
                ok, frame = capture.read()
                if ok and frame is not None:
                    frames.append(frame)

            capture.release()

        except Exception as exc:
            self._logger.warning("Frame extraction error: %s", exc)
            return []

        self._logger.info(
            "Frame sampling: requested=%d extracted=%d", target_count, len(frames)
        )
        return frames

    # ------------------------------------------------------------------
    # Stage 2: Face detection + crop
    # ------------------------------------------------------------------

    def _detect_and_crop_face(
        self, frame: np.ndarray, last_bbox: Optional[Tuple[int, int, int, int]] = None
    ) -> Tuple[np.ndarray, Optional[Tuple[int, int, int, int]]]:
        """
        Detect the largest face in the frame and return the cropped ROI.

        Falls back to the last known bounding box if available, otherwise the full frame.
        Also returns the bounding box for downstream use.
        """
        try:
            from app.services.face_extractor import FaceExtractor

            # We instantiate lazily to avoid circular import and keep startup fast
            if not hasattr(self, "_face_extractor"):
                self._face_extractor = FaceExtractor()

            encoded = self._encode_jpeg(cv2.resize(frame, (640, 480)))
            result = self._face_extractor.extract(encoded)
            faces = result.get("faces", [])

            if faces:
                x, y, w, h = faces[0]
            elif last_bbox:
                x, y, w, h = last_bbox
            else:
                return frame, None
                
            x = max(0, min(x, frame.shape[1] - 1))
            y = max(0, min(y, frame.shape[0] - 1))
            w = max(1, min(w, frame.shape[1] - x))
            h = max(1, min(h, frame.shape[0] - y))
            crop = frame[y : y + h, x : x + w]
            return crop, (x, y, w, h)

        except Exception as exc:
            self._logger.debug("Face detection skipped/failed: %s", exc)

        if last_bbox:
            x, y, w, h = last_bbox
            x = max(0, min(x, frame.shape[1] - 1))
            y = max(0, min(y, frame.shape[0] - 1))
            w = max(1, min(w, frame.shape[1] - x))
            h = max(1, min(h, frame.shape[0] - y))
            crop = frame[y : y + h, x : x + w]
            return crop, (x, y, w, h)

        return frame, None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _encode_jpeg(self, frame: np.ndarray) -> bytes:
        """Encode a BGR numpy array to JPEG bytes."""
        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            return b""
        return buf.tobytes()

    def _preprocess_face(self, crop: np.ndarray) -> bytes:
        """Resize face crop to 224×224 and JPEG-encode it."""
        resized = cv2.resize(crop, (224, 224))
        return self._encode_jpeg(resized)

    # ------------------------------------------------------------------
    # Main public API
    # ------------------------------------------------------------------

    def process(self, video_bytes: bytes) -> Dict[str, object]:
        """
        Run the full video deepfake detection pipeline.

        Returns a flat dict of all signals so the API layer can pick what
        it needs.  Keys include:

        Core scores:
            spatial_fake_score   (float) — CNN frame average
            frequency_fake_score (float) — FFT frame average
            temporal_score       (float) — LSTM temporal score
            artifact_flag        (bool)
            artifact_score       (float)
            watermark_detected   (bool)
            watermark_score      (float)

        New advanced scores:
            lstm_score           (float) — same as temporal_score, explicit alias
            heuristic_score      (float) — behavioral heuristic composite
            blink_score          (float)
            lip_score            (float)
            frame_diff_score     (float)
            cnn_score            (float) — same as spatial_fake_score, explicit alias

        Fusion output:
            final_score          (float) — fused CNN + LSTM + heuristic
            verdict              (str)   — ACCEPT / REVIEW / REJECT
            confidence           (float)
            risk_level           (str)   — LOW / MEDIUM / HIGH
            fusion_components    (dict)  — individual scores + weights
        """
        # ------------------------------------------------------------------ #
        # Stage 1: Extract frames                                              #
        # ------------------------------------------------------------------ #
        frames = self._extract_frames(video_bytes)
        if not frames:
            self._logger.warning("No frames extracted — returning safe defaults")
            return self._empty_result()

        # ------------------------------------------------------------------ #
        # Stage 2–4: Per-frame processing                                      #
        # ------------------------------------------------------------------ #
        spatial_scores: List[float] = []
        frequency_scores: List[float] = []
        artifact_scores: List[float] = []
        artifact_flags: List[bool] = []
        watermark_flags: List[bool] = []
        watermark_scores: List[float] = []
        embeddings: List[np.ndarray] = []      # for LSTM
        preprocessed_faces: List[np.ndarray] = []  # raw BGR 224×224 for heuristics

        last_bbox = None
        for i, frame in enumerate(frames):
            # Stage 2: Face detection + crop (using previous bbox as fallback)
            crop, bbox = self._detect_and_crop_face(frame, last_bbox)
            if bbox is not None:
                last_bbox = bbox

            # Stage 3: Preprocess face (resize + encode)
            face_bytes = self._preprocess_face(crop)
            face_bgr_224 = cv2.resize(crop, (224, 224))
            preprocessed_faces.append(face_bgr_224)

            if not face_bytes:
                self._logger.debug("Frame %d: face encoding failed — skipping", i)
                continue

            # Stage 4a: CNN classification score (existing pipeline)
            spatial_scores.append(
                clamp01(self._spatial_detector.detect(face_bytes).get("score", 0.0))
            )
            frequency_scores.append(
                clamp01(self._frequency_detector.detect(face_bytes).get("score", 0.0))
            )

            # Stage 4b: CNN feature extraction for LSTM input
            embedding = self._spatial_detector.extract_embedding(face_bytes)
            if embedding is not None:
                embeddings.append(embedding)

            # Artifact + watermark per frame
            artifact = self._artifact_analyzer.analyze(face_bgr_224, bbox)
            artifact_scores.append(float(artifact.get("score", 0.0)))
            artifact_flags.append(bool(artifact.get("artifact_flag", False)))

            watermark = self._watermark_detector.analyze(face_bgr_224)
            watermark_flags.append(bool(watermark.get("watermark_detected", False)))
            watermark_scores.append(float(watermark.get("watermark_score", 0.0)))

        # ------------------------------------------------------------------ #
        # Stage 5: LSTM temporal modeling                                      #
        # ------------------------------------------------------------------ #
        lstm_result = self._temporal_detector.detect(embeddings)
        lstm_score = clamp01(float(lstm_result.get("score", 0.5)))

        # ------------------------------------------------------------------ #
        # Stage 6: Heuristic behavioral analysis                               #
        # ------------------------------------------------------------------ #
        heuristic_result = self._heuristic_analyzer.analyze(preprocessed_faces)
        heuristic_score = clamp01(float(heuristic_result.get("heuristic_score", 0.0)))
        blink_score = clamp01(float(heuristic_result.get("blink_score", 0.0)))
        lip_score = clamp01(float(heuristic_result.get("lip_score", 0.0)))
        frame_diff_score = clamp01(float(heuristic_result.get("frame_diff_score", 0.0)))

        # ------------------------------------------------------------------ #
        # Stage 7: Frame-level aggregation                                     #
        # ------------------------------------------------------------------ #
        if spatial_scores:
            scores = sorted(spatial_scores)
            if len(scores) > 4:
                scores = scores[2:-2]   # remove outliers
            cnn_score = sum(scores) / len(scores)
        else:
            cnn_score = 0.0
        frequency_avg = float(np.max(frequency_scores)) if frequency_scores else 0.0
        artifact_avg = float(np.max(artifact_scores)) if artifact_scores else 0.0
        watermark_avg = float(np.max(watermark_scores)) if watermark_scores else 0.0

        # ------------------------------------------------------------------ #
        # Stage 8: Score fusion                                                #
        # ------------------------------------------------------------------ #
        lstm_model_loaded = getattr(self._temporal_detector, "_model", None) is not None
        fusion = self._fusion_engine.video_fuse(
            cnn_score=cnn_score,
            lstm_score=lstm_score,
            heuristic_score=heuristic_score,
            lstm_model_loaded=lstm_model_loaded,
        )

        report = f"""
=========================================================
                 VERIRISK VIDEO ANALYSIS                 
=========================================================
FRAMES EXTRACTED :  {len(frames)}
CNN EMBEDDINGS   :  {len(embeddings)}

--- [1] SPATIAL ANALYSIS (XCEPTION CNN) -----------------
"""
        if spatial_scores:
            for i, sc in enumerate(spatial_scores):
                report += f"  Frame {i:02d}: {sc:.4f}\n"
            report += f"  --> MAXIMUM CNN SCORE: {cnn_score:.4f}\n"
        else:
            report += "  No spatial scores extracted.\n"

        report += f"""
--- [2] TEMPORAL ANALYSIS (BIDIRECTIONAL LSTM) ----------
  --> LSTM SEQUENCE SCORE: {lstm_score:.4f}

--- [3] BEHAVIORAL HEURISTICS ---------------------------
  Frame Diff Score       : {frame_diff_score:.4f}
  Eye Blink Score (EAR)  : {blink_score:.4f}
  Lip Sync Consistency   : {lip_score:.4f}
  --> COMBINED HEURISTIC : {heuristic_score:.4f}

--- [4] FUSION CALCULATION ------------------------------
  Weights : CNN ({fusion['components']['weights']['cnn']:.2f}) | LSTM ({fusion['components']['weights']['lstm']:.2f}) | HEUR ({fusion['components']['weights']['heuristic']:.2f})
  Math    : ({cnn_score:.4f} * {fusion['components']['weights']['cnn']:.2f}) + ({lstm_score:.4f} * {fusion['components']['weights']['lstm']:.2f}) + ({heuristic_score:.4f} * {fusion['components']['weights']['heuristic']:.2f})
  Final   : {float(fusion['final_score']):.4f}

  VERDICT    :  {fusion['verdict']}
  RISK LEVEL :  {fusion['risk_level']}
=========================================================
"""
        print(report, flush=True)
        self._logger.info("Video pipeline complete. Risk Level: %s (%.4f)", fusion['risk_level'], float(fusion['final_score']))

        return {
            # --- Legacy keys (kept for backward compat with API layer) ---
            "spatial_fake_score": clamp01(cnn_score),
            "frequency_fake_score": clamp01(frequency_avg),
            "temporal_score": lstm_score,           # LSTM score exposed as temporal
            "artifact_flag": any(artifact_flags),
            "artifact_score": clamp01(artifact_avg),
            "watermark_detected": any(watermark_flags),
            "watermark_score": clamp01(watermark_avg),
            "behavioral_score": heuristic_score,    # heuristic exposed as behavioral

            # --- New explicit advanced keys ---
            "cnn_score": clamp01(cnn_score),
            "lstm_score": lstm_score,
            "heuristic_score": heuristic_score,
            "blink_score": blink_score,
            "lip_score": lip_score,
            "frame_diff_score": frame_diff_score,

            # --- Fusion output ---
            "final_score": float(fusion["final_score"]),
            "verdict": fusion["verdict"],
            "confidence": float(fusion["confidence"]),
            "risk_level": fusion["risk_level"],
            "fusion_components": fusion["components"],
        }

    def _empty_result(self) -> Dict[str, object]:
        """Safe default result when no frames could be extracted."""
        return {
            "spatial_fake_score": 0.0,
            "frequency_fake_score": 0.0,
            "temporal_score": 0.0,
            "artifact_flag": False,
            "artifact_score": 0.0,
            "watermark_detected": False,
            "watermark_score": 0.0,
            "behavioral_score": 0.0,
            "cnn_score": 0.0,
            "lstm_score": 0.0,
            "heuristic_score": 0.0,
            "blink_score": 0.0,
            "lip_score": 0.0,
            "frame_diff_score": 0.0,
            "final_score": 0.0,
            "verdict": "REVIEW",
            "confidence": 0.5,
            "risk_level": "MEDIUM",
            "fusion_components": {},
        }
