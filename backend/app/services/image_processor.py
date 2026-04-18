from typing import Dict, Optional

from app.services.face_extractor import FaceExtractor
from app.services.frequency_detector import FrequencyDetector
from app.services.spatial_detector import SpatialDetector


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

    def process(self, image_bytes: bytes) -> Dict[str, Optional[float]]:
        self._face_extractor.extract(image_bytes)
        spatial = self._spatial_detector.detect(image_bytes).get("score", 0.5)
        frequency = self._frequency_detector.detect(image_bytes).get("score", 0.5)
        return {
            "spatial_fake_score": float(spatial),
            "frequency_fake_score": float(frequency),
            "temporal_score": None,
        }
