from pathlib import Path
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app


def main() -> None:
    schema = app.openapi()
    target = Path(__file__).resolve().parents[1] / "openapi.yaml"
    target.write_text(
        yaml.safe_dump(schema, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
