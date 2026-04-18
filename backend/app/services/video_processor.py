from __future__ import annotations

import logging
import tempfile
from typing import Dict, List

import cv2
import numpy as np

from app.core.config import settings
from app.services.artifact_analyzer import ArtifactAnalyzer
from app.services.frequency_detector import FrequencyDetector
from app.services.spatial_detector import SpatialDetector
from app.services.temporal_detector import TemporalDetector
from app.services.watermark_detector import WatermarkDetector
from app.utils.normalization import clamp01


class VideoProcessor:
    def __init__(
        self,
        spatial_detector: SpatialDetector,
        frequency_detector: FrequencyDetector,
        temporal_detector: TemporalDetector,
    ) -> None:
        self._spatial_detector = spatial_detector
        self._frequency_detector = frequency_detector
        self._temporal_detector = temporal_detector
        self._artifact_analyzer = ArtifactAnalyzer()
        self._watermark_detector = WatermarkDetector()
        self._logger = logging.getLogger("video_processor")

    def _extract_frames(self, video_bytes: bytes) -> List[np.ndarray]:
        target_count = max(1, settings.video_frame_sample_count)
        with tempfile.NamedTemporaryFile(suffix=".mp4") as temp:
            temp.write(video_bytes)
            temp.flush()
            capture = cv2.VideoCapture(temp.name)
            if not capture.isOpened():
                self._logger.warning("Video decode failed")
                return []

            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            if frame_count <= 0:
                frame_count = target_count

            indices = np.linspace(0, max(0, frame_count - 1), target_count).astype(int)
            frames: List[np.ndarray] = []
            for idx in indices:
                capture.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
                ok, frame = capture.read()
                if ok and frame is not None:
                    frames.append(frame)
            capture.release()
            self._logger.info(
                "Frame sampling: %s",
                {"requested": target_count, "extracted": len(frames)},
            )
        return frames

    def _encode_jpeg(self, frame: np.ndarray) -> bytes:
        success, buf = cv2.imencode(".jpg", frame)
        if not success:
            return b""
        return buf.tobytes()

    def process(self, video_bytes: bytes) -> Dict[str, float | bool]:
        frames = self._extract_frames(video_bytes)
        if not frames:
            self._logger.warning("No frames extracted")
            return {
                "spatial_fake_score": 0.0,
                "frequency_fake_score": 0.0,
                "temporal_score": 0.0,
                "artifact_flag": False,
                "artifact_score": 0.0,
                "watermark_detected": False,
            }

        spatial_scores: List[float] = []
        frequency_scores: List[float] = []
        artifact_scores: List[float] = []
        artifact_flags: List[bool] = []
        watermark_flags: List[bool] = []
        frame_bytes: List[bytes] = []

        for frame in frames:
            resized = cv2.resize(frame, (224, 224))
            encoded = self._encode_jpeg(resized)
            frame_bytes.append(encoded)

            if not encoded:
                self._logger.warning("Frame encoding failed")

            spatial_scores.append(
                clamp01(self._spatial_detector.detect(encoded).get("score", 0.0))
            )
            frequency_scores.append(
                clamp01(self._frequency_detector.detect(encoded).get("score", 0.0))
            )

            artifact = self._artifact_analyzer.analyze(resized, None)
            artifact_scores.append(float(artifact.get("score", 0.0)))
            artifact_flags.append(bool(artifact.get("artifact_flag", False)))

            watermark = self._watermark_detector.detect(resized)
            watermark_flags.append(bool(watermark.get("watermark_detected", False)))

        spatial_avg = float(np.mean(spatial_scores))
        frequency_avg = float(np.mean(frequency_scores))
        artifact_avg = float(np.mean(artifact_scores))
        temporal_score = float(self._temporal_detector.detect(frame_bytes).get("score", 0.0))

        self._logger.info(
            "Signal outputs: %s",
            {
                "spatial_fake_score": spatial_avg,
                "frequency_fake_score": frequency_avg,
                "temporal_score": temporal_score,
                "artifact_score": artifact_avg,
                "artifact_flag": any(artifact_flags),
                "watermark_detected": any(watermark_flags),
            },
        )

        return {
            "spatial_fake_score": clamp01(spatial_avg),
            "frequency_fake_score": clamp01(frequency_avg),
            "temporal_score": clamp01(temporal_score),
            "artifact_flag": any(artifact_flags),
            "artifact_score": clamp01(artifact_avg),
            "watermark_detected": any(watermark_flags),
        }
