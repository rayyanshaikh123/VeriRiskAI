from typing import Dict

import cv2
import numpy as np


class WatermarkDetector:
    """Placeholder watermark detector until SynthID integration is available."""

    def detect(self, image: np.ndarray) -> Dict[str, bool]:
        if image is None or image.size == 0:
            return {"watermark_detected": False}

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        h, w = gray.shape
        patch = gray[int(h * 0.8) :, int(w * 0.8) :]
        if patch.size == 0:
            return {"watermark_detected": False}

        mean_val = float(np.mean(patch))
        var_val = float(np.var(patch))
        detected = mean_val > 0.85 and var_val < 0.02
        return {"watermark_detected": bool(detected)}
