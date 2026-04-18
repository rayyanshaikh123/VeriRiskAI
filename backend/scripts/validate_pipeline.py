"""
validate_pipeline.py — quick smoke-test for the advanced video pipeline.
Run from the backend directory:  python scripts/validate_pipeline.py
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.abspath("."))
import numpy as np

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

results = []


def check(label, fn):
    try:
        info = fn()
        print(f"  {PASS}  {label}")
        if info:
            for line in info:
                print(f"        {line}")
        results.append((label, True))
    except Exception as exc:
        print(f"  {FAIL}  {label}")
        print(f"        {type(exc).__name__}: {exc}")
        results.append((label, False))


print("\n=== VeriRisk Advanced Video Pipeline — Validation ===\n")

# ------------------------------------------------------------------
# 1. Config
# ------------------------------------------------------------------
def _config():
    from app.core.config import settings
    return [
        f"lstm_model_path      = {settings.lstm_model_path}",
        f"video weights        = cnn:{settings.video_cnn_weight} "
        f"lstm:{settings.video_lstm_weight} heuristic:{settings.video_heuristic_weight}",
        f"risk thresholds      = medium>{settings.risk_medium_threshold} "
        f"high>{settings.risk_high_threshold}",
    ]

check("Config (new fields)", _config)

# ------------------------------------------------------------------
# 2. DeepfakeLSTM forward pass
# ------------------------------------------------------------------
def _lstm_forward():
    import torch
    from app.services.lstm_model import DeepfakeLSTM
    model = DeepfakeLSTM(input_size=2048, hidden_size=256, num_layers=2)
    dummy = torch.zeros(1, 8, 2048)
    raw = model(dummy)
    prob = torch.sigmoid(raw).item()
    assert raw.shape == (1, 1), "output shape mismatch"
    return [f"output_shape={tuple(raw.shape)}  prob={prob:.4f}"]

check("DeepfakeLSTM forward pass", _lstm_forward)

# ------------------------------------------------------------------
# 3. LSTMTemporalDetector (no weights — neutral fallback)
# ------------------------------------------------------------------
def _lstm_detector():
    from app.services.lstm_model import LSTMTemporalDetector
    det = LSTMTemporalDetector()
    embs = [np.zeros(2048, dtype=np.float32) for _ in range(8)]
    r = det.detect(embs)
    assert 0.0 <= r["score"] <= 1.0
    if det._model is None:
        return [f"score={r['score']} (0.5 expected — no weights loaded)"]
    else:
        return [f"score={round(r['score'], 4)} (model loaded successfully)"]

check("LSTMTemporalDetector test", _lstm_detector)

# ------------------------------------------------------------------
# 4. HeuristicAnalyzer — frame_diff (no mediapipe model needed)
# ------------------------------------------------------------------
def _heuristics_frame_diff():
    from app.services.heuristics import HeuristicAnalyzer
    h = HeuristicAnalyzer()
    rng = np.random.default_rng(42)
    # Use varied frames so frame_diff is non-trivial
    frames = [rng.integers(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(8)]
    r = h.analyze(frames)
    assert 0.0 <= float(r["heuristic_score"]) <= 1.0
    mp_status = "enabled" if r["mediapipe_available"] else "disabled (model not downloaded)"
    return [
        f"mediapipe_available  = {r['mediapipe_available']} ({mp_status})",
        f"frame_diff_score     = {round(float(r['frame_diff_score']), 4)}",
        f"blink_score          = {r['blink_score']}",
        f"lip_score            = {r['lip_score']}",
        f"heuristic_score      = {round(float(r['heuristic_score']), 4)}",
    ]

check("HeuristicAnalyzer (frame_diff + landmarks if available)", _heuristics_frame_diff)

# ------------------------------------------------------------------
# 5. FusionEngine.video_fuse
# ------------------------------------------------------------------
def _video_fuse():
    from app.services.fusion_engine import FusionEngine
    fe = FusionEngine()
    lines = []
    cases = [
        (0.9, 0.8, 0.7, "HIGH",   "REJECT"),
        (0.5, 0.5, 0.5, "MEDIUM", "REVIEW"),
        (0.1, 0.2, 0.1, "LOW",    "ACCEPT"),
    ]
    for cnn, lstm, heur, exp_risk, exp_verdict in cases:
        r = fe.video_fuse(cnn, lstm, heur)
        assert r["risk_level"] == exp_risk, f"risk mismatch: {r['risk_level']} != {exp_risk}"
        assert r["verdict"] == exp_verdict
        lines.append(
            f"cnn={cnn} lstm={lstm} heur={heur} "
            f"=> final={round(r['final_score'],3)} risk={r['risk_level']}"
        )
    return lines

check("FusionEngine.video_fuse (3 risk levels)", _video_fuse)

# ------------------------------------------------------------------
# 6. SpatialDetector.extract_embedding (no model = zero vector)
# ------------------------------------------------------------------
def _spatial_embedding():
    import cv2
    from app.services.spatial_detector import SpatialDetector
    sd = SpatialDetector()
    # Encode a black 224x224 frame
    frame = np.zeros((224, 224, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", frame)
    emb = sd.extract_embedding(buf.tobytes())
    assert emb is not None
    assert emb.ndim == 1
    return [
        f"embedding_dim = {emb.shape[0]}",
        f"all_zeros     = {np.allclose(emb, 0)} (expected True — no model weights)",
    ]

check("SpatialDetector.extract_embedding", _spatial_embedding)

# ------------------------------------------------------------------
# 7. Schemas — new fields round-trip
# ------------------------------------------------------------------
def _schemas():
    from app.schemas.verify import SignalBreakdown, VerifyUploadResponse, Verdict
    from app.schemas.common import Verdict as V
    sb = SignalBreakdown(
        spatial_fake_score=0.8,
        frequency_fake_score=0.6,
        temporal_score=0.7,
        behavioral_score=0.5,
        cnn_score=0.8,
        lstm_score=0.7,
        heuristic_score=0.5,
        blink_score=0.3,
        lip_score=0.4,
        frame_diff_score=0.2,
    )
    from app.schemas.verify import SignalFlags
    sf = SignalFlags()
    resp = VerifyUploadResponse(
        verdict=Verdict.REJECT,
        confidence=0.3,
        signals=sb,
        flags=sf,
        risk_level="HIGH",
        final_score=0.73,
        fusion_components={"cnn": 0.8, "lstm": 0.7},
    )
    dumped = resp.model_dump()
    assert dumped["risk_level"] == "HIGH"
    assert dumped["final_score"] == 0.73
    assert dumped["signals"]["lstm_score"] == 0.7
    return [
        "risk_level, final_score, fusion_components — present",
        "lstm_score, heuristic_score, blink_score — present in signals",
    ]

check("Schemas (full round-trip)", _schemas)

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
total = len(results)
passed = sum(1 for _, ok in results if ok)

print(f"\n{'='*54}")
print(f"  Results: {passed}/{total} checks passed")
if passed == total:
    print("  ALL CHECKS PASSED — pipeline is ready")
else:
    failed = [label for label, ok in results if not ok]
    print(f"  FAILED: {failed}")
print(f"{'='*54}\n")

sys.exit(0 if passed == total else 1)
