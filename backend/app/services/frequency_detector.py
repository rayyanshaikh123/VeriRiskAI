from typing import Dict

import cv2
import numpy as np

from app.utils.normalization import clamp01


class FrequencyDetector:
    """FFT-based frequency analysis for synthetic artifact detection."""

    def _decode_grayscale(self, frame: bytes) -> np.ndarray | None:
        data = np.frombuffer(frame, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return None
        return image.astype(np.float32) / 255.0

    def detect(self, frame: bytes) -> Dict[str, float]:
        gray = self._decode_grayscale(frame)
        if gray is None or gray.size == 0:
            return {"score": 0.0}

        fft = np.fft.fftshift(np.fft.fft2(gray))
        magnitude = np.abs(fft)
        power = magnitude ** 2

        h, w = gray.shape
        cy, cx = h // 2, w // 2
        y, x = np.ogrid[:h, :w]
        radius = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        radius_norm = radius / (radius.max() + 1e-6)
        high_mask = radius_norm >= 0.65

        total_energy = power.sum() + 1e-6
        high_energy = power[high_mask].sum()
        high_ratio = clamp01(high_energy / total_energy)

        residual = gray - cv2.GaussianBlur(gray, (0, 0), 1.0)
        noise_variance = float(np.var(residual))
        variance_norm = clamp01(noise_variance / 0.02)

        score = clamp01(0.6 * high_ratio + 0.4 * variance_norm)
        return {
            "score": float(score),
            "high_freq_ratio": float(high_ratio),
            "noise_variance": float(noise_variance),
        }
