# VerifyIQ API Contract

The canonical OpenAPI specification for VerifyIQ lives in [openapi.yaml](../openapi.yaml).

- Base path: /v1
- Auth: Bearer JWT
- Response envelope: {success, data, error, meta}
- Upload-only: POST /v1/verify/upload for image/video batch verification
- OpenAPI sync: run scripts/generate_openapi.py to regenerate or scripts/validate_openapi.py in CI to detect drift
