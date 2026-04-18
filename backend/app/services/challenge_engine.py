from datetime import datetime, timedelta, timezone
from typing import Dict, List


class ChallengeEngine:
    def generate(self) -> List[Dict[str, object]]:
        """Return challenge prompts (stub)."""
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=2)
        return [
            {"type": "blink", "value": "blink", "expires_at": expires_at.isoformat()},
            {"type": "number", "value": 7, "expires_at": expires_at.isoformat()},
        ]

    def evaluate(self, frames: List[bytes]) -> Dict[str, object]:
        """Return challenge evaluation result (stub)."""
        return {"passed": True, "score": 1.0}
