# Backend

Backend documentation lives in the root README: [README.md](../README.md).

Quick start:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .
```

OpenAPI:
- Spec: [openapi.yaml](openapi.yaml)
- Generate: `python scripts/generate_openapi.py`
- Validate: `python scripts/validate_openapi.py`
