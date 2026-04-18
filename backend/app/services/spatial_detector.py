from __future__ import annotations

import logging
import os
from typing import Dict
from urllib.request import urlretrieve

import cv2
import numpy as np
import onnxruntime as ort

from app.core.config import settings


class SpatialDetector:
    def __init__(self) -> None:
        self._session: ort.InferenceSession | None = None
        self._input_name: str | None = None
        self._input_layout: str = "NCHW"
        self._logger = logging.getLogger("spatial_detector")

    def _ensure_model(self) -> str | None:
        model_path = settings.spatial_model_path
        if os.path.isfile(model_path):
            return model_path

        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        try:
            self._logger.info("Downloading spatial model", extra={"url": settings.spatial_model_url})
            urlretrieve(settings.spatial_model_url, model_path)
            return model_path
        except Exception as exc:
            self._logger.warning("Spatial model download failed: %s", exc)
            return None

    def _load_session(self) -> None:
        if self._session is not None:
            return

        model_path = self._ensure_model()
        if not model_path:
            return

        try:
            self._session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
            input_meta = self._session.get_inputs()[0]
            self._input_name = input_meta.name
            shape = input_meta.shape
            if len(shape) == 4 and shape[-1] == 3:
                self._input_layout = "NHWC"
        except Exception as exc:
            self._logger.warning("Spatial model load failed: %s", exc)
            self._session = None

    def _preprocess(self, frame: bytes) -> np.ndarray | None:
        data = np.frombuffer(frame, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            return None

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, (224, 224))
        tensor = image.astype(np.float32) / 255.0
        tensor = (tensor - 0.5) / 0.5
        if self._input_layout == "NCHW":
            tensor = np.transpose(tensor, (2, 0, 1))
        tensor = np.expand_dims(tensor, axis=0)
        return tensor

    def detect(self, frame: bytes) -> Dict[str, float]:
        """Return spatial fake score using ONNX model."""
        self._load_session()
        if self._session is None or self._input_name is None:
            return {"score": 0.5}

        inputs = self._preprocess(frame)
        if inputs is None:
            return {"score": 0.0}

        try:
            outputs = self._session.run(None, {self._input_name: inputs})
        except Exception as exc:
            self._logger.warning("Spatial inference failed: %s", exc)
            return {"score": 0.0}

        logits = outputs[0]
        logits = np.asarray(logits, dtype=np.float32)
        if logits.ndim == 2:
            logits = logits[0]

        exp = np.exp(logits - np.max(logits))
        probs = exp / np.sum(exp)
        score = float(probs[1]) if probs.size >= 2 else float(probs[-1])
        return {"score": score}
