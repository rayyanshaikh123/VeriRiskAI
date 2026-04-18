from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.core.config import settings
from app.schemas.admin import EventType
from app.schemas.common import SessionState, SessionType, Verdict
from app.schemas.verify import SignalBreakdown


@dataclass
class SessionRecord:
    session_id: str
    user_id: str
    session_type: SessionType
    state: SessionState
    created_at: datetime
    expires_at: datetime
    last_activity_at: datetime
    frame_count: int
    verdict: Optional[Verdict] = None
    confidence: Optional[float] = None
    signals: Optional[SignalBreakdown] = None


@dataclass
class AuditRecord:
    event_id: str
    session_id: str
    event_type: EventType
    event_time: datetime
    actor: str
    details: Optional[Dict[str, object]] = None


@dataclass
class IdempotencyEntry:
    request_hash: str
    response_payload: Dict[str, object]
    created_at: datetime


class InMemoryStore:
    def __init__(self) -> None:
        self.sessions: Dict[str, SessionRecord] = {}
        self.audit_logs: List[AuditRecord] = []
        self.idempotency: Dict[str, IdempotencyEntry] = {}

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _expires_at(self, created_at: datetime) -> datetime:
        return created_at + timedelta(minutes=settings.session_ttl_minutes)

    def create_session(self, user_id: str, session_type: SessionType) -> SessionRecord:
        now = self._now()
        session_id = str(uuid4())
        record = SessionRecord(
            session_id=session_id,
            user_id=user_id,
            session_type=session_type,
            state=SessionState.CREATED,
            created_at=now,
            expires_at=self._expires_at(now),
            last_activity_at=now,
            frame_count=0,
        )
        self.sessions[session_id] = record
        self._add_audit(record.session_id, EventType.SESSION_CREATED, "system")
        return record

    def get_session(self, session_id: str) -> Optional[SessionRecord]:
        record = self.sessions.get(session_id)
        if not record:
            return None
        if record.state != SessionState.EXPIRED and self._now() > record.expires_at:
            record.state = SessionState.EXPIRED
            self._add_audit(record.session_id, EventType.EXPIRED, "system")
        return record

    def add_frame(self, record: SessionRecord) -> None:
        record.frame_count += 1
        record.last_activity_at = self._now()
        if record.state == SessionState.CREATED:
            record.state = SessionState.IN_PROGRESS
        self._add_audit(record.session_id, EventType.FRAME_RECEIVED, "system")

    def submit_session(
        self,
        record: SessionRecord,
        verdict: Verdict,
        confidence: float,
        signals: SignalBreakdown,
    ) -> None:
        record.state = SessionState.SUBMITTED
        record.last_activity_at = self._now()
        record.verdict = verdict
        record.confidence = confidence
        record.signals = signals
        self._add_audit(record.session_id, EventType.SUBMITTED, "system")
        record.state = SessionState.COMPLETED
        self._add_audit(record.session_id, EventType.COMPLETED, "system")

    def list_sessions(
        self,
        state: Optional[SessionState] = None,
        user_id: Optional[str] = None,
        session_type: Optional[SessionType] = None,
    ) -> List[SessionRecord]:
        records = list(self.sessions.values())
        if state:
            records = [record for record in records if record.state == state]
        if user_id:
            records = [record for record in records if record.user_id == user_id]
        if session_type:
            records = [record for record in records if record.session_type == session_type]
        records.sort(key=lambda r: r.created_at, reverse=True)
        return records

    def list_audit_logs(
        self,
        session_id: Optional[str] = None,
        event_type: Optional[EventType] = None,
    ) -> List[AuditRecord]:
        logs = self.audit_logs
        if session_id:
            logs = [log for log in logs if log.session_id == session_id]
        if event_type:
            logs = [log for log in logs if log.event_type == event_type]
        logs.sort(key=lambda log: log.event_time, reverse=True)
        return logs

    def _add_audit(
        self,
        session_id: str,
        event_type: EventType,
        actor: str,
        details: Optional[Dict[str, object]] = None,
    ) -> None:
        self.audit_logs.append(
            AuditRecord(
                event_id=str(uuid4()),
                session_id=session_id,
                event_type=event_type,
                event_time=self._now(),
                actor=actor,
                details=details,
            )
        )

    def get_idempotency(self, key: str) -> Optional[IdempotencyEntry]:
        entry = self.idempotency.get(key)
        if not entry:
            return None
        window = timedelta(hours=settings.idempotency_window_hours)
        if self._now() - entry.created_at > window:
            self.idempotency.pop(key, None)
            return None
        return entry

    def save_idempotency(self, key: str, request_hash: str, response_payload: Dict[str, object]) -> None:
        self.idempotency[key] = IdempotencyEntry(
            request_hash=request_hash,
            response_payload=response_payload,
            created_at=self._now(),
        )


store = InMemoryStore()
