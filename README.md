# VeriRiskAI

VeriRiskAI is a batch-only KYC verification system that accepts a selfie image or short video and returns a deepfake verdict with confidence and signal breakdown. The system avoids real-time streaming and challenge-response logic.

## System Architecture

```mermaid
graph TD
  U[User] --> FE[Frontend /upload]
  FE -->|POST /v1/verify/upload| API[FastAPI Backend]

  API --> IMG[Image Processor]
  API --> VID[Video Processor]

  IMG --> FACE[Face Extractor]
  IMG --> SPATIAL[Spatial Detector]
  IMG --> FREQ[Frequency Detector]
  IMG --> ART[Artifact Analyzer]
  IMG --> WM[Watermark Detector]

  VID --> FRAMES[Frame Sampler]
  FRAMES --> SPATIAL
  FRAMES --> FREQ
  FRAMES --> ART
  FRAMES --> WM
  VID --> TEMP[Temporal Detector]
  VID --> BEHAV[Behavioral Analyzer]

  SPATIAL --> FUSION[Fusion Engine]
  FREQ --> FUSION
  TEMP --> FUSION
  ART --> FUSION
  WM --> FUSION
  BEHAV --> FUSION

  FUSION --> RESP[Verdict + Confidence + Signals]
  RESP --> FE
```

## Backend Pipeline (Image vs Video)

```mermaid
flowchart LR
  subgraph Image Pipeline
    I1[Decode + Resize] --> I2[Face Extractor]
    I2 --> I3[ROI Selection]
    I3 --> I4[Spatial Detector]
    I3 --> I5[Frequency Detector]
    I3 --> I6[Artifact Analyzer]
    I3 --> I7[Watermark Detector]
  end

  subgraph Video Pipeline
    V1[Decode] --> V2[Frame Sampler]
    V2 --> V3[Spatial Detector]
    V2 --> V4[Frequency Detector]
    V2 --> V5[Artifact Analyzer]
    V2 --> V6[Watermark Detector]
    V2 --> V7[Temporal Detector]
    V2 --> V8[Behavioral Analyzer]
  end
```

## Frontend User Flow

```mermaid
flowchart LR
  A[Upload Page] --> B[Submit Base64]
  B --> C[Processing]
  C --> D[Results]
```

## API Contract

- Base path: `/v1`
- Endpoint: `POST /v1/verify/upload`
- Request: `{ user_id, input_type, file }` where `file` is base64
- Response: `verdict`, `confidence`, `signals`, `flags`

`signals` includes:
- `spatial_fake_score`
- `frequency_fake_score`
- `temporal_score` (video only)
- `behavioral_score` (video only)

`flags` includes:
- `artifact_flag`
- `frequency_anomaly`
- `temporal_inconsistency`
- `watermark_detected`

The canonical OpenAPI spec lives in [backend/openapi.yaml](backend/openapi.yaml).

## Current Detector Status

- Spatial: stub (returns constant score)
- Frequency: FFT-based
- Temporal: frame MSE + spike scoring (video only)
- Behavioral: motion consistency (video only)
- Artifact: heuristic edge/texture cues
- Watermark: heuristic score + flag
- Face detection: RetinaFace via InsightFace

## Local Development

### Backend

From repo root:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration

Environment variables (see `backend/.env.example`):
- `LOG_LEVEL`
- `FUSION_XGB_MODEL_PATH`
- `SPATIAL_MODEL_URL`
- `SPATIAL_MODEL_PATH`

## Constraints

- No live streaming.
- No challenge-response engine.
- Entire pipeline runs as batch processing on upload.
