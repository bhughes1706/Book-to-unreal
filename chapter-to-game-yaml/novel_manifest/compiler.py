from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Callable, Sequence

from . import __version__

TRIGGER_NAMES = {
    "begin_play": "BeginPlay",
    "interaction": "Interaction",
    "player_distance": "PlayerDistance",
    "beat_completed": "BeatCompleted",
    "elapsed_since_beat": "ElapsedSinceBeat",
    "event": "Event",
    "any_of": "AnyOf",
    "all_of": "AllOf",
}

ACTION_NAMES = {
    "set_player_input": "SetPlayerInput",
    "wait": "Wait",
    "show_lens_content": "ShowLensContent",
    "spawn_actor": "SpawnActor",
    "follow_path": "FollowPath",
    "play_audio": "PlayAudio",
    "unlock_transition": "UnlockTransition",
}


# --- Engine targets -----------------------------------------------------------
#
# The authoring/runtime YAML is engine-neutral and expressed in meters, in the
# author's coordinate convention (which happens to match Unreal):
#   X = horizontal run, Y = depth into the scene, Z = up.
#
# An engine target is the only place that knows how to turn that neutral data
# into an engine's units, axis convention, and unit-suffixed field names. Adding
# a new engine means adding one EngineTarget below — nothing else changes.


@dataclass(frozen=True)
class EngineTarget:
    name: str
    display_name: str
    unit_scale: float  # multiply every meter magnitude by this
    short_unit: str  # replaces a trailing "_m"      (e.g. "cm" / "m")
    speed_unit: str  # replaces a trailing "_mps"    (e.g. "cmps" / "mps")
    long_unit: str  # replaces a trailing "_meters"  (e.g. "centimeters" / "meters")
    up_axis: str  # "z" or "y"
    handedness: str  # "left" or "right"
    remap_point: Callable[[Sequence[float]], list[float]]


def _round_components(values: Sequence[float]) -> list[float]:
    # Add 0.0 so a negated zero from an axis flip normalizes to 0.0, not -0.0.
    return [round(float(component), 4) + 0.0 for component in values]


def _axis_identity(point: Sequence[float]) -> list[float]:
    # Unreal: keep the author's Z-up, left-handed convention as-is.
    return _round_components(point)


def _axis_z_up_to_y_up_left(point: Sequence[float]) -> list[float]:
    # Unity: Y-up, left-handed. Height (Z) becomes Y; depth (Y) becomes Z.
    x, y, z = point
    return _round_components((x, z, y))


def _axis_z_up_to_y_up_right(point: Sequence[float]) -> list[float]:
    # Godot: Y-up, right-handed. Height (Z) becomes Y; depth (Y) becomes Z and
    # is negated to flip handedness from the author's left-handed space.
    x, y, z = point
    return _round_components((x, z, -y))


ENGINE_TARGETS: dict[str, EngineTarget] = {
    "unreal": EngineTarget(
        name="unreal",
        display_name="Unreal Engine",
        unit_scale=100.0,
        short_unit="cm",
        speed_unit="cmps",
        long_unit="centimeters",
        up_axis="z",
        handedness="left",
        remap_point=_axis_identity,
    ),
    "unity": EngineTarget(
        name="unity",
        display_name="Unity",
        unit_scale=1.0,
        short_unit="m",
        speed_unit="mps",
        long_unit="meters",
        up_axis="y",
        handedness="left",
        remap_point=_axis_z_up_to_y_up_left,
    ),
    "godot": EngineTarget(
        name="godot",
        display_name="Godot",
        unit_scale=1.0,
        short_unit="m",
        speed_unit="mps",
        long_unit="meters",
        up_axis="y",
        handedness="right",
        remap_point=_axis_z_up_to_y_up_right,
    ),
}

DEFAULT_TARGET = "unreal"


def resolve_target(target: EngineTarget | str | None) -> EngineTarget:
    if isinstance(target, EngineTarget):
        return target
    key = (target or DEFAULT_TARGET).strip().lower()
    if key not in ENGINE_TARGETS:
        available = ", ".join(sorted(ENGINE_TARGETS))
        raise ValueError(f"unknown engine target: {target!r} (choose from {available})")
    return ENGINE_TARGETS[key]


