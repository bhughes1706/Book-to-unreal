from __future__ import annotations

import json
import re
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from docx import Document
from jsonschema import Draft202012Validator

from .diagnostics import Diagnostic

ID_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")


def _json_path(parts: Iterable[Any]) -> str:
    result = "$"
    for part in parts:
        if isinstance(part, int):
            result += f"[{part}]"
        else:
            result += f".{part}"
    return result


def validate_schema(document: dict[str, Any], schema_path: Path) -> list[Diagnostic]:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    diagnostics: list[Diagnostic] = []
    for error in sorted(validator.iter_errors(document), key=lambda item: list(item.absolute_path)):
        diagnostics.append(
            Diagnostic(
                severity="error",
                code="SCHEMA",
                path=_json_path(error.absolute_path),
                message=error.message,
            )
        )
    return diagnostics


def _load_source(path: Path) -> str:
    if path.suffix.lower() == ".docx":
        return "\n".join(p.text for p in Document(path).paragraphs)
    return path.read_text(encoding="utf-8")


def _normalize_text(text: str) -> str:
    text = text.replace("\u00ad", "")
    text = text.replace("’", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text).casefold().strip()


def validate_chapter_semantics(document: dict[str, Any], source_path: Path | None = None) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    definitions: dict[str, str] = {}

    def define(identifier: str, path: str) -> None:
        previous = definitions.get(identifier)
        if previous is not None:
            diagnostics.append(Diagnostic("error", "DUPLICATE_ID", path, f"{identifier} already defined at {previous}"))
        else:
            definitions[identifier] = path

    chapter = document.get("chapter", {})
    if isinstance(chapter, dict) and isinstance(chapter.get("id"), str):
        define(chapter["id"], "$.chapter.id")

    for section in ("characters", "locations", "world_systems", "environment_kits", "scenes", "unresolved_questions"):
        for index, item in enumerate(document.get(section, [])):
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                define(item["id"], f"$.{section}[{index}].id")

    for scene_index, scene in enumerate(document.get("scenes", [])):
        adaptation = scene.get("adaptation", {}) if isinstance(scene, dict) else {}
        for beat_index, beat in enumerate(adaptation.get("beats", [])):
            if isinstance(beat, dict) and isinstance(beat.get("id"), str):
                define(beat["id"], f"$.scenes[{scene_index}].adaptation.beats[{beat_index}].id")

    references: list[tuple[str, str]] = []
    for index, character in enumerate(document.get("characters", [])):
        references.append((f"$.characters[{index}].first_scene_id", character.get("first_scene_id")))
    for index, location in enumerate(document.get("locations", [])):
        for ref_index, ref in enumerate(location.get("kit_ids", [])):
            references.append((f"$.locations[{index}].kit_ids[{ref_index}]", ref))
    for index, system in enumerate(document.get("world_systems", [])):
        references.append((f"$.world_systems[{index}].introduced_scene_id", system.get("introduced_scene_id")))
    for scene_index, scene in enumerate(document.get("scenes", [])):
        references.append((f"$.scenes[{scene_index}].location_id", scene.get("location_id")))
        for field in ("character_ids", "world_system_ids"):
            for ref_index, ref in enumerate(scene.get(field, [])):
                references.append((f"$.scenes[{scene_index}].{field}[{ref_index}]", ref))
        production = scene.get("production", {})
        for ref_index, ref in enumerate(production.get("environment_kit_ids", [])):
            references.append((f"$.scenes[{scene_index}].production.environment_kit_ids[{ref_index}]", ref))

    for path, ref in references:
        if isinstance(ref, str) and ref not in definitions:
            diagnostics.append(Diagnostic("error", "UNRESOLVED_REFERENCE", path, f"unknown ID {ref}"))

    orders = [scene.get("order") for scene in document.get("scenes", [])]
    expected = list(range(1, len(orders) + 1))
    if orders != expected:
        diagnostics.append(Diagnostic("error", "SCENE_ORDER", "$.scenes", f"expected {expected}, got {orders}"))

    if source_path is not None:
        source = _normalize_text(_load_source(source_path))
        for scene_index, scene in enumerate(document.get("scenes", [])):
            span = scene.get("source_span", {})
            for key in ("start_anchor", "end_anchor"):
                anchor = span.get(key)
                if isinstance(anchor, str) and _normalize_text(anchor) not in source:
                    diagnostics.append(
                        Diagnostic(
                            "error",
                            "SOURCE_ANCHOR_NOT_FOUND",
                            f"$.scenes[{scene_index}].source_span.{key}",
                            f"anchor not found in {source_path.name}: {anchor!r}",
                        )
                    )
    return diagnostics


