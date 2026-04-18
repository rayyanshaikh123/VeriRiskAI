from typing import Dict, List


class ClipDetector:
    def detect(self, frames: List[bytes]) -> Dict[str, float]:
        """Return clip-level fake score (stub)."""
        return {"score": 0.5}
