# VerifyIQ Backend

Production-grade FastAPI backend skeleton for VerifyIQ (KYC deepfake detection) with a locked API contract, batch upload verification, and a stubbed detection pipeline.

## What This Backend Includes

- Versioned API under /v1 with a consistent response envelope
- Batch upload validation (base64, size, format, pixel cap)
- Stubbed detection pipeline wired end-to-end (no ML models)
- OpenAPI spec as source of truth with drift check scripts

## Folder Overview

- app/main.py: FastAPI app, middleware, global exception handling
- app/api/v1/verify.py: Upload verification endpoint and pipeline wiring
- app/api/v1/admin.py: Admin listing endpoints
- app/schemas: Pydantic schemas and enums
- app/storage/redis_store.py: Redis key schema, locks, session storage, audit logs (legacy)
- app/utils/validation.py: Base64 and image validation helpers
- app/services: Stubbed detection and fusion services
- openapi.yaml: Locked API contract
- scripts: OpenAPI generate/validate utilities

## Requirements

- Python 3.11+
- Redis

Install dependencies:

    python -m pip install -r requirements.txt

## Running the API

From repo root:

    python -m uvicorn app.main:app --reload --app-dir backend

From backend/:

    python -m uvicorn app.main:app --reload --app-dir .

## Environment and Config

Runtime environment:

- REDIS_URL: Redis connection string
- PORT: server port (set via uvicorn, e.g. --port 8000)
- ENV: deployment environment label (dev/prod; not used by the app code yet)

Config defaults live in app/core/config.py:

- session_ttl_minutes: 30
- idempotency_window_hours: 24
- max_frame_bytes: 2_000_000
- max_frame_pixels: 4_000_000
- max_image_upload_bytes: 2_000_000
- max_video_upload_bytes: 15_000_000
- allowed_video_formats: ("MP4", "WEBM")
- video_frame_sample_count: 12
- lock_ttl_seconds: 60

## Response Envelope

All responses use:

    {
      "success": boolean,
      "data": object | null,
      "error": object | null,
      "meta": {
        "request_id": string,
        "timestamp": datetime
      }
    }

## Examples

POST /v1/verify/upload

Request:

        {
            "user_id": "123",
            "input_type": "image",
            "file": "<base64>"
        }

    ## Frontend Upload UI

    The /upload page in the frontend mirrors the batch-only contract. It accepts a user id plus either a selfie image or a short video and submits to /v1/verify/upload.

Response:

        {
            "success": true,
            "data": {
                "verdict": "REVIEW",
                "confidence": 0.6,
                "signals": {
                    "spatial_fake_score": 0.5,
                    "frequency_fake_score": 0.5,
                    "temporal_score": null
                }
            },
            "error": null,
            "meta": {
                "request_id": "req_01",
                "timestamp": "2026-04-18T12:00:00Z"
            }
        }

## Error Response Example

        {
            "success": false,
            "data": null,
            "error": {
                "error_code": "SESSION_EXPIRED",
                "message": "Session has expired",
                "details": null
            },
            "meta": {
                "request_id": "req_04",
                "timestamp": "2026-04-18T12:01:00Z"
            }
        }

## Redis Key Schema (legacy)

Legacy Redis session storage remains for admin/session views:

- session:{session_id}
- lock:session:{session_id}
- audit:{session_id}

## OpenAPI Drift Check

Validate:

    python scripts/validate_openapi.py

Regenerate:

    python scripts/generate_openapi.py
