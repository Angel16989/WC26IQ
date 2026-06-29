#!/usr/bin/env python3
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = API_ROOT.parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.settings import get_settings  # noqa: E402
from app.data.repository import get_data_bundle  # noqa: E402
from app.services.data_freshness import build_data_freshness_report, format_freshness_markdown  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check whether WorldCupIQ source data is fresh enough to trust."
    )
    parser.add_argument(
        "--output-dir",
        default="var/data-freshness",
        help="Directory for latest.json and timestamped Markdown reports.",
    )
    parser.add_argument(
        "--fail-on-stale",
        action="store_true",
        help="Exit with code 2 when the report status is stale or unknown.",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Print JSON instead of the Markdown summary.",
    )
    args = parser.parse_args()

    settings = get_settings()
    report = build_data_freshness_report(get_data_bundle(), settings)
    output_dir = resolve_output_dir(args.output_dir)
    write_report_files(output_dir, report)

    if args.json_only:
        print(json.dumps(report.model_dump(), indent=2))
    else:
        print(format_freshness_markdown(report))
        print(f"\nSaved report files in `{output_dir.relative_to(PROJECT_ROOT)}`.")

    if args.fail_on_stale and report.status != "fresh":
        return 2
    return 0


def resolve_output_dir(raw_path: str) -> Path:
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_report_files(output_dir: Path, report) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    payload = json.dumps(report.model_dump(), indent=2) + "\n"
    markdown = format_freshness_markdown(report) + "\n"

    (output_dir / "latest.json").write_text(payload, encoding="utf-8")
    (output_dir / "latest.md").write_text(markdown, encoding="utf-8")
    (output_dir / f"{timestamp}.json").write_text(payload, encoding="utf-8")
    (output_dir / f"{timestamp}.md").write_text(markdown, encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
