"""
heuristics.py
-------------
Behavioral heuristic analysis for deepfake video detection.

Three independent checks are run on the sampled video frames:

1. Eye Blink Detection (EAR)
   Uses MediaPipe FaceLandmarker (Tasks API, mediapipe >= 0.10) to get
   face landmarks and compute the Eye Aspect Ratio per frame.
   Deepfakes often have abnormal blink rates (too few / too many).

   Requires the MediaPipe face_landmarker.task model bundle.
   Download once with:
       python -c "
       import urllib.request, pathlib
       pathlib.Path('backend/models').mkdir(parents=True, exist_ok=True)
       urllib.request.urlretrieve(
           'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
           'backend/models/face_landmarker.task'
       )"

2. Lip Sync Consistency
   Tracks the mouth-open ratio across frames.
   Unnatural (frozen or jittery) lip motion flags potential manipulation.

3. Frame Difference Check  (always runs, no model needed)
   Computes pixel-level absolute difference between consecutive frames.
   Detects sudden spikes or frozen patches characteristic of GAN artifacts.

All three scores are merged into a single `heuristic_score` (0-1) where
higher means more suspicious.
"""
from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.utils.normalization import clamp01

# ---------------------------------------------------------------------------
# MediaPipe Tasks API (mediapipe >= 0.10)
# ---------------------------------------------------------------------------

_MEDIAPIPE_AVAILABLE = False
_FaceLandmarker = None
_FaceLandmarkerOptions = None
_BaseOptions = None
_VisionRunningMode = None
_mp_image = None

try:
    import mediapipe as _mp_mod
    from mediapipe.tasks.python import BaseOptions as _BaseOptions_cls        # type: ignore
    from mediapipe.tasks.python.vision import (                               # type: ignore
        FaceLandmarker as _FaceLandmarker_cls,
        FaceLandmarkerOptions as _FaceLandmarkerOptions_cls,
        RunningMode as _RunningMode_cls,
    )

    _FaceLandmarker = _FaceLandmarker_cls
    _FaceLandmarkerOptions = _FaceLandmarkerOptions_cls
    _BaseOptions = _BaseOptions_cls
    _mp_image = _mp_mod.Image
    _VisionRunningMode = _RunningMode_cls
    _MEDIAPIPE_AVAILABLE = True
except Exception:
    pass  # Graceful fallback — frame_diff still works

# Default model path — override with env var MEDIAPIPE_FACE_MODEL
_DEFAULT_FACE_MODEL = os.getenv(
    "MEDIAPIPE_FACE_MODEL",
    "backend/models/face_landmarker.task",
)

# ---------------------------------------------------------------------------
# Face landmark indices for the FaceLandmarker 478-point mesh
# ---------------------------------------------------------------------------

# Left eye (indices from the 478-landmark model)
_LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380]
# Right eye
_RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144]

# Mouth
_MOUTH_TOP = 13
_MOUTH_BOTTOM = 14
_MOUTH_LEFT = 61
_MOUTH_RIGHT = 291


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return float(np.linalg.norm(np.array(a) - np.array(b)))


def _ear_from_landmarks(lm: list, indices: List[int], w: int, h: int) -> float:
    """Eye Aspect Ratio from 6 landmark indices (standard formula)."""
    pts = [(lm[i].x * w, lm[i].y * h) for i in indices]
    vert1 = _dist(pts[1], pts[5])
    vert2 = _dist(pts[2], pts[4])
    horiz = _dist(pts[0], pts[3])
    if horiz < 1e-6:
        return 0.0
    return (vert1 + vert2) / (2.0 * horiz)


