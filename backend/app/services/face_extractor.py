from typing import Any, Dict, List, Tuple

import cv2
import numpy as np


class FaceExtractor:
    """Detect faces using OpenCV Haar cascades."""

    def __init__(self) -> None:
        self._detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

    def extract(self, image_bytes: bytes) -> Dict[str, Any]:
        data = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            return {"faces": [], "face_count": 0, "metadata": {"error": "decode_failed"}}

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self._detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4)
        face_list: List[Tuple[int, int, int, int]] = [
            (int(x), int(y), int(w), int(h)) for x, y, w, h in faces
        ]
        return {
            "faces": face_list,
            "face_count": len(face_list),
            "metadata": {"frame_shape": image.shape},
        }