def _resource_index(runtime: dict[str, Any]) -> tuple[dict[str, str], list[Diagnostic]]:
    definitions: dict[str, str] = {}
    diagnostics: list[Diagnostic] = []
    resources = runtime.get("resources", {})
    for group in ("markers", "actors", "paths", "interactables", "lens_content", "audio"):
        for index, item in enumerate(resources.get(group, [])):
            identifier = item.get("id")
            path = f"$.runtime.resources.{group}[{index}].id"
            if not isinstance(identifier, str):
                continue
            if identifier in definitions:
                diagnostics.append(
                    Diagnostic("error", "DUPLICATE_ID", path, f"{identifier} already defined at {definitions[identifier]}")
                )
            else:
                definitions[identifier] = path
    return definitions, diagnostics


def _check_reference(
    diagnostics: list[Diagnostic], definitions: dict[str, str], value: Any, path: str, expected_prefix: str | None = None
) -> None:
    if not isinstance(value, str):
        return
    if value not in definitions:
        diagnostics.append(Diagnostic("error", "UNRESOLVED_REFERENCE", path, f"unknown resource ID {value}"))
    elif expected_prefix is not None and not value.startswith(expected_prefix):
        diagnostics.append(Diagnostic("warning", "RESOURCE_NAMING", path, f"expected {expected_prefix}* naming, got {value}"))


def _validate_trigger(
    trigger: dict[str, Any], path: str, beat_ids: set[str], definitions: dict[str, str], diagnostics: list[Diagnostic]
) -> None:
    trigger_type = trigger.get("type")
    if trigger_type == "interaction":
        _check_reference(diagnostics, definitions, trigger.get("target_id"), f"{path}.target_id", "INTERACT_")
    elif trigger_type == "player_distance":
        _check_reference(diagnostics, definitions, trigger.get("marker_id"), f"{path}.marker_id", "MARKER_")
    elif trigger_type in {"beat_completed", "elapsed_since_beat"}:
        ref = trigger.get("beat_id")
        if isinstance(ref, str) and ref not in beat_ids:
            diagnostics.append(Diagnostic("error", "UNRESOLVED_BEAT", f"{path}.beat_id", f"unknown beat ID {ref}"))
    elif trigger_type in {"any_of", "all_of"}:
        for index, condition in enumerate(trigger.get("conditions", [])):
            _validate_trigger(condition, f"{path}.conditions[{index}]", beat_ids, definitions, diagnostics)


def _validate_action(
    action: dict[str, Any], path: str, definitions: dict[str, str], diagnostics: list[Diagnostic]
) -> None:
    action_type = action.get("type")
    if action_type == "show_lens_content":
        _check_reference(diagnostics, definitions, action.get("content_id"), f"{path}.content_id", "LENS_")
    elif action_type == "spawn_actor":
        _check_reference(diagnostics, definitions, action.get("actor_id"), f"{path}.actor_id", "ACTOR_")
    elif action_type == "follow_path":
        _check_reference(diagnostics, definitions, action.get("actor_id"), f"{path}.actor_id", "ACTOR_")
        _check_reference(diagnostics, definitions, action.get("path_id"), f"{path}.path_id", "PATH_")
    elif action_type == "play_audio":
        _check_reference(diagnostics, definitions, action.get("audio_id"), f"{path}.audio_id", "AUDIO_")
    elif action_type == "unlock_transition":
        _check_reference(diagnostics, definitions, action.get("marker_id"), f"{path}.marker_id", "MARKER_")


