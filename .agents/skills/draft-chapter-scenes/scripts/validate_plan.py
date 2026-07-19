#!/usr/bin/env python3
"""Validate a draft chapter plan against its complete paragraph ledger."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


ID_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
PRESENTATION_MODES = {"scrolling_hd2d", "static_cinematic"}
DISPOSITIONS = {"direct", "condensed", "omitted"}
BASES = {"source", "inference", "proposal"}


def load_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: root must be a JSON object")
    return value


def strings(value: Any, path: str, errors: list[str]) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        errors.append(f"{path}: expected an array of paragraph IDs")
        return []
    return value


def required_text(item: dict[str, Any], key: str, path: str, errors: list[str]) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{path}.{key}: required non-empty text")
        return ""
    return value


def validate(ledger: dict[str, Any], plan: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    paragraph_ids = [
        item.get("id")
        for item in ledger.get("paragraphs", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    ]
    paragraph_set = set(paragraph_ids)
    position = {identifier: index for index, identifier in enumerate(paragraph_ids)}

    chapter_id = required_text(plan, "chapter_id", "$", errors)
    if chapter_id and not ID_RE.fullmatch(chapter_id):
        errors.append("$.chapter_id: expected uppercase snake-case ID")
    if plan.get("source_sha256") != ledger.get("sha256"):
        errors.append("$.source_sha256: does not match the source ledger")
    if not isinstance(plan.get("plan_revision"), int) or plan["plan_revision"] < 1:
        errors.append("$.plan_revision: expected a positive integer")
    source_summary = plan.get("source_summary")
    if not isinstance(source_summary, dict):
        errors.append("$.source_summary: expected an object")
    else:
        for key in (
            "paragraph_count",
            "word_count",
            "opening_anchor",
            "closing_anchor",
        ):
            if source_summary.get(key) != ledger.get(key):
                errors.append(
                    f"$.source_summary.{key}: does not match the source ledger"
                )

    scenes = plan.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errors.append("$.scenes: expected at least one scene")
        scenes = []

    scene_ids: set[str] = set()
    beat_ids: set[str] = set()
    scene_paragraphs: dict[str, list[str]] = {}
    previous_end = -1
    for scene_index, scene_value in enumerate(scenes):
        path = f"$.scenes[{scene_index}]"
        if not isinstance(scene_value, dict):
            errors.append(f"{path}: expected an object")
            continue
        scene = scene_value
        scene_id = required_text(scene, "id", path, errors)
        if scene_id in scene_ids:
            errors.append(f"{path}.id: duplicate ID {scene_id}")
        scene_ids.add(scene_id)
        if scene_id and chapter_id and not scene_id.startswith(f"{chapter_id}_S"):
            errors.append(f"{path}.id: expected {chapter_id}_S* prefix")
        if not ID_RE.fullmatch(scene_id):
            errors.append(f"{path}.id: expected uppercase snake-case ID")
        if scene.get("order") != scene_index + 1:
            errors.append(f"{path}.order: expected {scene_index + 1}")
        for key in (
            "title",
            "player_goal",
            "dramatic_purpose",
            "entry_state",
            "exit_state",
            "boundary_rationale",
        ):
            required_text(scene, key, path, errors)
        if scene.get("presentation_mode") not in PRESENTATION_MODES:
            errors.append(f"{path}.presentation_mode: unsupported value")

        source_ids = strings(scene.get("source_paragraphs"), f"{path}.source_paragraphs", errors)
        scene_paragraphs[scene_id] = source_ids
        unknown = [identifier for identifier in source_ids if identifier not in paragraph_set]
        if unknown:
            errors.append(f"{path}.source_paragraphs: unknown IDs {unknown}")
        known_positions = [position[item] for item in source_ids if item in position]
        if known_positions:
            expected = list(range(known_positions[0], known_positions[-1] + 1))
            if known_positions != expected:
                errors.append(f"{path}.source_paragraphs: scene range must be contiguous and ordered")
            if known_positions[0] <= previous_end:
                errors.append(f"{path}.source_paragraphs: scenes overlap or are out of order")
            previous_end = known_positions[-1]

        beats = scene.get("beats")
        if not isinstance(beats, list) or not beats:
            errors.append(f"{path}.beats: expected at least one beat")
            beats = []
        for beat_index, beat_value in enumerate(beats):
            beat_path = f"{path}.beats[{beat_index}]"
            if not isinstance(beat_value, dict):
                errors.append(f"{beat_path}: expected an object")
                continue
            beat = beat_value
            beat_id = required_text(beat, "id", beat_path, errors)
            if beat_id in beat_ids:
                errors.append(f"{beat_path}.id: duplicate ID {beat_id}")
            beat_ids.add(beat_id)
            if beat_id and not ID_RE.fullmatch(beat_id):
                errors.append(f"{beat_path}.id: expected uppercase snake-case ID")
            for key in ("title", "player_experience", "beat_rationale"):
                required_text(beat, key, beat_path, errors)
            beat_source = strings(
                beat.get("source_paragraphs"),
                f"{beat_path}.source_paragraphs",
                errors,
            )
            outside = [identifier for identifier in beat_source if identifier not in source_ids]
            if outside:
                errors.append(f"{beat_path}.source_paragraphs: outside scene range {outside}")
            if not isinstance(beat.get("optional"), bool):
                errors.append(f"{beat_path}.optional: expected boolean")
            if beat.get("basis") not in BASES:
                errors.append(f"{beat_path}.basis: expected source, inference, or proposal")

    coverage = plan.get("coverage")
    if not isinstance(coverage, list) or not coverage:
        errors.append("$.coverage: expected coverage entries")
        coverage = []
    assignments: dict[str, str] = {}
    covered_by_scene: dict[str, list[str]] = {scene_id: [] for scene_id in scene_ids}
    for coverage_index, coverage_value in enumerate(coverage):
        path = f"$.coverage[{coverage_index}]"
        if not isinstance(coverage_value, dict):
            errors.append(f"{path}: expected an object")
            continue
        entry = coverage_value
        source_ids = strings(entry.get("source_paragraphs"), f"{path}.source_paragraphs", errors)
        disposition = entry.get("disposition")
        if disposition not in DISPOSITIONS:
            errors.append(f"{path}.disposition: expected direct, condensed, or omitted")
        required_text(entry, "anchor", path, errors)
        required_text(entry, "reason", path, errors)
        scene_id = entry.get("scene_id")
        if disposition != "omitted" and scene_id not in scene_ids:
            errors.append(f"{path}.scene_id: direct and condensed material requires a known scene")
        if scene_id is not None and scene_id not in scene_ids:
            errors.append(f"{path}.scene_id: unknown scene {scene_id}")
        for identifier in source_ids:
            if identifier not in paragraph_set:
                errors.append(f"{path}.source_paragraphs: unknown ID {identifier}")
                continue
            if identifier in assignments:
                errors.append(
                    f"{path}.source_paragraphs: {identifier} already covered by {assignments[identifier]}"
                )
            else:
                assignments[identifier] = path
                if isinstance(scene_id, str):
                    covered_by_scene.setdefault(scene_id, []).append(identifier)

    missing = [identifier for identifier in paragraph_ids if identifier not in assignments]
    if missing:
        errors.append(f"$.coverage: missing paragraph IDs {missing}")
    for scene_id, source_ids in scene_paragraphs.items():
        assigned = [identifier for identifier in paragraph_ids if identifier in covered_by_scene.get(scene_id, [])]
        if source_ids != assigned:
            errors.append(
                f"$.scenes[{scene_id}].source_paragraphs: does not match coverage assigned to the scene"
            )

    proposed_changes = plan.get("proposed_changes")
    if not isinstance(proposed_changes, list):
        errors.append("$.proposed_changes: expected an array")
    else:
        for change_index, change in enumerate(proposed_changes):
            path = f"$.proposed_changes[{change_index}]"
            if not isinstance(change, dict):
                errors.append(f"{path}: expected an object")
                continue
            strings(change.get("source_paragraphs"), f"{path}.source_paragraphs", errors)
            for key in ("canonical", "proposed", "rationale"):
                required_text(change, key, path, errors)
            if change.get("approval") != "needs_discussion":
                errors.append(f"{path}.approval: expected needs_discussion")

    unresolved_questions = plan.get("unresolved_questions")
    if not isinstance(unresolved_questions, list) or not all(
        isinstance(question, str) and question.strip()
        for question in unresolved_questions
    ):
        errors.append("$.unresolved_questions: expected an array")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ledger", type=Path)
    parser.add_argument("plan", type=Path)
    args = parser.parse_args()

    try:
        errors = validate(load_object(args.ledger), load_object(args.plan))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR {exc}")
        return 1
    if errors:
        for error in errors:
            print(f"ERROR {error}")
        return 1
    print("OK plan coverage, ordering, IDs, and references are valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
