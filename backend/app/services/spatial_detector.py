from __future__ import annotations

import logging
import os
from typing import Dict, Optional

import cv2
import numpy as np
import timm
import torch
from torch import nn

from app.core.config import settings


_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class SpatialDetector:
    def __init__(self) -> None:
        self._logger = logging.getLogger("spatial_detector")
        self._model: Optional[nn.Module] = None
        self._device = torch.device("cpu")

    def _ensure_model(self) -> None:
        if self._model is not None:
            return

        model_path = settings.spatial_model_path
        if not os.path.exists(model_path):
            self._logger.warning("Spatial model missing", extra={"path": model_path})
            return

        try:
            model = timm.create_model("legacy_xception", pretrained=False)
            model.fc = nn.Linear(model.fc.in_features, 1)
            state = torch.load(model_path, map_location=self._device)
            state_dict = state.get("state_dict", state) if isinstance(state, dict) else state
            cleaned: dict[str, torch.Tensor] = {}
            for key, value in state_dict.items():
                if key.startswith("module."):
                    cleaned[key[7:]] = value
                else:
                    cleaned[key] = value
            missing, unexpected = model.load_state_dict(cleaned, strict=False)
            if missing or unexpected:
                self._logger.warning(
                    "Spatial model state mismatch",
                    extra={"missing": missing, "unexpected": unexpected},
                )
            model.to(self._device)
            model.eval()
            self._model = model
        except Exception as exc:
            self._logger.warning("Failed to load spatial model: %s", exc)
            self._model = None

    def _preprocess(self, frame: bytes) -> Optional[np.ndarray]:
        data = np.frombuffer(frame, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            return None
        image = cv2.resize(image, (224, 224), interpolation=cv2.INTER_AREA)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = image.astype(np.float32) / 255.0
        image = (image - _MEAN) / _STD
        image = np.transpose(image, (2, 0, 1))
        return np.expand_dims(image, axis=0)

    def _postprocess(self, logits: torch.Tensor) -> Optional[float]:
        if logits is None:
            return None
        scores = logits.detach().cpu().reshape(-1)
        if scores.numel() < 1:
            return None
        real_prob = torch.sigmoid(scores[0]).item()
        return 1.0 - float(real_prob)

    def detect(self, frame: bytes) -> Dict[str, float]:
        """Return spatial fake score using the Xception PyTorch model."""
        self._ensure_model()
        if not self._model:
            return {"score": 0.5}

        tensor = self._preprocess(frame)
        if tensor is None:
            return {"score": 0.5}

        try:
            input_tensor = torch.from_numpy(tensor).to(self._device)
            with torch.inference_mode():
                logits = self._model(input_tensor)
        except Exception as exc:
            self._logger.warning("Spatial model inference failed: %s", exc)
            return {"score": 0.5}

        score = self._postprocess(logits)
        if score is None or np.isnan(score):
            return {"score": 0.5}

        return {"score": float(score)}