def validate_scene_semantics(document: dict[str, Any]) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    runtime = document.get("runtime", {})
    definitions, resource_diagnostics = _resource_index(runtime)
    diagnostics.extend(resource_diagnostics)

    scene_id = document.get("scene_id")
    chapter_id = document.get("chapter_id")
    if isinstance(scene_id, str) and isinstance(chapter_id, str) and not scene_id.startswith(f"{chapter_id}_"):
        diagnostics.append(
            Diagnostic("warning", "SCENE_ID_PREFIX", "$.scene_id", f"scene ID should normally start with {chapter_id}_")
        )

    player = runtime.get("player", {})
    _check_reference(diagnostics, definitions, player.get("spawn_marker_id"), "$.runtime.player.spawn_marker_id", "MARKER_")

    resources = runtime.get("resources", {})
    for index, actor in enumerate(resources.get("actors", [])):
        _check_reference(
            diagnostics, definitions, actor.get("spawn_marker_id"),
            f"$.runtime.resources.actors[{index}].spawn_marker_id", "MARKER_"
        )
    for index, interactable in enumerate(resources.get("interactables", [])):
        _check_reference(
            diagnostics, definitions, interactable.get("marker_id"),
            f"$.runtime.resources.interactables[{index}].marker_id", "MARKER_"
        )

    beats = runtime.get("beats", [])
    beat_ids: set[str] = set()
    for index, beat in enumerate(beats):
        identifier = beat.get("id")
        path = f"$.runtime.beats[{index}].id"
        if isinstance(identifier, str):
            if identifier in beat_ids:
                diagnostics.append(Diagnostic("error", "DUPLICATE_BEAT_ID", path, f"duplicate beat ID {identifier}"))
            beat_ids.add(identifier)

    emitted_events: set[str] = set()
    event_trigger_refs: list[tuple[str, str]] = []
    beat_position = {beat.get("id"): index for index, beat in enumerate(beats) if isinstance(beat.get("id"), str)}

    def inspect_trigger_dependencies(trigger: dict[str, Any], path: str, current_index: int) -> None:
        trigger_type = trigger.get("type")
        if trigger_type in {"beat_completed", "elapsed_since_beat"}:
            ref = trigger.get("beat_id")
            if isinstance(ref, str) and ref in beat_position and beat_position[ref] >= current_index:
                diagnostics.append(
                    Diagnostic(
                        "error", "FORWARD_BEAT_DEPENDENCY", f"{path}.beat_id",
                        f"beat {ref} must be declared before the beat that depends on it"
                    )
                )
        elif trigger_type == "event":
            ref = trigger.get("event_id")
            if isinstance(ref, str):
                event_trigger_refs.append((f"{path}.event_id", ref))
        elif trigger_type in {"any_of", "all_of"}:
            for child_index, child in enumerate(trigger.get("conditions", [])):
                inspect_trigger_dependencies(child, f"{path}.conditions[{child_index}]", current_index)

    for index, beat in enumerate(beats):
        trigger_path = f"$.runtime.beats[{index}].trigger"
        trigger = beat.get("trigger", {})
        _validate_trigger(trigger, trigger_path, beat_ids, definitions, diagnostics)
        inspect_trigger_dependencies(trigger, trigger_path, index)
        for action_index, action in enumerate(beat.get("actions", [])):
            action_path = f"$.runtime.beats[{index}].actions[{action_index}]"
            _validate_action(action, action_path, definitions, diagnostics)
            if action.get("type") == "follow_path" and isinstance(action.get("completion_event_id"), str):
                emitted_events.add(action["completion_event_id"])

    for path, event_id in event_trigger_refs:
        if event_id not in emitted_events:
            diagnostics.append(Diagnostic("error", "UNRESOLVED_EVENT", path, f"no action emits event {event_id}"))

    # A compiler-safe scene needs at least one begin-play entry beat.
    if not any(beat.get("trigger", {}).get("type") == "begin_play" for beat in beats):
        diagnostics.append(Diagnostic("error", "MISSING_BEGIN_PLAY", "$.runtime.beats", "at least one begin_play beat is required"))

    # Make source-manifest references actionable without making sibling-file presence mandatory.
    source_manifest = document.get("source_manifest")
    if not isinstance(source_manifest, str) or not source_manifest.strip():
        diagnostics.append(Diagnostic("warning", "SOURCE_MANIFEST", "$.source_manifest", "source manifest is not specified"))

    return diagnostics


