from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ResponseEnvelope, Verdict


class InputType(str, Enum):
    image = "image"
    video = "video"


class SignalBreakdown(BaseModel):
    """Signal scores from the detection pipeline."""

    # --- Existing image + video fields ---
    spatial_fake_score: float = Field(ge=0.0, le=1.0)
    frequency_fake_score: float = Field(ge=0.0, le=1.0)
    temporal_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    behavioral_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    # --- New: advanced video fields (None for image inputs) ---
    cnn_score: Optional[float] = Field(default=None, ge=0.0, le=1.0,
        description="Frame-averaged CNN fake probability (alias for spatial_fake_score)")
    lstm_score: Optional[float] = Field(default=None, ge=0.0, le=1.0,
        description="LSTM temporal model score")
    heuristic_score: Optional[float] = Field(default=None, ge=0.0, le=1.0,
        description="Behavioral heuristic composite score")
    blink_score: Optional[float] = Field(default=None, ge=0.0, le=1.0,
        description="Eye blink anomaly score")
    lip_score: Optional[float] = Field(default=None, ge=0.0, le=1.0,
        description="Lip sync inconsistency score")
    frame_diff_score: Optional[float] = Field(default=None, ge=0.0, le=1.0,
        description="Frame-level pixel consistency score")


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

    # --- New: video fusion output ---
    risk_level: Optional[str] = Field(
        default=None,
        description="LOW / MEDIUM / HIGH (video only)",
    )
    final_score: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="Fused CNN + LSTM + heuristic score (video only)",
    )
    fusion_components: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Breakdown of individual component scores and weights used in fusion",
    )


class VerifyUploadEnvelope(ResponseEnvelope):
    data: Optional[VerifyUploadResponse] = None

