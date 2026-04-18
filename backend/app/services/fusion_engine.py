from __future__ import annotations

from typing import Dict, Optional

import numpy as np

from app.core.config import settings
from app.utils.normalization import clamp01


class FusionEngine:
    def __init__(self) -> None:
        self._xgb_model = None
        if settings.fusion_xgb_model_path:
            try:
                import joblib

                self._xgb_model = joblib.load(settings.fusion_xgb_model_path)
            except Exception:
                self._xgb_model = None

    def _weighted_score(self, signals: Dict[str, Optional[float]]) -> float:
        spatial = clamp01(signals.get("spatial_fake_score", 0.0))
        frequency = clamp01(signals.get("frequency_fake_score", 0.0))
        temporal = signals.get("temporal_score")
        temporal_score = clamp01(temporal) if temporal is not None else None
        artifact = clamp01(signals.get("artifact_score", 0.0))
        watermark_score = signals.get("watermark_score")
        watermark = (
            clamp01(watermark_score)
            if watermark_score is not None
            else 1.0 if signals.get("watermark_detected") else 0.0
        )

        score = 0.5 * spatial + 0.15 * frequency + 0.1 * artifact + 0.1 * watermark
        if temporal_score is not None:
            score += 0.15 * temporal_score
        return clamp01(score)

    def _model_score(self, signals: Dict[str, Optional[float]]) -> float:
        if self._xgb_model is None:
            return self._weighted_score(signals)

        watermark_score = signals.get("watermark_score")
        watermark = (
            clamp01(watermark_score)
            if watermark_score is not None
            else 1.0 if signals.get("watermark_detected") else 0.0
        )
        feature_vector = np.array(
            [
                clamp01(signals.get("spatial_fake_score", 0.0)),
                clamp01(signals.get("frequency_fake_score", 0.0)),
                clamp01(signals.get("temporal_score") or 0.0),
                clamp01(signals.get("artifact_score", 0.0)),
                watermark,
            ],
            dtype=np.float32,
        ).reshape(1, -1)
        try:
            proba = self._xgb_model.predict_proba(feature_vector)[0][1]
            return clamp01(float(proba))
        except Exception:
            return self._weighted_score(signals)

    def fuse(self, signals: Dict[str, Optional[float]]) -> Dict[str, object]:
        """Return risk score, verdict, and confidence from signals."""
        risk_score = self._model_score(signals)
        if risk_score <= 0.3:
            verdict = "ACCEPT"
        elif risk_score <= 0.6:
            verdict = "REVIEW"
        else:
            verdict = "REJECT"
        confidence = clamp01(1.0 - risk_score)
        return {
            "risk_score": float(risk_score),
            "verdict": verdict,
            "confidence": float(confidence),
        }
