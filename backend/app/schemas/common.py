from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel


class SessionType(str, Enum):
    photo = "photo"
    video = "video"


class ChallengeType(str, Enum):
    blink = "blink"
    head_turn = "head_turn"
    smile = "smile"
    number = "number"


class Verdict(str, Enum):
    ACCEPT = "ACCEPT"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


class SessionState(str, Enum):
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    CHALLENGE_PASSED = "CHALLENGE_PASSED"
    SUBMITTED = "SUBMITTED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"


class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    INVALID_FRAME = "INVALID_FRAME"
    INVALID_IMAGE = "INVALID_IMAGE"
    RATE_LIMITED = "RATE_LIMITED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"


class ResponseMeta(BaseModel):
    request_id: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    error_code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None


class ResponseEnvelope(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorResponse] = None
    meta: ResponseMeta
