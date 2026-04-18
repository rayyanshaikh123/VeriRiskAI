import json
from pathlib import Path
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app


def _canonical(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def main() -> int:
    schema = app.openapi()
    target = Path(__file__).resolve().parents[1] / "openapi.yaml"
    existing = yaml.safe_load(target.read_text(encoding="utf-8"))
    if _canonical(schema) != _canonical(existing):
        print("openapi.yaml is out of sync with FastAPI schema")
        return 1
    print("openapi.yaml matches FastAPI schema")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
