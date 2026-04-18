import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import uuid4

import redis

from app.core.config import settings
from app.schemas.admin import EventType
from app.schemas.common import ChallengeType, SessionState, SessionType, Verdict
from app.schemas.verify import ChallengePrompt, HeatmapArtifact, SignalBreakdown


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
    challenges: List[ChallengePrompt]
    challenge_passed: bool
    verdict: Optional[Verdict] = None
    confidence: Optional[float] = None
    signals: Optional[SignalBreakdown] = None
    heatmap: Optional[HeatmapArtifact] = None


@dataclass
class AuditRecord:
    event_id: str
    session_id: str
    event_type: EventType
    event_time: datetime
    actor: str
    details: Optional[Dict[str, object]] = None
    hash: Optional[str] = None
    prev_hash: Optional[str] = None


@dataclass
class IdempotencyEntry:
    request_hash: str
    response_payload: Dict[str, object]
    created_at: datetime


class RedisStore:
    def __init__(self) -> None:
        self.client = redis.Redis.from_url(settings.redis_url, decode_responses=True)

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _session_key(self, session_id: str) -> str:
        return f"session:{session_id}"

    def _frames_key(self, session_id: str) -> str:
        return f"session:{session_id}:frames"

    def _idempotency_key(self, key: str) -> str:
        return f"idempotency:{key}"

    def _session_lock_key(self, session_id: str) -> str:
        return f"lock:session:{session_id}"

    def _idempotency_lock_key(self, key: str) -> str:
        return f"lock:idempotency:{key}"

    def _audit_key(self, session_id: str) -> str:
        return f"audit:{session_id}"

    def _expires_at(self, created_at: datetime) -> datetime:
        return created_at + timedelta(minutes=settings.session_ttl_minutes)

    def _challenge_expiry(self, now: datetime) -> datetime:
        return now + timedelta(minutes=2)

    def _serialize_session(self, record: SessionRecord) -> Dict[str, str]:
        return {
            "session_id": record.session_id,
            "user_id": record.user_id,
            "session_type": record.session_type.value,
            "state": record.state.value,
            "created_at": record.created_at.isoformat(),
            "expires_at": record.expires_at.isoformat(),
            "last_activity_at": record.last_activity_at.isoformat(),
            "frame_count": str(record.frame_count),
            "challenges": json.dumps([challenge.model_dump(mode="json") for challenge in record.challenges]),
            "challenge_passed": json.dumps(record.challenge_passed),
            "verdict": record.verdict.value if record.verdict else "",
            "confidence": json.dumps(record.confidence),
            "signals": json.dumps(record.signals.model_dump(mode="json") if record.signals else None),
            "heatmap": json.dumps(record.heatmap.model_dump(mode="json") if record.heatmap else None),
        }

    def _deserialize_session(self, payload: Dict[str, str]) -> SessionRecord:
        return SessionRecord(
            session_id=payload["session_id"],
            user_id=payload["user_id"],
            session_type=SessionType(payload["session_type"]),
            state=SessionState(payload["state"]),
            created_at=datetime.fromisoformat(payload["created_at"]),
            expires_at=datetime.fromisoformat(payload["expires_at"]),
            last_activity_at=datetime.fromisoformat(payload["last_activity_at"]),
            frame_count=int(payload.get("frame_count", "0")),
            challenges=[
                ChallengePrompt.model_validate(item)
                for item in json.loads(payload.get("challenges", "[]"))
            ],
            challenge_passed=json.loads(payload.get("challenge_passed", "false")),
            verdict=Verdict(payload["verdict"]) if payload.get("verdict") else None,
            confidence=json.loads(payload.get("confidence", "null")),
            signals=SignalBreakdown.model_validate(json.loads(payload["signals"]))
            if payload.get("signals")
            else None,
            heatmap=HeatmapArtifact.model_validate(json.loads(payload["heatmap"]))
            if payload.get("heatmap")
            else None,
        )

    def acquire_lock(self, lock_key: str) -> Optional[str]:
        token = str(uuid4())
        acquired = self.client.set(lock_key, token, nx=True, ex=settings.lock_ttl_seconds)
        return token if acquired else None

    def release_lock(self, lock_key: str, token: str) -> None:
        script = (
            "if redis.call('get', KEYS[1]) == ARGV[1] "
            "then return redis.call('del', KEYS[1]) else return 0 end"
        )
        self.client.eval(script, 1, lock_key, token)

    def create_session(self, user_id: str, session_type: SessionType) -> SessionRecord:
        now = self._now()
        session_id = str(uuid4())
        challenges = [
            ChallengePrompt(
                type=ChallengeType.blink,
                value="blink",
                expires_at=self._challenge_expiry(now),
            ),
            ChallengePrompt(
                type=ChallengeType.number,
                value=7,
                expires_at=self._challenge_expiry(now),
            ),
        ]
        record = SessionRecord(
            session_id=session_id,
            user_id=user_id,
            session_type=session_type,
            state=SessionState.CREATED,
            created_at=now,
            expires_at=self._expires_at(now),
            last_activity_at=now,
            frame_count=0,
            challenges=challenges,
            challenge_passed=False,
        )
        self.client.hset(self._session_key(session_id), mapping=self._serialize_session(record))
        ttl_seconds = settings.session_ttl_minutes * 60
        self.client.expire(self._session_key(session_id), ttl_seconds)
        self.client.expire(self._frames_key(session_id), ttl_seconds)
        self._add_audit(record.session_id, EventType.SESSION_CREATED, "system")
        return record

    def get_session(self, session_id: str) -> Optional[SessionRecord]:
        payload = self.client.hgetall(self._session_key(session_id))
        if not payload:
            return None
        record = self._deserialize_session(payload)
        if record.state != SessionState.EXPIRED and self._now() > record.expires_at:
            lock_key = self._session_lock_key(session_id)
            token = self.acquire_lock(lock_key)
            if token:
                try:
                    payload = self.client.hgetall(self._session_key(session_id))
                    if payload:
                        record = self._deserialize_session(payload)
                        if record.state != SessionState.EXPIRED and self._now() > record.expires_at:
                            record.state = SessionState.EXPIRED
                            self.client.hset(
                                self._session_key(session_id),
                                mapping=self._serialize_session(record),
                            )
                            self._add_audit(record.session_id, EventType.EXPIRED, "system")
                finally:
                    self.release_lock(lock_key, token)
        return record

    def append_frame(self, session_id: str, frame_index: int, frame_ref: str) -> SessionRecord:
        lock_key = self._session_lock_key(session_id)
        token = self.acquire_lock(lock_key)
        if not token:
            raise RuntimeError("Session is locked")
        try:
            payload = self.client.hgetall(self._session_key(session_id))
            if not payload:
                raise RuntimeError("Session not found")
            record = self._deserialize_session(payload)
            frame_entry = {
                "frame_index": frame_index,
                "ref": frame_ref,
                "received_at": self._now().isoformat(),
            }
            self.client.rpush(self._frames_key(session_id), json.dumps(frame_entry))
            self.client.ltrim(self._frames_key(session_id), 0, settings.max_frames - 1)
            record.frame_count = int(self.client.llen(self._frames_key(session_id)))
            record.last_activity_at = self._now()
            if record.state == SessionState.CREATED:
                record.state = SessionState.IN_PROGRESS
            self._add_audit(record.session_id, EventType.FRAME_RECEIVED, "system")
            if record.frame_count >= settings.min_frames and not record.challenge_passed:
                record.challenge_passed = True
                record.state = SessionState.CHALLENGE_PASSED
                self._add_audit(record.session_id, EventType.CHALLENGE_PASSED, "system")
            self.client.hset(self._session_key(session_id), mapping=self._serialize_session(record))
            ttl_seconds = settings.session_ttl_minutes * 60
            self.client.expire(self._session_key(session_id), ttl_seconds)
            self.client.expire(self._frames_key(session_id), ttl_seconds)
            return record
        finally:
            self.release_lock(lock_key, token)

    def submit_session(
        self,
        session_id: str,
        verdict: Verdict,
        confidence: float,
        signals: SignalBreakdown,
        heatmap: Optional[HeatmapArtifact],
    ) -> SessionRecord:
        lock_key = self._session_lock_key(session_id)
        token = self.acquire_lock(lock_key)
        if not token:
            raise RuntimeError("Session is locked")
        try:
            payload = self.client.hgetall(self._session_key(session_id))
            if not payload:
                raise RuntimeError("Session not found")
            record = self._deserialize_session(payload)
            record.state = SessionState.SUBMITTED
            record.last_activity_at = self._now()
            record.verdict = verdict
            record.confidence = confidence
            record.signals = signals
            record.heatmap = heatmap
            self._add_audit(record.session_id, EventType.SUBMITTED, "system")
            record.state = SessionState.COMPLETED
            self._add_audit(record.session_id, EventType.COMPLETED, "system")
            self.client.hset(self._session_key(session_id), mapping=self._serialize_session(record))
            self.client.expire(self._session_key(session_id), settings.session_ttl_minutes * 60)
            return record
        finally:
            self.release_lock(lock_key, token)

    def list_sessions(
        self,
        state: Optional[SessionState] = None,
        user_id: Optional[str] = None,
        session_type: Optional[SessionType] = None,
    ) -> List[SessionRecord]:
        records: List[SessionRecord] = []
        for key in self.client.scan_iter(match="session:*"):
            if key.endswith(":frames"):
                continue
            payload = self.client.hgetall(key)
            if not payload:
                continue
            record = self._deserialize_session(payload)
            records.append(record)
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
        logs: List[AuditRecord] = []
        session_ids = [session_id] if session_id else []
        if not session_ids:
            for key in self.client.scan_iter(match="audit:*"):
                session_ids.append(key.split(":", 1)[1])
        for sid in session_ids:
            entries = self.client.lrange(self._audit_key(sid), 0, -1)
            for entry in entries:
                payload = json.loads(entry)
                record = AuditRecord(
                    event_id=payload["event_id"],
                    session_id=payload["session_id"],
                    event_type=EventType(payload["event_type"]),
                    event_time=datetime.fromisoformat(payload["event_time"]),
                    actor=payload["actor"],
                    details=payload.get("details"),
                    hash=payload.get("hash"),
                    prev_hash=payload.get("prev_hash"),
                )
                logs.append(record)
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
        prev_entry = self.client.lindex(self._audit_key(session_id), -1)
        prev_hash = None
        if prev_entry:
            prev_hash = json.loads(prev_entry).get("hash")
        payload = {
            "event_id": str(uuid4()),
            "session_id": session_id,
            "event_type": event_type.value,
            "event_time": self._now().isoformat(),
            "actor": actor,
            "details": details,
            "prev_hash": prev_hash,
        }
        hash_input = json.dumps(payload, separators=(",", ":"))
        payload_hash = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()
        payload["hash"] = payload_hash
        self.client.rpush(self._audit_key(session_id), json.dumps(payload, separators=(",", ":")))
        self.client.expire(self._audit_key(session_id), settings.session_ttl_minutes * 60)

    def check_rate_limit(self, session_id: str, ip_address: Optional[str], max_per_second: int) -> bool:
        window = int(self._now().timestamp())
        session_key = f"rate:session:{session_id}"
        session_count = self.client.hincrby(session_key, str(window), 1)
        if session_count == 1:
            self.client.expire(session_key, 2)
        if session_count > max_per_second:
            return False
        if ip_address:
            ip_key = f"rate:ip:{ip_address}"
            ip_count = self.client.hincrby(ip_key, str(window), 1)
            if ip_count == 1:
                self.client.expire(ip_key, 2)
            if ip_count > max_per_second:
                return False
        return True

    def get_idempotency(self, key: str) -> Optional[IdempotencyEntry]:
        payload = self.client.hgetall(self._idempotency_key(key))
        if not payload:
            return None
        created_at = datetime.fromisoformat(payload["created_at"])
        window = timedelta(hours=settings.idempotency_window_hours)
        if self._now() - created_at > window:
            self.client.delete(self._idempotency_key(key))
            return None
        return IdempotencyEntry(
            request_hash=payload["request_hash"],
            response_payload=json.loads(payload["response_payload"]),
            created_at=created_at,
        )

    def set_idempotency(self, key: str, request_hash: str, response_payload: Dict[str, object]) -> None:
        payload = {
            "request_hash": request_hash,
            "response_payload": json.dumps(response_payload, separators=(",", ":")),
            "created_at": self._now().isoformat(),
        }
        self.client.hset(self._idempotency_key(key), mapping=payload)
        self.client.expire(self._idempotency_key(key), settings.idempotency_window_hours * 3600)

    def idempotency_lock_key(self, key: str) -> str:
        return self._idempotency_lock_key(key)


store = RedisStore()