"""
test_lstm.py
------------
Run the LSTM Temporal Model standalone on a specific video file.
This bypasses the API and tests exactly what the CNN + LSTM sees.

Usage:
    python scripts/test_lstm.py <path_to_video.mp4>
"""

import sys
import os
import argparse
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.abspath("."))

import cv2
import numpy as np

from app.core.config import settings
from app.services.spatial_detector import SpatialDetector
from app.services.lstm_model import LSTMTemporalDetector

def extract_faces_from_video(video_path: str, num_frames=16):
    """Simple frame extraction and face detection replica from VideoProcessor."""
    try:
        from app.services.face_extractor import FaceExtractor
        face_ext = FaceExtractor()
    except Exception as e:
        print(f"Failed to load FaceExtractor: {e}")
        sys.exit(1)

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        print(f"Error: Could not open video file {video_path}")
        sys.exit(1)

    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total_frames <= 0:
        total_frames = num_frames

    indices = np.linspace(0, max(0, total_frames - 1), num_frames).astype(int)
    frames = []

    print(f"Extracting {num_frames} frames from video (Total frames: {total_frames})...")
    for idx in indices:
        capture.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ok, frame = capture.read()
        if ok and frame is not None:
            frames.append(frame)
    capture.release()

    if not frames:
        print("No frames could be extracted.")
        sys.exit(1)

    print(f"Extracted {len(frames)} frames. Detecting faces...")
    
    crops = []
    last_bbox = None
    for i, frame in enumerate(frames):
        encoded_small = _encode_jpeg(cv2.resize(frame, (640, 480)))
        result = face_ext.extract(encoded_small)
        faces = result.get("faces", [])
        
        if faces:
            x, y, w, h = faces[0]
        elif last_bbox:
            x, y, w, h = last_bbox
            print(f"  Frame {i:02d}: No face detected, using previous bounding box.")
        else:
            print(f"  Frame {i:02d}: No face detected, using full frame fallback (no previous bbox).")
            crops.append(frame)
            continue
            
        x = max(0, min(x, frame.shape[1] - 1))
        y = max(0, min(y, frame.shape[0] - 1))
        w = max(1, min(w, frame.shape[1] - x))
        h = max(1, min(h, frame.shape[0] - y))
        crop = frame[y : y + h, x : x + w]
        crops.append(crop)
        last_bbox = (x, y, w, h)
            
    return crops

def _encode_jpeg(frame: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes() if ok else b""


def main():
    parser = argparse.ArgumentParser("Test LSTM on a video")
    parser.add_argument("video_path", help="Path to the video file to analyze")
    args = parser.parse_args()

    video_path = args.video_path
    if not os.path.exists(video_path):
        print(f"File not found: {video_path}")
        sys.exit(1)

    print(f"LOADING MODELS...")
    print(f"LSTM Config Path: {settings.lstm_model_path}")
    spatial_det = SpatialDetector()
    lstm_det = LSTMTemporalDetector()

    if lstm_det._model is None:
        print("WARNING: LSTM model could not be loaded. See errors above.")
    else:
        print("LSTM model loaded successfully.")

    # 1. Get Faces
    print("\n--- STAGE 1: Face Extraction ---")
    faces = extract_faces_from_video(video_path, num_frames=settings.video_frame_sample_count)
    
    # 2. Extract CNN Embeddings
    print("\n--- STAGE 2: CNN Processing ---")
    embeddings = []
    cnn_scores = []
    
    for i, face_bgr in enumerate(faces):
        face_bytes = _encode_jpeg(cv2.resize(face_bgr, (224, 224)))
        
        # Get frame fake probability score
        score_res = spatial_det.detect(face_bytes)
        cnn_score = score_res.get("score", 0.0)
        cnn_scores.append(cnn_score)
        
        # Extract 2048-dim feature vector
        emb = spatial_det.extract_embedding(face_bytes)
        if emb is not None:
            embeddings.append(emb)
            
        print(f"  Frame {i:02d} -> CNN Fake Score: {cnn_score:.4f}")

    avg_cnn = np.mean(cnn_scores)
    max_cnn = np.max(cnn_scores)
    print(f"  --> CNN Mean Score: {avg_cnn:.4f} | Max Score: {max_cnn:.4f}")

    # 3. LSTM Temporal Inference
    print("\n--- STAGE 3: LSTM Sequence Analysis ---")
    if not embeddings:
        print("Error: No embeddings generated.")
        sys.exit(1)
        
    print(f"Passing {len(embeddings)} sequential feature vectors to LSTM (shape: {embeddings[0].shape})...")
    
    lstm_result = lstm_det.detect(embeddings)
    lstm_score = float(lstm_result.get("score", 0.5))
    
    print(f"  --> LSTM TEMPORAL SCORE: {lstm_score:.4f}")
    
    print("\n--- CONCLUSION ---")
    print(f"If LSTM Score is very low (e.g. < 0.1), the sequence looks completely REAL/natural to the LSTM.")
    print(f"If LSTM Score is high (e.g. > 0.7), the sequence exhibits temporal irregularities (FAKE).")

if __name__ == "__main__":
    main()
