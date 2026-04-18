import os

from pydantic import BaseModel


class Settings(BaseModel):
    allowed_image_formats: tuple[str, ...] = ("JPEG", "PNG")
    max_frame_pixels: int = 4_000_000
    max_image_upload_bytes: int = 2_000_000
    max_video_upload_bytes: int = 15_000_000
    allowed_video_formats: tuple[str, ...] = ("MP4", "WEBM")
    video_frame_sample_count: int = 16
    frequency_anomaly_threshold: float = 0.6
    temporal_inconsistency_threshold: float = 0.6
    fusion_xgb_model_path: str | None = os.getenv("FUSION_XGB_MODEL_PATH")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    spatial_model_path: str = os.getenv(
        "SPATIAL_MODEL_PATH",
        "backend/models/deepfake_model_xception.pth",
    )
    cors_allowed_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )


settings = Settings()
