"""
download_mediapipe_model.py
---------------------------
Downloads the MediaPipe FaceLandmarker model bundle required for
blink and lip-sync heuristic analysis in the VeriRisk video pipeline.

Run once before starting the server:
    python scripts/download_mediapipe_model.py
"""
import pathlib
import sys
import urllib.request

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)
MODEL_PATH = pathlib.Path("backend/models/face_landmarker.task")


def main() -> None:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    if MODEL_PATH.exists():
        print(f"Model already exists at: {MODEL_PATH}")
        return

    print(f"Downloading FaceLandmarker model from:\n  {MODEL_URL}")
    print(f"Saving to: {MODEL_PATH}")

    def _progress(block_num: int, block_size: int, total_size: int) -> None:
        downloaded = block_num * block_size
        if total_size > 0:
            pct = min(downloaded / total_size * 100, 100)
            bar = "#" * int(pct / 5)
            sys.stdout.write(f"\r  [{bar:<20}] {pct:5.1f}%")
            sys.stdout.flush()

    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH, reporthook=_progress)
    print(f"\nDone — model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
