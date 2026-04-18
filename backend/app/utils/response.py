from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import Request

from app.schemas.common import ErrorCode, ErrorResponse, ResponseEnvelope, ResponseMeta


def _get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if not request_id:
        request_id = str(uuid4())
    return request_id


def _build_meta(request: Request) -> ResponseMeta:
    return ResponseMeta(
        request_id=_get_request_id(request),
        timestamp=datetime.now(timezone.utc),
    )


def success_envelope(request: Request, data: Any) -> ResponseEnvelope:
    return ResponseEnvelope(success=True, data=data, error=None, meta=_build_meta(request))


def error_envelope(
    request: Request,
    error_code: ErrorCode,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> ResponseEnvelope:
    error = ErrorResponse(error_code=error_code, message=message, details=details)
    return ResponseEnvelope(success=False, data=None, error=error, meta=_build_meta(request))
