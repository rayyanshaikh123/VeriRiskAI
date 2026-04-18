from typing import Dict


class AuditLogger:
    def log_event(self, event_type: str, payload: Dict[str, object]) -> Dict[str, object]:
        """Return audit log metadata (stub)."""
        return {"event_id": "stub", "event_type": event_type}
