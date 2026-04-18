from typing import Dict, List, Optional

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

    def detect(self, frames: List[bytes]) -> Dict[str, Optional[float]]:
        decoded = [self._decode_grayscale(frame) for frame in frames]
        decoded = [frame for frame in decoded if frame is not None]
        if len(decoded) < 2:
            return {"score": None}

        mses: list[float] = []
        flow_means: list[float] = []
        flow_stds: list[float] = []
        mse_scores: list[float] = []
        flow_scores: list[float] = []
        for prev, curr in zip(decoded, decoded[1:]):
            if prev.shape != curr.shape:
                curr = cv2.resize(curr, (prev.shape[1], prev.shape[0]))
            diff = prev - curr
            mse = float(np.mean(diff ** 2))
            mses.append(mse)

            mse_scores.append(clamp01(mse / 0.08))

            prev_u8 = (prev * 255).astype(np.uint8)
            curr_u8 = (curr * 255).astype(np.uint8)
            flow = cv2.calcOpticalFlowFarneback(
                prev_u8,
                curr_u8,
                None,
                0.5,
                3,
                15,
                3,
                5,
                1.2,
                0,
            )
            magnitude = np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)
            flow_means.append(float(np.mean(magnitude)))
            flow_stds.append(float(np.std(magnitude)))

            mean_flow = float(np.mean(magnitude))
            std_flow = float(np.std(magnitude))
            flow_ratio = std_flow / (mean_flow + 1e-6)
            flow_scores.append(clamp01((flow_ratio - 0.75) / 1.75))

        mean_mse = float(np.mean(mses))
        max_mse = float(np.max(mses)) if mses else 0.0
        spike_ratio = max_mse / (mean_mse + 1e-6)
        spike_score = clamp01((spike_ratio - 1.0) / 2.0)

        max_mse_score = max(mse_scores) if mse_scores else 0.0
        mse_blend = clamp01(0.7 * max_mse_score + 0.3 * spike_score)

        mean_flow = float(np.mean(flow_means)) if flow_means else 0.0
        std_flow = float(np.mean(flow_stds)) if flow_stds else 0.0
        max_flow_score = max(flow_scores) if flow_scores else 0.0

        score = clamp01(0.5 * mse_blend + 0.5 * max_flow_score)
        return {
            "score": float(score),
            "mean_mse": mean_mse,
            "spike_score": float(spike_score),
            "mean_flow": float(mean_flow),
            "std_flow": float(std_flow),
        }