def validate_scene_against_chapter(document: dict[str, Any], scene_path: Path) -> list[Diagnostic]:
    """Resolve the focused scene's source manifest and verify cross-manifest IDs."""
    from .loaders import ManifestLoadError, load_yaml

    diagnostics: list[Diagnostic] = []
    source_name = document.get("source_manifest")
    if not isinstance(source_name, str) or not source_name.strip():
        return diagnostics

    source_path = (scene_path.parent / source_name).resolve()
    if not source_path.exists():
        return [
            Diagnostic(
                "error",
                "SOURCE_MANIFEST_NOT_FOUND",
                "$.source_manifest",
                f"cannot resolve {source_name!r} relative to {scene_path.parent}",
            )
        ]
    try:
        chapter = load_yaml(source_path)
    except ManifestLoadError as exc:
        return [Diagnostic("error", "SOURCE_MANIFEST_LOAD", "$.source_manifest", str(exc))]

    chapter_id = chapter.get("chapter", {}).get("id")
    if chapter_id != document.get("chapter_id"):
        diagnostics.append(
            Diagnostic(
                "error",
                "CHAPTER_ID_MISMATCH",
                "$.chapter_id",
                f"focused scene uses {document.get('chapter_id')}, source manifest uses {chapter_id}",
            )
        )

    known_scenes = {item.get("id") for item in chapter.get("scenes", []) if isinstance(item, dict)}
    if document.get("scene_id") not in known_scenes:
        diagnostics.append(
            Diagnostic(
                "error",
                "SCENE_NOT_IN_CHAPTER",
                "$.scene_id",
                f"{document.get('scene_id')} is not defined in {source_path.name}",
            )
        )

    known_characters = {item.get("id") for item in chapter.get("characters", []) if isinstance(item, dict)}
    runtime = document.get("runtime", {})
    character_refs: list[tuple[str, Any]] = [
        ("$.runtime.player.character_id", runtime.get("player", {}).get("character_id"))
    ]
    for index, actor in enumerate(runtime.get("resources", {}).get("actors", [])):
        character_refs.append((f"$.runtime.resources.actors[{index}].character_id", actor.get("character_id")))
    for path, ref in character_refs:
        if isinstance(ref, str) and ref not in known_characters:
            diagnostics.append(Diagnostic("error", "UNKNOWN_CHAPTER_CHARACTER", path, f"{ref} is not defined in {source_path.name}"))

    known_kits = {item.get("id") for item in chapter.get("environment_kits", []) if isinstance(item, dict)}
    for index, ref in enumerate(runtime.get("level", {}).get("environment_kit_ids", [])):
        if isinstance(ref, str) and ref not in known_kits:
            diagnostics.append(
                Diagnostic(
                    "error",
                    "UNKNOWN_ENVIRONMENT_KIT",
                    f"$.runtime.level.environment_kit_ids[{index}]",
                    f"{ref} is not defined in {source_path.name}",
                )
            )

    return diagnostics
