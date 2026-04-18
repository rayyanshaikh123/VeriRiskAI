from typing import Dict


class SpatialDetector:
    def detect(self, frame: bytes) -> Dict[str, float]:
        """Return spatial fake score (stub)."""
        return {"score": 0.5}
