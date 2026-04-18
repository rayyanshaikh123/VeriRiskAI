"""
e2e_no_lstm.py — End-to-end pipeline check (no LSTM weights required)
Run: python scripts/e2e_no_lstm.py
"""
import sys, os
sys.path.insert(0, os.path.abspath("."))

import numpy as np
import cv2

OK = "PASS"
FAIL = "FAIL"
errors = []

def check(tag, fn):
    try:
        info = fn()
        print(f"  {OK}  {tag}")
        for line in (info or []):
            print(f"        {line}")
    except Exception as exc:
        print(f"  {FAIL}  {tag}: {type(exc).__name__}: {exc}")
        errors.append(tag)

blank_frame = np.zeros((224, 224, 3), dtype=np.uint8)
_, blank_jpg = cv2.imencode(".jpg", blank_frame)
blank_bytes = blank_jpg.tobytes()

print("\n=== E2E Pipeline Check (no LSTM weights required) ===\n")

# --- 1. LSTM returns neutral 0.5 when no weights ---
def test_lstm_fallback():
    from app.services.lstm_model import LSTMTemporalDetector
    det = LSTMTemporalDetector()
    assert det._model is None, "No model should be loaded"
    embs = [np.zeros(2048, dtype=np.float32)] * 8
    r = det.detect(embs)
    assert r["score"] == 0.5, f"Expected 0.5 got {r['score']}"
    return [
        "Model loaded   = False (no weights file)",
        "Fallback score = 0.5  (neutral — does not affect final_score falsely)",
    ]

check("LSTM neutal fallback (0.5 when no weights)", test_lstm_fallback)

# --- 2. CNN still works independently ---
def test_cnn():
    from app.services.spatial_detector import SpatialDetector
    sd = SpatialDetector()
    score = sd.detect(blank_bytes)
    emb = sd.extract_embedding(blank_bytes)
    assert 0.0 <= score["score"] <= 1.0
    assert emb is not None and emb.shape[0] == 2048
    return [
        f"detect() score   = {round(score['score'], 4)}",
        f"extract_embedding dim = {emb.shape[0]}",
    ]

check("CNN (detect + embedding extraction)", test_cnn)

# --- 3. Frequency detector ---
def test_freq():
    from app.services.frequency_detector import FrequencyDetector
    fd = FrequencyDetector()
    r = fd.detect(blank_bytes)
    assert 0.0 <= r.get("score", 0) <= 1.0
    return [f"score = {round(r.get('score', 0), 4)}"]

check("Frequency detector", test_freq)

# --- 4. Heuristics (frame_diff always works) ---
def test_heuristics():
    from app.services.heuristics import HeuristicAnalyzer
    ha = HeuristicAnalyzer()
    rng = np.random.default_rng(42)
    frames = [rng.integers(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(8)]
    r = ha.analyze(frames)
    assert 0.0 <= float(r["heuristic_score"]) <= 1.0
    mp = "enabled (face landmarks active)" if r["mediapipe_available"] else "frame_diff only (FaceLandmarker model not downloaded)"
    return [
        f"mediapipe     = {mp}",
        f"heuristic     = {round(float(r['heuristic_score']), 4)}",
        f"frame_diff    = {round(float(r['frame_diff_score']), 4)}",
        f"blink/lip     = {r['blink_score']} / {r['lip_score']} (0.5 = uncertain without landmarks)",
    ]

check("HeuristicAnalyzer (frame_diff + optional landmarks)", test_heuristics)

# --- 5. Fusion with neutral LSTM ---
def test_fusion_without_lstm():
    from app.services.fusion_engine import FusionEngine
    fe = FusionEngine()

    # Suspicious video: strong CNN signal, neutral LSTM, some heuristic signal
    r_fake = fe.video_fuse(cnn_score=0.85, lstm_score=0.5, heuristic_score=0.60)
    # Clean video: weak CNN signal, neutral LSTM, low heuristic signal
    r_real = fe.video_fuse(cnn_score=0.10, lstm_score=0.5, heuristic_score=0.12)

    assert r_fake["risk_level"] in ("MEDIUM", "HIGH")
    assert r_real["risk_level"] in ("LOW", "MEDIUM")

    return [
        "Suspicious video (cnn=0.85, lstm=0.5[neutral], heuristic=0.60):",
        f"  final={round(r_fake['final_score'],3)}  risk={r_fake['risk_level']}  verdict={r_fake['verdict']}",
        "Clean video    (cnn=0.10, lstm=0.5[neutral], heuristic=0.12):",
        f"  final={round(r_real['final_score'],3)}  risk={r_real['risk_level']}  verdict={r_real['verdict']}",
        "",
        "NOTE: LSTM=0.5 neutral adds 0.30*0.5=0.15 constant bias to final_score.",
        "      This is intentional: conservative/safe baseline until training completes.",
    ]

check("Score fusion (neutral LSTM does not break verdicts)", test_fusion_without_lstm)

# --- 6. Schema serialisation ---
def test_schema():
    from app.schemas.verify import SignalBreakdown, SignalFlags, VerifyUploadResponse
    from app.schemas.common import Verdict
    sb = SignalBreakdown(
        spatial_fake_score=0.85, frequency_fake_score=0.6,
        temporal_score=0.5, behavioral_score=0.6,
        cnn_score=0.85, lstm_score=0.5,
        heuristic_score=0.6, blink_score=0.5, lip_score=0.5, frame_diff_score=0.6,
    )
    resp = VerifyUploadResponse(
        verdict=Verdict.REJECT, confidence=0.18,
        signals=sb, flags=SignalFlags(),
        risk_level="HIGH", final_score=0.82,
        fusion_components={"cnn": 0.85, "lstm": 0.5, "heuristic": 0.6},
    )
    d = resp.model_dump()
    assert d["risk_level"] == "HIGH"
    assert d["final_score"] == 0.82
    assert d["signals"]["lstm_score"] == 0.5
    assert d["signals"]["heuristic_score"] == 0.6
    return [
        "risk_level, final_score, fusion_components  present",
        "signals: lstm_score, heuristic_score, blink_score, lip_score, frame_diff_score  present",
    ]

check("API response schema (all new fields)", test_schema)

# --- Summary ---
total = 6
passed = total - len(errors)
print(f"\n{'='*54}")
print(f"  Results: {passed}/{total} checks passed")
if not errors:
    print()
    print("  WORKFLOW CONFIRMED:")
    print("  The pipeline runs end-to-end WITHOUT LSTM weights.")
    print()
    print("  Current scoring (no LSTM):")
    print("    final = 0.50*cnn + 0.30*0.5(neutral) + 0.20*heuristic")
    print("         = 0.50*cnn + 0.15(fixed) + 0.20*heuristic")
    print()
    print("  When LSTM training completes:")
    print("    Set LSTM_MODEL_PATH=backend/models/lstm.pth and restart.")
    print("    LSTM score will replace the 0.5 neutral bias.")
else:
    print(f"  FAILED: {errors}")
print(f"{'='*54}\n")
sys.exit(0 if not errors else 1)
