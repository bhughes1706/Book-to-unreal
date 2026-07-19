#!/usr/bin/env python3
"""Validate Scenework authoring YAML schemas and typed references."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as exc:
    raise SystemExit(
        "Validation requires PyYAML and jsonschema; use the project .venv."
    ) from exc


ACTION_TARGETS = {
    "show_hud": "hud",
    "spawn_npc": "npc",
    "move_npc": "npc",
    "give_item": "item",
    "update_item": "item",
    "update_interactable": "interactable",
    "play_dialogue": "dialogue",
}
TRIGGER_TARGETS = {
    "interaction": "interactable",
    "item_used": "item",
    "dialogue_complete": "dialogue",
    "beat_completed": "beat",
}


def load_yaml(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("document root must be a mapping")
    return value


def schema_errors(document: dict[str, Any], schema: dict[str, Any]) -> list[str]:
    validator = Draft202012Validator(schema)
    errors = []
    for error in sorted(validator.iter_errors(document), key=lambda item: list(item.absolute_path)):
        location = "$" + "".join(
            f"[{part}]" if isinstance(part, int) else f".{part}"
            for part in error.absolute_path
        )
        errors.append(f"{location}: {error.message}")
    return errors


def semantic_errors(document: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    staging = document.get("staging", {})
    if not isinstance(staging, dict):
        return errors

    groups = {
        "npc": {item.get("id") for item in staging.get("npcs", []) if isinstance(item, dict)},
        "interactable": {
            item.get("id")
            for item in staging.get("interactables", [])
            if isinstance(item, dict)
        },
        "item": {item.get("id") for item in staging.get("items", []) if isinstance(item, dict)},
        "hud": {
            item.get("id")
            for item in staging.get("hud_events", [])
            if isinstance(item, dict)
        },
        "dialogue": {
            item.get("id")
            for item in document.get("dialogue", [])
            if isinstance(item, dict)
        },
        "beat": {item.get("id") for item in staging.get("beats", []) if isinstance(item, dict)},
    }
    definitions: dict[str, str] = {}
    collections = {
        "npc": staging.get("npcs", []),
        "interactable": staging.get("interactables", []),
        "item": staging.get("items", []),
        "hud": staging.get("hud_events", []),
        "dialogue": document.get("dialogue", []),
        "beat": staging.get("beats", []),
    }
    for kind, collection in collections.items():
        for item in collection:
            if not isinstance(item, dict):
                continue
            identifier = item.get("id")
            if not isinstance(identifier, str):
                continue
            if identifier in definitions:
                errors.append(f"duplicate ID {identifier} in {kind} and {definitions[identifier]}")
            else:
                definitions[identifier] = kind

    beats = staging.get("beats", [])
    beat_order = {
        beat.get("id"): index
        for index, beat in enumerate(beats)
        if isinstance(beat, dict) and isinstance(beat.get("id"), str)
    }
    action_ids: set[str] = set()
    for beat_index, beat in enumerate(beats):
        if not isinstance(beat, dict):
            continue
        beat_id = beat.get("id")
        trigger = beat.get("trigger", {})
        if isinstance(trigger, dict):
            trigger_type = trigger.get("type")
            target = trigger.get("target")
            expected = TRIGGER_TARGETS.get(trigger_type)
            if expected and target not in groups[expected]:
                errors.append(
                    f"beat {beat_id} trigger target {target!r} is not a known {expected}"
                )
            if (
                trigger_type == "beat_completed"
                and target in beat_order
                and isinstance(beat_id, str)
                and beat_order[target] >= beat_index
            ):
                errors.append(f"beat {beat_id} has a forward beat dependency on {target}")
        for action in beat.get("actions", []):
            if not isinstance(action, dict):
                continue
            action_id = action.get("id")
            if isinstance(action_id, str):
                if action_id in action_ids:
                    errors.append(f"duplicate action ID {action_id}")
                action_ids.add(action_id)
            expected = ACTION_TARGETS.get(action.get("type"))
            target = action.get("target_id")
            if expected and target not in groups[expected]:
                errors.append(
                    f"action {action_id} target {target!r} is not a known {expected}"
                )

    for npc in staging.get("npcs", []):
        if not isinstance(npc, dict):
            continue
        for field in ("entrance_beat_id", "exit_beat_id"):
            target = npc.get(field)
            if target is not None and target not in groups["beat"]:
                errors.append(f"NPC {npc.get('id')} {field} references unknown beat {target}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schema", type=Path, required=True)
    parser.add_argument("files", nargs="+", type=Path)
    args = parser.parse_args()

    schema = json.loads(args.schema.read_text(encoding="utf-8"))
    failures = 0
    for path in args.files:
        try:
            document = load_yaml(path)
            errors = schema_errors(document, schema) + semantic_errors(document)
        except (OSError, ValueError, yaml.YAMLError, json.JSONDecodeError) as exc:
            errors = [str(exc)]
        if errors:
            failures += 1
            for error in errors:
                print(f"ERROR {path}: {error}")
        else:
            print(f"OK {path}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