def _mouth_ratio_from_landmarks(lm: list, w: int, h: int) -> float:
    """Mouth open ratio = vertical / horizontal distance."""
    top = np.array([lm[_MOUTH_TOP].x * w, lm[_MOUTH_TOP].y * h])
    bot = np.array([lm[_MOUTH_BOTTOM].x * w, lm[_MOUTH_BOTTOM].y * h])
    left = np.array([lm[_MOUTH_LEFT].x * w, lm[_MOUTH_LEFT].y * h])
    right = np.array([lm[_MOUTH_RIGHT].x * w, lm[_MOUTH_RIGHT].y * h])
    vert = float(np.linalg.norm(top - bot))
    horiz = float(np.linalg.norm(left - right))
    if horiz < 1e-6:
        return 0.0
    return vert / horiz


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class HeuristicAnalyzer:
    """
    Analyzes a sequence of BGR frames for behavioral deepfake signals.

    Usage::

        analyzer = HeuristicAnalyzer()
        # frames: List[np.ndarray] — BGR frames (any size)
        result = analyzer.analyze(frames)
        # {
        #   "heuristic_score": 0.63,
        #   "blink_score": 0.70,
        #   "lip_score": 0.55,
        #   "frame_diff_score": 0.40,
        #   "mediapipe_available": True,
        # }
    """

    _EAR_CLOSED_THRESHOLD = 0.20       # EAR below this  → eye closed
    _FRAMES_PER_SEC_ASSUMED = 15       # assumed FPS for blinks/sec rate

    def __init__(self) -> None:
        self._logger = logging.getLogger("heuristic_analyzer")
        self._landmarker: Optional[object] = None
        self._landmark_ready = False

        if _MEDIAPIPE_AVAILABLE:
            self._init_landmarker()
        else:
            self._logger.warning(
                "MediaPipe not importable. Blink/lip heuristics disabled. "
                "Frame-diff check will still run."
            )

    # ------------------------------------------------------------------
    # MediaPipe initialisation (Tasks API)
    # ------------------------------------------------------------------

    def _init_landmarker(self) -> None:
        """
        Load the FaceLandmarker model bundle.

        The .task file must be downloaded separately — see module docstring.
        If the file is missing we fall back to frame-diff only.
        """
        model_path = _DEFAULT_FACE_MODEL
        if not os.path.exists(model_path):
            self._logger.warning(
                "FaceLandmarker model not found at '%s'. "
                "Download it with: python scripts/download_mediapipe_model.py  "
                "Blink/lip heuristics disabled.",
                model_path,
            )
            return

        try:
            options = _FaceLandmarkerOptions(
                base_options=_BaseOptions(model_asset_path=model_path),
                running_mode=_VisionRunningMode.IMAGE,
                num_faces=1,
                min_face_detection_confidence=0.5,
                min_face_presence_score=0.5,
                min_tracking_confidence=0.5,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
            )
            self._landmarker = _FaceLandmarker.create_from_options(options)
            self._landmark_ready = True
            self._logger.info("FaceLandmarker loaded from '%s'", model_path)
        except Exception as exc:
            self._logger.warning("FaceLandmarker init failed: %s", exc)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, frames: List[np.ndarray]) -> Dict[str, object]:
        """
        Args:
            frames: List of BGR numpy arrays (raw video frames, any size).

        Returns:
            dict with heuristic_score, sub-scores, and metadata.
        """
        if len(frames) == 0:
            return self._empty_result()

        # Frame-diff always runs (no model needed)
        frame_diff_score = self._frame_difference_check(frames)

        if self._landmark_ready and len(frames) >= 2:
            blink_score = self._blink_detection(frames)
            lip_score = self._lip_sync_check(frames)
        else:
            # No landmarks available → uncertain (0.5) for those sub-scores
            blink_score = 0.5
            lip_score = 0.5

        # Weighted fusion — frame_diff is the most reliable without landmarks
        if self._landmark_ready:
            heuristic_score = clamp01(
                0.35 * blink_score +
                0.30 * lip_score +
                0.35 * frame_diff_score
            )
        else:
            # Only frame_diff is available
            heuristic_score = frame_diff_score

        self._logger.debug(
            "Heuristic — blink=%.3f lip=%.3f frame_diff=%.3f → total=%.3f",
            blink_score, lip_score, frame_diff_score, heuristic_score,
        )

        return {
            "heuristic_score": float(heuristic_score),
            "blink_score": float(blink_score),
            "lip_score": float(lip_score),
            "frame_diff_score": float(frame_diff_score),
            "mediapipe_available": self._landmark_ready,
        }

    # ------------------------------------------------------------------
    # A. Eye Blink Detection
    # ------------------------------------------------------------------

    def _get_landmarks(self, frame_bgr: np.ndarray):
        """Run FaceLandmarker on a single BGR frame. Returns landmark list or None."""
        try:
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            mp_image = _mp_image(image_format=_mp_mod.ImageFormat.SRGB, data=rgb)
            result = self._landmarker.detect(mp_image)
            if result.face_landmarks:
                return result.face_landmarks[0]
        except Exception as exc:
            self._logger.debug("Landmark detection failed: %s", exc)
        return None

    def _blink_detection(self, frames: List[np.ndarray]) -> float:
        """
        Compute suspicion score from eye blink rate.

        Normal: ~12-20 blinks/minute.
        Deepfakes often blink far less (synthesis models rarely synthesise blinks).

        Returns float 0-1: 0 = normal, 1 = highly suspicious.
        """
        ear_values: List[Optional[float]] = []

        for frame in frames:
            h, w = frame.shape[:2]
            lm = self._get_landmarks(frame)
            if lm is None:
                ear_values.append(None)
                continue
            left_ear = _ear_from_landmarks(lm, _LEFT_EYE_IDX, w, h)
            right_ear = _ear_from_landmarks(lm, _RIGHT_EYE_IDX, w, h)
            ear_values.append((left_ear + right_ear) / 2.0)

        valid = [e for e in ear_values if e is not None]
        if len(valid) < 2:
            return 0.5  # not enough data

        # Count blink events (EAR dips below threshold)
        blink_count = 0
        below = False
        for ear in valid:
            if ear < self._EAR_CLOSED_THRESHOLD:
                if not below:
                    blink_count += 1
                    below = True
            else:
                below = False

        num_frames = len(frames)
        clip_secs = num_frames / self._FRAMES_PER_SEC_ASSUMED
        blinks_per_sec = blink_count / max(clip_secs, 1.0)

        # Too few blinks (< 0.07/s) is suspicious
        if blinks_per_sec < 0.07:
            score = clamp01(1.0 - blinks_per_sec / 0.07)
        # Too many blinks (> 0.55/s) is also suspicious
        elif blinks_per_sec > 0.55:
            score = clamp01((blinks_per_sec - 0.55) / 0.55)
        else:
            score = 0.0

        self._logger.debug(
            "Blink: count=%d secs=%.1f rate=%.3f → score=%.3f",
            blink_count, clip_secs, blinks_per_sec, score,
        )
        return float(score)

    # ------------------------------------------------------------------
    # B. Lip Sync Consistency
    # ------------------------------------------------------------------

    def _lip_sync_check(self, frames: List[np.ndarray]) -> float:
        """
        Measure variance in mouth-open ratio across frames.

        Deepfakes often produce frozen (too uniform) or jittery (large single
        frame jumps) lip motion compared to real speech.

        Returns float 0-1: 0 = smooth movement, 1 = suspicious pattern.
        """
        ratios: List[float] = []

        for frame in frames:
            h, w = frame.shape[:2]
            lm = self._get_landmarks(frame)
            if lm is None:
                continue
            ratio = _mouth_ratio_from_landmarks(lm, w, h)
            ratios.append(ratio)

        if len(ratios) < 2:
            return 0.5  # uncertain

        ratios_arr = np.array(ratios)
        std_ratio = float(np.std(ratios_arr))
        deltas = np.abs(np.diff(ratios_arr))
        max_delta = float(np.max(deltas))

        # Frozen lips: very low variance
        frozen_score = clamp01(1.0 - std_ratio / 0.06) if std_ratio < 0.06 else 0.0
        # Jittery lips: large single-frame jumps
        jitter_score = clamp01(max_delta / 0.15) if max_delta > 0.08 else 0.0

        score = clamp01(0.6 * frozen_score + 0.4 * jitter_score)
        self._logger.debug(
            "Lip sync: std=%.3f max_delta=%.3f → frozen=%.3f jitter=%.3f score=%.3f",
            std_ratio, max_delta, frozen_score, jitter_score, score,
        )
        return float(score)

    # ------------------------------------------------------------------
    # C. Frame Difference Check  (no model needed)
    # ------------------------------------------------------------------

    def _frame_difference_check(self, frames: List[np.ndarray]) -> float:
        """
        Detect temporal inconsistencies from pixel-level frame differences.

        Flags:
        - Sudden spikes (large diff after low diffs) → GAN glitch frame
        - Near-zero diffs across whole clip → frozen / looped video

        Returns float 0-1: 0 = consistent, 1 = suspicious.
        """
        if len(frames) < 2:
            return 0.0

        diffs: List[float] = []
        prev = cv2.cvtColor(cv2.resize(frames[0], (128, 128)), cv2.COLOR_BGR2GRAY)

        for frame in frames[1:]:
            curr = cv2.cvtColor(cv2.resize(frame, (128, 128)), cv2.COLOR_BGR2GRAY)
            diff = float(cv2.absdiff(prev, curr).mean()) / 255.0
            diffs.append(diff)
            prev = curr

        diffs_arr = np.array(diffs)
        mean_diff = float(np.mean(diffs_arr))
        std_diff = float(np.std(diffs_arr))
        max_diff = float(np.max(diffs_arr))

        # Spike: max >> mean
        spike_ratio = max_diff / (mean_diff + 1e-6)
        spike_score = clamp01((spike_ratio - 2.5) / 5.0) if spike_ratio > 2.5 else 0.0

        # Frozen frames: extremely low motion
        frozen_score = clamp01(1.0 - mean_diff / 0.01) if mean_diff < 0.01 else 0.0

        # High jitter relative to mean
        jitter_ratio = std_diff / (mean_diff + 1e-6)
        jitter_score = clamp01((jitter_ratio - 1.5) / 2.5) if jitter_ratio > 1.5 else 0.0

        score = clamp01(0.4 * spike_score + 0.35 * frozen_score + 0.25 * jitter_score)
        self._logger.debug(
            "Frame diff: mean=%.4f std=%.4f max=%.4f spike_r=%.2f → score=%.3f",
            mean_diff, std_diff, max_diff, spike_ratio, score,
        )
        return float(score)

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _empty_result(self) -> Dict[str, object]:
        return {
            "heuristic_score": 0.0,
            "blink_score": 0.0,
            "lip_score": 0.0,
            "frame_diff_score": 0.0,
            "mediapipe_available": self._landmark_ready,
        }
