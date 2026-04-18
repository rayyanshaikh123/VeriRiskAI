from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, Field

from app.schemas.common import ChallengeType, ResponseEnvelope, SessionType, Verdict


class ChallengePrompt(BaseModel):
    type: ChallengeType
    value: Union[str, int]
    expires_at: datetime


class SignalBreakdown(BaseModel):
    face_match_score: float = Field(ge=0.0, le=1.0)
    liveness_score: float = Field(ge=0.0, le=1.0)
    spatial_fake_score: float = Field(ge=0.0, le=1.0)
    frequency_fake_score: float = Field(ge=0.0, le=1.0)
    temporal_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    clip_score: float = Field(ge=0.0, le=1.0)
    behavioral_score: float = Field(ge=0.0, le=1.0)
    challenge_score: float = Field(ge=0.0, le=1.0)


class HeatmapArtifact(BaseModel):
    url: str
    expires_at: datetime
    mime_type: str


class VerifyStartRequest(BaseModel):
    user_id: str
    session_type: SessionType


class VerifyStartResponse(BaseModel):
    session_id: str
    challenges: List[ChallengePrompt]


class VerifyFrameRequest(BaseModel):
    session_id: str
    frame_b64: str
    frame_index: int = Field(ge=0)


class VerifyFrameResponse(BaseModel):
    liveness_score: float = Field(ge=0.0, le=1.0)
    face_detected: bool
    challenge_passed: bool


class VerifySubmitRequest(BaseModel):
    session_id: str
    id_image_b64: str


class VerifySubmitResponse(BaseModel):
    verdict: Verdict
    confidence: float = Field(ge=0.0, le=1.0)
    heatmap: Optional[HeatmapArtifact]
    signals: SignalBreakdown
    session_id: str


class VerifyStartEnvelope(ResponseEnvelope):
    data: Optional[VerifyStartResponse] = None


class VerifyFrameEnvelope(ResponseEnvelope):
    data: Optional[VerifyFrameResponse] = None


class VerifySubmitEnvelope(ResponseEnvelope):
    data: Optional[VerifySubmitResponse] = None
