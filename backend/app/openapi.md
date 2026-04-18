# VerifyIQ API Contract

The canonical OpenAPI specification for VerifyIQ lives in [openapi.yaml](../openapi.yaml).

- Base path: /v1
- Auth: Bearer JWT
- Response envelope: {success, data, error, meta}
- Idempotency: Idempotency-Key header required for /v1/verify/submit
- OpenAPI sync: run scripts/generate_openapi.py to regenerate or scripts/validate_openapi.py in CI to detect drift
