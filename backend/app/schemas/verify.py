from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import ResponseEnvelope, Verdict


class InputType(str, Enum):
    image = "image"
    video = "video"


class SignalBreakdown(BaseModel):
    spatial_fake_score: float = Field(ge=0.0, le=1.0)
    frequency_fake_score: float = Field(ge=0.0, le=1.0)
    temporal_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class VerifyUploadRequest(BaseModel):
    user_id: str
    input_type: InputType
    file: str


class VerifyUploadResponse(BaseModel):
    verdict: Verdict
    confidence: float = Field(ge=0.0, le=1.0)
    signals: SignalBreakdown


class VerifyUploadEnvelope(ResponseEnvelope):
    data: Optional[VerifyUploadResponse] = None
