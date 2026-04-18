from typing import Dict, List

from app.core.config import settings
from app.services.frequency_detector import FrequencyDetector
from app.services.spatial_detector import SpatialDetector
from app.services.temporal_detector import TemporalDetector


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

    def _extract_frames(self, video_bytes: bytes) -> List[bytes]:
        target_count = max(1, settings.video_frame_sample_count)
        chunk_size = max(1, len(video_bytes) // target_count)
        frames = [
            video_bytes[offset : offset + chunk_size]
            for offset in range(0, len(video_bytes), chunk_size)
        ]
        if not frames:
            frames = [video_bytes]
        return frames[:target_count]

    def process(self, video_bytes: bytes) -> Dict[str, float]:
        frames = self._extract_frames(video_bytes)
        spatial_scores = [
            float(self._spatial_detector.detect(frame).get("score", 0.5))
            for frame in frames
        ]
        frequency_scores = [
            float(self._frequency_detector.detect(frame).get("score", 0.5))
            for frame in frames
        ]
        spatial_avg = sum(spatial_scores) / len(spatial_scores)
        frequency_avg = sum(frequency_scores) / len(frequency_scores)
        temporal_score = float(self._temporal_detector.detect(frames).get("score", 0.5))
        return {
            "spatial_fake_score": spatial_avg,
            "frequency_fake_score": frequency_avg,
            "temporal_score": temporal_score,
        }
