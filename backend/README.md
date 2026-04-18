# VerifyIQ Backend

Production-grade FastAPI backend skeleton for VerifyIQ (KYC deepfake detection) with a locked API contract, Redis-backed session management, atomic idempotency, and stubbed detection pipeline.

## What This Backend Includes

- Versioned API under /v1 with a consistent response envelope
- Redis-backed session store with TTL, locks, idempotency, and audit hash chain
- Frame ingestion validation (base64, size, format, pixel cap) and rate limiting
- Stubbed detection pipeline wired end-to-end (no ML models)
- OpenAPI spec as source of truth with drift check scripts

## Folder Overview

- app/main.py: FastAPI app, middleware, global exception handling
- app/api/v1/verify.py: Verify endpoints and pipeline wiring
- app/api/v1/admin.py: Admin listing endpoints
- app/schemas: Pydantic schemas and enums
- app/storage/redis_store.py: Redis key schema, locks, session storage, audit logs
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
- min_frames: 8
- max_frames: 60
- max_frames_per_second: 5
- max_frame_bytes: 2_000_000
- max_frame_pixels: 4_000_000
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

POST /v1/verify/start

Request:

        {
            "user_id": "123",
            "session_type": "video"
        }

Response:

        {
            "success": true,
            "data": {
                "session_id": "c2a7f2f2-7a8b-4c49-8b4b-8b2e7d1c1e1a",
                "challenges": [
                    {
                        "type": "blink",
                        "value": "blink",
                        "expires_at": "2026-04-18T12:00:00Z"
                    },
                    {
                        "type": "number",
                        "value": 7,
                        "expires_at": "2026-04-18T12:00:00Z"
                    }
                ]
            },
            "error": null,
            "meta": {
                "request_id": "req_01",
                "timestamp": "2026-04-18T12:00:00Z"
            }
        }

POST /v1/verify/frame

Request:

        {
            "session_id": "c2a7f2f2-7a8b-4c49-8b4b-8b2e7d1c1e1a",
            "frame_b64": "<base64>",
            "frame_index": 0
        }

Response:

        {
            "success": true,
            "data": {
                "liveness_score": 0.25,
                "face_detected": true,
                "challenge_passed": false
            },
            "error": null,
            "meta": {
                "request_id": "req_02",
                "timestamp": "2026-04-18T12:00:05Z"
            }
        }

POST /v1/verify/submit

Headers:

        Idempotency-Key: key-123

Request:

        {
            "session_id": "c2a7f2f2-7a8b-4c49-8b4b-8b2e7d1c1e1a",
            "id_image_b64": "<base64>"
        }

Response:

        {
            "success": true,
            "data": {
                "verdict": "REVIEW",
                "confidence": 0.6,
                "heatmap": {
                    "url": "https://cdn.verifyiq.example/heatmaps/c2a7f2f2-7a8b-4c49-8b4b-8b2e7d1c1e1a.png",
                    "expires_at": "2026-04-19T12:00:00Z",
                    "mime_type": "image/png"
                },
                "signals": {
                    "face_match_score": 0.5,
                    "liveness_score": 0.5,
                    "spatial_fake_score": 0.5,
                    "frequency_fake_score": 0.5,
                    "temporal_score": 0.5,
                    "clip_score": 0.5,
                    "behavioral_score": 0.5,
                    "challenge_score": 0.5
                },
                "session_id": "c2a7f2f2-7a8b-4c49-8b4b-8b2e7d1c1e1a"
            },
            "error": null,
            "meta": {
                "request_id": "req_03",
                "timestamp": "2026-04-18T12:00:10Z"
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

## Idempotency Examples

- Same Idempotency-Key + same payload returns the cached response
- Same Idempotency-Key + different payload returns IDEMPOTENCY_CONFLICT

Example conflict response:

        {
            "success": false,
            "data": null,
            "error": {
                "error_code": "IDEMPOTENCY_CONFLICT",
                "message": "Idempotency-Key reused with different payload",
                "details": null
            },
            "meta": {
                "request_id": "req_05",
                "timestamp": "2026-04-18T12:02:00Z"
            }
        }

## Idempotency

/v1/verify/submit requires Idempotency-Key. Behavior:

- Same key + same payload returns cached response
- Same key + different payload returns IDEMPOTENCY_CONFLICT

## Redis Key Schema

- session:{session_id}
- session:{session_id}:frames (Redis LIST, RPUSH, LTRIM to max_frames)
- idempotency:{key}
- lock:session:{session_id}
- lock:idempotency:{key}
- rate:session:{session_id}
- rate:ip:{ip}
- audit:{session_id}

## Frame Storage Lifecycle

Frame metadata is stored in Redis as a list at session:{session_id}:frames and trimmed to max_frames. Actual frame bytes should be stored in transient storage (disk/S3) and cleaned up:

- when a session expires (TTL on session + frames list)
- after /v1/verify/submit completes (cleanup worker or async job)

## OpenAPI Drift Check

Validate:

    python scripts/validate_openapi.py

Regenerate:

    python scripts/generate_openapi.py
