from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ResponseEnvelope, SessionState, SessionType, Verdict


class EventType(str, Enum):
    SESSION_CREATED = "SESSION_CREATED"
    FRAME_RECEIVED = "FRAME_RECEIVED"
    CHALLENGE_PASSED = "CHALLENGE_PASSED"
    SUBMITTED = "SUBMITTED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"


class Pagination(BaseModel):
    limit: int = Field(ge=1, le=200)
    offset: int = Field(ge=0)
    total: int = Field(ge=0)


class AdminSessionSummary(BaseModel):
    session_id: str
    user_id: str
    session_type: SessionType
    state: SessionState
    created_at: datetime
    expires_at: datetime
    last_activity_at: datetime
    frame_count: int = Field(ge=0)
    verdict: Optional[Verdict] = None


class AdminSessionsList(BaseModel):
    sessions: List[AdminSessionSummary]
    pagination: Pagination


class AuditLogEntry(BaseModel):
    event_id: str
    session_id: str
    event_type: EventType
    event_time: datetime
    actor: str
    details: Optional[Dict[str, object]] = None
    hash: Optional[str] = None
    prev_hash: Optional[str] = None


class AuditLogList(BaseModel):
    entries: List[AuditLogEntry]
    pagination: Pagination


class AdminSessionsEnvelope(ResponseEnvelope):
    data: Optional[AdminSessionsList] = None


class AuditLogEnvelope(ResponseEnvelope):
    data: Optional[AuditLogList] = None
