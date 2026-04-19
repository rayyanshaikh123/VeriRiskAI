from __future__ import annotations

from typing import Dict, Optional

import numpy as np

from app.core.config import settings
from app.utils.normalization import clamp01

# Risk level labels keyed by threshold
_RISK_HIGH = "HIGH"
_RISK_MEDIUM = "MEDIUM"
_RISK_LOW = "LOW"


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
        behavioral = signals.get("behavioral_score")
        behavioral_score = clamp01(behavioral) if behavioral is not None else None
        watermark_score = signals.get("watermark_score")
        if signals.get("watermark_detected"):
            watermark = clamp01(watermark_score) if watermark_score is not None else 1.0
        else:
            watermark = 0.0

        weighted: list[tuple[float, float]] = [
            (spatial, 0.4),
            (frequency, 0.15),
            (artifact, 0.1),
            (watermark, 0.05),
        ]
        if temporal_score is not None:
            weighted.append((temporal_score, 0.15))
        if behavioral_score is not None:
            weighted.append((behavioral_score, 0.15))

        total_weight = sum(weight for _, weight in weighted) or 1.0
        score = sum(value * weight for value, weight in weighted) / total_weight
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
        if risk_score <= 0.4:
            verdict = "ACCEPT"
        elif risk_score <= 0.7:
            verdict = "REVIEW"
        else:
            verdict = "REJECT"
        confidence = clamp01(1.0 - risk_score)
        return {
            "risk_score": float(risk_score),
            "verdict": verdict,
            "confidence": float(confidence),
        }

    # ------------------------------------------------------------------
    # Video-specific fusion (LSTM + CNN + Heuristics)
    # ------------------------------------------------------------------

    def video_fuse(
        self,
        cnn_score: float,
        lstm_score: float,
        heuristic_score: float,
        lstm_model_loaded: bool = False,
    ) -> Dict[str, object]:
        """
        Fuse CNN, LSTM, and heuristic scores into a final video verdict.

        Formula (weights configurable via config.py)::

            final_score = w_cnn * cnn_score
                        + w_lstm * lstm_score
                        + w_heuristic * heuristic_score

        Risk levels:
            > risk_high_threshold   (default 0.70) → HIGH   / REJECT
            > risk_medium_threshold (default 0.40) → MEDIUM / REVIEW
            <= risk_medium_threshold               → LOW    / ACCEPT

        Args:
            cnn_score:       Frame-averaged CNN fake-probability (0–1).
            lstm_score:      LSTM temporal model score (0–1).
            heuristic_score: Behavioral heuristic score (0–1).

        Returns:
            dict with keys:
                final_score (float)   — overall deepfake probability
                verdict     (str)     — ACCEPT / REVIEW / REJECT
                confidence  (float)   — 1 − final_score
                risk_level  (str)     — LOW / MEDIUM / HIGH
                components  (dict)    — individual input scores + weights used
        """
        cnn_score = clamp01(cnn_score)
        lstm_score = clamp01(lstm_score)
        heuristic_score = clamp01(heuristic_score)

        # Scale heuristic score to make anomalies more impactful
        heuristic_score = min(1.0, heuristic_score * 2.5)

        # Detect unreliable LSTM (constant ~0.5 output)
        if lstm_model_loaded:
            if abs(lstm_score - 0.5) < 0.03:
                lstm_reliable = False
            else:
                lstm_reliable = True
        else:
            lstm_reliable = False

        if lstm_reliable:
            w_cnn = 0.40
            w_lstm = 0.35
            w_heuristic = 0.25
        else:
            w_cnn = 0.70
            w_lstm = 0.00
            w_heuristic = 0.30

        final_score = clamp01(
            w_cnn * cnn_score
            + w_lstm * lstm_score
            + w_heuristic * heuristic_score
        )

        # Boost strong CNN signal directly 
        if cnn_score > 0.70:
            final_score = min(1.0, final_score + 0.10)

        # --- Verdict ---
        if final_score < 0.40:
            verdict = "REAL"
            risk_level = _RISK_LOW
        elif final_score > 0.60:
            verdict = "FAKE"
            risk_level = _RISK_HIGH
        else:
            verdict = "REVIEW"
            risk_level = _RISK_MEDIUM

        confidence = clamp01(1.0 - final_score)

        return {
            "final_score": float(final_score),
            "verdict": verdict,
            "confidence": float(confidence),
            "risk_level": risk_level,
            "components": {
                "cnn_score": float(cnn_score),
                "lstm_score": float(lstm_score),
                "heuristic_score": float(heuristic_score),
                "weights": {
                    "cnn": round(w_cnn, 4),
                    "lstm": round(w_lstm, 4),
                    "heuristic": round(w_heuristic, 4),
                },
            },
        }
