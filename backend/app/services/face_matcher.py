from typing import Dict


class FaceMatcher:
    def match(self, live_face: bytes, id_face: bytes) -> Dict[str, float]:
        """Return face match score (stub)."""
        return {"score": 0.5}
