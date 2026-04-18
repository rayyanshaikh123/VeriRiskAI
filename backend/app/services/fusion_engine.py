from typing import Dict


class FusionEngine:
    def fuse(self, signals: Dict[str, float]) -> Dict[str, object]:
        """Return risk score and verdict from signals (stub)."""
        return {"risk_score": 0.2, "verdict": "REVIEW"}
