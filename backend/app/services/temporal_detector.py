from typing import Dict, List

import cv2
import numpy as np

from app.utils.normalization import clamp01


class TemporalDetector:
    """Temporal consistency detector using frame-to-frame MSE."""

    def _decode_grayscale(self, frame: bytes) -> np.ndarray | None:
        data = np.frombuffer(frame, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return None
        return image.astype(np.float32) / 255.0

    def detect(self, frames: List[bytes]) -> Dict[str, float]:
        decoded = [self._decode_grayscale(frame) for frame in frames]
        decoded = [frame for frame in decoded if frame is not None]
        if len(decoded) < 2:
            return {"score": 0.0}

        mses: list[float] = []
        for prev, curr in zip(decoded, decoded[1:]):
            if prev.shape != curr.shape:
                curr = cv2.resize(curr, (prev.shape[1], prev.shape[0]))
            diff = prev - curr
            mse = float(np.mean(diff ** 2))
            mses.append(mse)

        mean_mse = float(np.mean(mses))
        p90 = float(np.percentile(mses, 90))
        spike_ratio = p90 / (mean_mse + 1e-6)
        spike_score = clamp01((spike_ratio - 1.0) / 2.0)

        mse_score = clamp01(mean_mse / 0.08)
        score = clamp01(0.7 * mse_score + 0.3 * spike_score)
        return {
            "score": float(score),
            "mean_mse": mean_mse,
            "spike_score": float(spike_score),
        }
