#!/usr/bin/env python3
"""Backward-compatible chapter-manifest validator wrapper.

Prefer `tools/novel_manifest.py validate`, which supports both chapter and focused scene manifests.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from novel_manifest.loaders import ManifestLoadError, load_yaml
from novel_manifest.validators import validate_chapter_semantics, validate_schema


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--schema", type=Path, required=True)
    parser.add_argument("--source", type=Path)
    args = parser.parse_args()

    try:
        document = load_yaml(args.manifest)
    except ManifestLoadError as exc:
        print(f"INVALID\n- {exc}")
        return 2

    diagnostics = validate_schema(document, args.schema)
    if not any(item.severity == "error" for item in diagnostics):
        diagnostics.extend(validate_chapter_semantics(document, args.source))

    errors = [item for item in diagnostics if item.severity == "error"]
    if errors:
        print("INVALID")
        for item in errors:
            print(f"- {item.code} {item.path}: {item.message}")
        return 1

    print(f"VALID: {args.manifest}")
    print(
        f"Scenes: {len(document.get('scenes', []))}; "
        f"characters: {len(document.get('characters', []))}; "
        f"locations: {len(document.get('locations', []))}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
