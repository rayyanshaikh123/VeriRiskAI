from typing import Dict, Optional

import cv2
import numpy as np

from app.services.artifact_analyzer import ArtifactAnalyzer
from app.services.face_extractor import FaceExtractor
from app.services.frequency_detector import FrequencyDetector
from app.services.spatial_detector import SpatialDetector
from app.services.watermark_detector import WatermarkDetector
from app.utils.normalization import clamp01


class ImageProcessor:
    def __init__(
        self,
        face_extractor: FaceExtractor,
        spatial_detector: SpatialDetector,
        frequency_detector: FrequencyDetector,
    ) -> None:
        self._face_extractor = face_extractor
        self._spatial_detector = spatial_detector
        self._frequency_detector = frequency_detector
        self._artifact_analyzer = ArtifactAnalyzer()
        self._watermark_detector = WatermarkDetector()

    def _decode_image(self, image_bytes: bytes) -> np.ndarray | None:
        data = np.frombuffer(image_bytes, dtype=np.uint8)
        return cv2.imdecode(data, cv2.IMREAD_COLOR)

    def _encode_jpeg(self, image: np.ndarray) -> bytes:
        success, buf = cv2.imencode(".jpg", image)
        if not success:
            return b""
        return buf.tobytes()

    def process(self, image_bytes: bytes) -> Dict[str, Optional[float]]:
        image = self._decode_image(image_bytes)
        if image is None:
            return {
                "spatial_fake_score": 0.0,
                "frequency_fake_score": 0.0,
                "temporal_score": None,
                "artifact_flag": False,
                "watermark_detected": False,
            }

        image = cv2.resize(image, (224, 224))
        faces = self._face_extractor.extract(image_bytes).get("faces", [])
        face_box = faces[0] if faces else None
        if face_box:
            x, y, w, h = face_box
            x = max(0, min(x, image.shape[1] - 1))
            y = max(0, min(y, image.shape[0] - 1))
            w = max(1, min(w, image.shape[1] - x))
            h = max(1, min(h, image.shape[0] - y))
            roi = image[y : y + h, x : x + w]
        else:
            roi = image

        roi_bytes = self._encode_jpeg(roi)
        spatial = clamp01(self._spatial_detector.detect(roi_bytes).get("score", 0.0))
        frequency = clamp01(
            self._frequency_detector.detect(roi_bytes).get("score", 0.0)
        )
        artifact = self._artifact_analyzer.analyze(roi, face_box if face_box else None)
        watermark = self._watermark_detector.detect(roi)

        return {
            "spatial_fake_score": float(spatial),
            "frequency_fake_score": float(frequency),
            "temporal_score": None,
            "artifact_flag": bool(artifact.get("artifact_flag", False)),
            "artifact_score": float(artifact.get("score", 0.0)),
            "watermark_detected": bool(watermark.get("watermark_detected", False)),
        }
