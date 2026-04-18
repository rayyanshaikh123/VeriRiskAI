from typing import Dict, List

import cv2
import numpy as np

from app.utils.normalization import clamp01


class BehavioralAnalyzer:
    """Lightweight behavioral analyzer using motion consistency."""

    def __init__(self) -> None:
        self._low_motion_threshold = 0.02
        self._high_motion_threshold = 0.12
        self._jitter_norm = 0.08

    def _decode_gray(self, frame: bytes) -> np.ndarray | None:
        data = np.frombuffer(frame, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
        return image

    def analyze(self, frames: List[bytes]) -> Dict[str, float]:
        if len(frames) < 2:
            return {"score": 0.0, "motion_mean": 0.0, "motion_std": 0.0}

        diffs: List[float] = []
        prev = self._decode_gray(frames[0])
        if prev is None:
            return {"score": 0.0, "motion_mean": 0.0, "motion_std": 0.0}

        for frame in frames[1:]:
            curr = self._decode_gray(frame)
            if curr is None:
                continue
            prev_resized = cv2.resize(prev, (curr.shape[1], curr.shape[0]))
            diff = cv2.absdiff(prev_resized, curr).mean() / 255.0
            diffs.append(float(diff))
            prev = curr

        if not diffs:
            return {"score": 0.0, "motion_mean": 0.0, "motion_std": 0.0}

        motion_mean = float(np.mean(diffs))
        motion_std = float(np.std(diffs))

        low_motion = clamp01(
            (self._low_motion_threshold - motion_mean) / self._low_motion_threshold
        )
        high_motion = clamp01(
            (motion_mean - self._high_motion_threshold)
            / max(1e-6, 0.25 - self._high_motion_threshold)
        )
        jitter = clamp01(motion_std / self._jitter_norm)

        score = clamp01(0.5 * max(low_motion, high_motion) + 0.5 * jitter)
        return {
            "score": float(score),
            "motion_mean": motion_mean,
            "motion_std": motion_std,
        }
