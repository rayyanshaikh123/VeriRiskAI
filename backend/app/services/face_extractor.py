from typing import Any, Dict, List


class FaceExtractor:
    def extract(self, image_bytes: bytes) -> Dict[str, Any]:
        """Return detected faces and metadata (stub)."""
        return {"faces": [], "face_count": 0, "metadata": {}}
