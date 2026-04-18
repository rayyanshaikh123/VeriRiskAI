from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceExtractor:
    """Detect faces using RetinaFace via InsightFace."""

    def __init__(self) -> None:
        self._detector = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        self._detector.prepare(ctx_id=-1, det_size=(640, 640))

    def extract(self, image_bytes: bytes) -> Dict[str, Any]:
        data = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            return {"faces": [], "face_count": 0, "metadata": {"error": "decode_failed"}}

        faces = self._detector.get(image)
        face_list: List[Tuple[int, int, int, int]] = []
        scores: List[float] = []
        for face in faces:
            if getattr(face, "det_score", 0.0) < 0.5:
                continue
            bbox = face.bbox.astype(int).tolist()
            x1, y1, x2, y2 = bbox
            w = max(1, x2 - x1)
            h = max(1, y2 - y1)
            face_list.append((int(x1), int(y1), int(w), int(h)))
            scores.append(float(face.det_score))

        face_list = sorted(face_list, key=lambda box: box[2] * box[3], reverse=True)
        return {
            "faces": face_list,
            "face_count": len(face_list),
            "metadata": {"frame_shape": image.shape, "scores": scores},
        }