def detect_target_name(document: dict[str, Any]) -> str | None:
    """Read an engine target recorded on the manifest (``design.engine``)."""
    design = document.get("design")
    if isinstance(design, dict):
        engine = design.get("engine")
        if isinstance(engine, str) and engine.strip():
            return engine.strip().lower()
    return None


def _canonical_hash(document: dict[str, Any]) -> str:
    encoded = json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def _convert_value(target: EngineTarget, key: str, value: Any) -> tuple[str, Any]:
    scale = target.unit_scale
    # Vector-valued unit fields must be handled before generic scalar suffixes,
    # and are the only fields that get axis-remapped (extents/scalars do not).
    if key == "points_m":
        points = [target.remap_point([component * scale for component in point]) for point in value]
        return _camel("points_" + target.short_unit), points
    if key == "location_m":
        return _camel("location_" + target.short_unit), target.remap_point(
            [component * scale for component in value]
        )
    if key.endswith("_mps"):
        return _camel(key[:-4] + "_" + target.speed_unit), round(float(value) * scale, 4)
    if key.endswith("_meters"):
        return _camel(key[:-7] + "_" + target.long_unit), round(float(value) * scale, 4)
    if key.endswith("_m"):
        return _camel(key[:-2] + "_" + target.short_unit), round(float(value) * scale, 4)
    return _camel(key), value


def _normalize_mapping(target: EngineTarget, value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_mapping(target, item) for item in value]
    if not isinstance(value, dict):
        return value
    result: dict[str, Any] = {}
    for key, child in value.items():
        out_key, out_value = _convert_value(target, key, child)
        result[out_key] = _normalize_mapping(target, out_value)
    return result


def _compile_trigger(target: EngineTarget, trigger: dict[str, Any]) -> dict[str, Any]:
    result = _normalize_mapping(target, deepcopy(trigger))
    result["type"] = TRIGGER_NAMES[trigger["type"]]
    if "conditions" in trigger:
        result["conditions"] = [_compile_trigger(target, item) for item in trigger["conditions"]]
    return result


def _compile_action(target: EngineTarget, action: dict[str, Any]) -> dict[str, Any]:
    result = _normalize_mapping(target, deepcopy(action))
    result["type"] = ACTION_NAMES[action["type"]]
    return result


def compile_scene(
    document: dict[str, Any], target: EngineTarget | str | None = None
) -> dict[str, Any]:
    engine = resolve_target(target)
    runtime = document["runtime"]
    compiled_runtime = _normalize_mapping(engine, deepcopy(runtime))
    compiled_runtime["beats"] = []
    for beat in runtime["beats"]:
        compiled_runtime["beats"].append(
            {
                "id": beat["id"],
                "once": beat.get("once", True),
                "trigger": _compile_trigger(engine, beat["trigger"]),
                "actions": [_compile_action(engine, action) for action in beat["actions"]],
            }
        )

    return {
        "formatVersion": 1,
        "compiler": {
            "name": "novel-manifest",
            "version": __version__,
        },
        "target": {
            "engine": engine.name,
            "displayName": engine.display_name,
            "unitScale": engine.unit_scale,
            "linearUnit": engine.short_unit,
            "upAxis": engine.up_axis,
            "handedness": engine.handedness,
        },
        "source": {
            "kind": document["kind"],
            "schemaVersion": document["schema_version"],
            "chapterId": document["chapter_id"],
            "sceneId": document["scene_id"],
            "sourceManifest": document["source_manifest"],
            "canonicalSha256": _canonical_hash(document),
        },
        "runtime": compiled_runtime,
        "review": {
            "status": document["status"],
            "canonicalConstraints": document["canonical_constraints"],
            "approvedAdaptationDecisions": document["approved_adaptation_decisions"],
            "acceptanceTests": document["acceptance_tests"],
        },
    }
