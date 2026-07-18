from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml


class ManifestLoadError(ValueError):
    pass


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        value = yaml.safe_load(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ManifestLoadError(f"unable to read {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise ManifestLoadError(f"invalid YAML in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ManifestLoadError(f"manifest root must be a mapping: {path}")
    return value


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ManifestLoadError(f"unable to read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ManifestLoadError(f"invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ManifestLoadError(f"JSON root must be an object: {path}")
    return value
