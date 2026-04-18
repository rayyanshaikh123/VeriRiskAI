from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

import cv2
import numpy as np
import timm
import torch
from torch import nn

from app.core.config import settings


_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class SpatialDetector:
    """
    CNN-based spatial deepfake detector using an Xception backbone.

    Two operating modes:
      - detect()           → full classification head → fake probability score
      - extract_embedding() → removes classification head → raw feature vector
                              (used as LSTM input for temporal modeling)
    """

    def __init__(self) -> None:
        self._logger = logging.getLogger("spatial_detector")
        self._model: Optional[nn.Module] = None
        self._device = torch.device("cpu")
        # Feature extractor: same backbone but with the FC head replaced by Identity
        self._feature_extractor: Optional[nn.Module] = None
        self._embedding_dim: int = 2048  # Xception pool5 output dim

    def _ensure_model(self) -> None:
        if self._model is not None:
            return

        model_path = settings.spatial_model_path
        if not os.path.exists(model_path):
            self._logger.warning("Spatial model missing", extra={"path": model_path})
            return

        try:
            # --- Full classification model (for detect()) ---
            model = timm.create_model("legacy_xception", pretrained=False)
            model.fc = nn.Linear(model.fc.in_features, 1)
            state = torch.load(model_path, map_location=self._device, weights_only=False)
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

            # --- Feature extractor (for extract_embedding()) ---
            # Same weights, but final FC replaced with Identity so we get the
            # raw pooled feature vector (2048-dim for Xception).
            feature_model = timm.create_model("legacy_xception", pretrained=False)
            feature_model.fc = nn.Identity()  # remove classification head
            feature_model.load_state_dict(cleaned, strict=False)
            feature_model.to(self._device)
            feature_model.eval()
            self._feature_extractor = feature_model
            self._logger.info("Spatial model loaded from '%s'", model_path)

        except Exception as exc:
            self._logger.warning("Failed to load spatial model: %s", exc)
            self._model = None
            self._feature_extractor = None

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

    def extract_embedding(self, frame: bytes) -> Optional[np.ndarray]:
        """
        Extract a raw CNN feature vector from a single frame.

        This is the LSTM pipeline entry point: instead of a final fake/real
        score, we return the 2048-dim pooled feature map so the LSTM can
        learn temporal patterns across the sequence.

        Args:
            frame: JPEG-encoded frame bytes.

        Returns:
            1-D float32 numpy array of shape (embedding_dim,), or None on failure.
        """
        self._ensure_model()
        if self._feature_extractor is None:
            # No model loaded — return a zero vector as a neutral placeholder
            return np.zeros(self._embedding_dim, dtype=np.float32)

        tensor = self._preprocess(frame)
        if tensor is None:
            return np.zeros(self._embedding_dim, dtype=np.float32)

        try:
            input_tensor = torch.from_numpy(tensor).to(self._device)
            with torch.inference_mode():
                embedding = self._feature_extractor(input_tensor)  # (1, D) or (1, D, 1, 1)

            # Flatten to 1-D
            emb_np = embedding.detach().cpu().numpy().reshape(-1).astype(np.float32)

            # L2-normalise the embedding for better LSTM conditioning
            norm = np.linalg.norm(emb_np)
            if norm > 1e-6:
                emb_np = emb_np / norm

            return emb_np

        except Exception as exc:
            self._logger.warning("Embedding extraction failed: %s", exc)
            return np.zeros(self._embedding_dim, dtype=np.float32)
