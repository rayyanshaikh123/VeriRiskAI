from typing import Optional

from fastapi import APIRouter, Query, Request

from app.schemas.admin import (
    AdminSessionSummary,
    AdminSessionsEnvelope,
    AdminSessionsList,
    AuditLogEntry,
    AuditLogEnvelope,
    AuditLogList,
    EventType,
    Pagination,
)
from app.schemas.common import SessionState, SessionType
from app.storage.redis_store import store
from app.utils.response import success_envelope

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/sessions", response_model=AdminSessionsEnvelope)
async def list_sessions(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    state: Optional[SessionState] = None,
    user_id: Optional[str] = None,
    session_type: Optional[SessionType] = None,
):
    records = store.list_sessions(state=state, user_id=user_id, session_type=session_type)
    total = len(records)
    page = records[offset : offset + limit]
    sessions = [
        AdminSessionSummary(
            session_id=record.session_id,
            user_id=record.user_id,
            session_type=record.session_type,
            state=record.state,
            created_at=record.created_at,
            expires_at=record.expires_at,
            last_activity_at=record.last_activity_at,
            frame_count=record.frame_count,
            verdict=record.verdict,
        )
        for record in page
    ]
    data = AdminSessionsList(
        sessions=sessions,
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )
    return success_envelope(request, data)


@router.get("/audit-log", response_model=AuditLogEnvelope)
async def list_audit_logs(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session_id: Optional[str] = None,
    event_type: Optional[EventType] = None,
):
    logs = store.list_audit_logs(session_id=session_id, event_type=event_type)
    total = len(logs)
    page = logs[offset : offset + limit]
    entries = [
        AuditLogEntry(
            event_id=log.event_id,
            session_id=log.session_id,
            event_type=log.event_type,
            event_time=log.event_time,
            actor=log.actor,
            details=log.details,
            hash=log.hash,
            prev_hash=log.prev_hash,
        )
        for log in page
    ]
    data = AuditLogList(entries=entries, pagination=Pagination(limit=limit, offset=offset, total=total))
    return success_envelope(request, data)
