import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app


def main() -> None:
    output_path = Path("apidog/global-connect-ethiopia.openapi.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    schema = app.openapi()
    output_path.write_text(json.dumps(schema, indent=2), encoding="utf-8")

    print(f"OpenAPI exported: {output_path.resolve()}")
    print(f"Total paths: {len(schema.get('paths', {}))}")


if __name__ == "__main__":
    main()
