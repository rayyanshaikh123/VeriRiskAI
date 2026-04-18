from typing import Dict, Optional


class FusionEngine:
    def fuse(self, signals: Dict[str, Optional[float]]) -> Dict[str, object]:
        """Return risk score, verdict, and confidence from signals (stub)."""
        scores = [
            float(signals.get("spatial_fake_score", 0.5)),
            float(signals.get("frequency_fake_score", 0.5)),
        ]
        temporal = signals.get("temporal_score")
        if temporal is not None:
            scores.append(float(temporal))
        risk_score = sum(scores) / len(scores)
        if risk_score <= 0.3:
            verdict = "ACCEPT"
        elif risk_score <= 0.6:
            verdict = "REVIEW"
        else:
            verdict = "REJECT"
        confidence = max(0.0, min(1.0, 1.0 - risk_score))
        return {"risk_score": risk_score, "verdict": verdict, "confidence": confidence}
