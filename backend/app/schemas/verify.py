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
    behavioral_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class SignalFlags(BaseModel):
    artifact_flag: bool = False
    frequency_anomaly: bool = False
    temporal_inconsistency: bool = False
    watermark_detected: bool = False


class VerifyUploadRequest(BaseModel):
    user_id: str
    input_type: InputType
    file: str


class VerifyUploadResponse(BaseModel):
    verdict: Verdict
    confidence: float = Field(ge=0.0, le=1.0)
    signals: SignalBreakdown
    flags: SignalFlags


class VerifyUploadEnvelope(ResponseEnvelope):
    data: Optional[VerifyUploadResponse] = None
