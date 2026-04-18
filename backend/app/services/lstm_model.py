"""
lstm_model.py
-------------
LSTM-based temporal model for deepfake detection.

The model consumes a sequence of CNN feature embeddings (one per video frame)
and outputs a single fake-probability score for the whole clip.

Until proper weights are trained and placed at settings.lstm_model_path the
detector falls back to returning 0.5 (neutral / uncertain).
"""
from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn

from app.core.config import settings
from app.utils.normalization import clamp01


# ---------------------------------------------------------------------------
# Neural network definition
# ---------------------------------------------------------------------------

class DeepfakeLSTM(nn.Module):
    """
    Bi-directional LSTM that classifies a sequence of CNN embeddings.

    Args:
        input_size:  Dimensionality of each frame embedding (e.g. 2048 for Xception).
        hidden_size: Number of LSTM hidden units per direction.
        num_layers:  Number of stacked LSTM layers.
        dropout:     Dropout probability between LSTM layers (ignored for num_layers=1).
    """

    def __init__(
        self,
        input_size: int = 2048,
        hidden_size: int = 256,
        num_layers: int = 2,
        dropout: float = 0.3,
    ) -> None:
        super().__init__()

        # Project raw embeddings to a lower dimension before feeding to LSTM
        self.input_proj = nn.Sequential(
            nn.Linear(input_size, 512),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

        self.lstm = nn.LSTM(
            input_size=512,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            bidirectional=True,
            batch_first=True,  # (batch, seq_len, features)
        )

        # Classifier on top of mean-pooled LSTM outputs
        lstm_out_size = hidden_size * 2  # *2 because bidirectional
        self.classifier = nn.Sequential(
            nn.Linear(lstm_out_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            # No sigmoid here — we apply it at inference time so training can
            # use BCEWithLogitsLoss directly.
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: shape (batch, seq_len, input_size)
        Returns:
            logits: shape (batch, 1)  — raw score, apply sigmoid for probability
        """
        projected = self.input_proj(x)              # (B, T, 512)
        lstm_out, _ = self.lstm(projected)          # (B, T, hidden*2)
        pooled = lstm_out.mean(dim=1)               # (B, hidden*2)  mean over time
        logits = self.classifier(pooled)            # (B, 1)
        return logits


# ---------------------------------------------------------------------------
# Detector wrapper (used by VideoProcessor)
# ---------------------------------------------------------------------------

class LSTMTemporalDetector:
    """
    Wraps DeepfakeLSTM for inference.

    Usage::

        detector = LSTMTemporalDetector()
        embeddings: List[np.ndarray]  # each shape (embedding_dim,)
        result = detector.detect(embeddings)
        # {"score": 0.72, "num_frames": 16}
    """

    def __init__(self) -> None:
        self._logger = logging.getLogger("lstm_temporal_detector")
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model: Optional[DeepfakeLSTM] = None
        self._input_size: int = 2048  # default; overridden when model is loaded
        self._load_model()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """
        Attempt to load trained weights from settings.lstm_model_path.
        If the file does not exist the model stays None and detect() returns
        the neutral fallback score (0.5).
        """
        model_path = getattr(settings, "lstm_model_path", None)

        if not model_path or not os.path.exists(model_path):
            self._logger.warning(
                "LSTM model weights not found at '%s'. "
                "Temporal detector will return neutral score (0.5) until "
                "trained weights are provided.",
                model_path,
            )
            return

        try:
            checkpoint = torch.load(model_path, map_location=self._device, weights_only=False)

            # Support both raw state_dict and a full checkpoint dict
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
                cfg = checkpoint.get("config", {})
                input_size = cfg.get("input_size", 2048)
                hidden_size = cfg.get("hidden_size", 256)
                num_layers = cfg.get("num_layers", 2)
            else:
                state_dict = checkpoint
                input_size, hidden_size, num_layers = 2048, 256, 2

            model = DeepfakeLSTM(
                input_size=input_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
            )
            model.load_state_dict(state_dict, strict=False)
            model.to(self._device)
            model.eval()

            self._model = model
            self._input_size = input_size
            self._logger.info("LSTM model loaded from '%s'", model_path)

        except Exception as exc:
            self._logger.warning("Failed to load LSTM model: %s", exc)
            self._model = None

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def detect(self, embeddings: List[np.ndarray]) -> Dict[str, object]:
        """
        Run LSTM inference on a sequence of CNN embeddings.

        Args:
            embeddings: List of 1-D numpy arrays, one per frame.
                        Each should have shape (embedding_dim,).

        Returns:
            dict with keys:
                score       (float 0–1): fake probability
                num_frames  (int): number of frames used
        """
        num_frames = len(embeddings)

        # ---- Fallback: no model or too few frames ----
        if self._model is None or num_frames < 2:
            self._logger.debug(
                "LSTM fallback: model=%s frames=%d", self._model, num_frames
            )
            return {"score": 0.5, "num_frames": num_frames}

        try:
            # Stack into (1, T, D) tensor
            seq = np.stack(embeddings, axis=0).astype(np.float32)  # (T, D)
            tensor = torch.from_numpy(seq).unsqueeze(0).to(self._device)  # (1, T, D)

            with torch.inference_mode():
                logits = self._model(tensor)               # (1, 1)
                prob = torch.sigmoid(logits).item()        # scalar

            score = clamp01(float(prob))
            self._logger.debug("LSTM score=%.4f frames=%d", score, num_frames)
            return {"score": score, "num_frames": num_frames}

        except Exception as exc:
            self._logger.warning("LSTM inference failed: %s", exc)
            return {"score": 0.5, "num_frames": num_frames}
