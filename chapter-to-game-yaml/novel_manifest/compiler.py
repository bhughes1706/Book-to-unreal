from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from typing import Any

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


def _canonical_hash(document: dict[str, Any]) -> str:
    encoded = json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def _convert_value(key: str, value: Any) -> tuple[str, Any]:
    # Vector-valued unit fields must be handled before generic scalar suffixes.
    if key == "points_m":
        return "pointsCm", [[round(float(component) * 100.0, 4) for component in point] for point in value]
    if key == "location_m":
        return "locationCm", [round(float(component) * 100.0, 4) for component in value]
    if key.endswith("_mps"):
        return _camel(key[:-4] + "_cmps"), round(float(value) * 100.0, 4)
    if key.endswith("_meters"):
        return _camel(key[:-7] + "_centimeters"), round(float(value) * 100.0, 4)
    if key.endswith("_m"):
        return _camel(key[:-2] + "_cm"), round(float(value) * 100.0, 4)
    return _camel(key), value


def _normalize_mapping(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_mapping(item) for item in value]
    if not isinstance(value, dict):
        return value
    result: dict[str, Any] = {}
    for key, child in value.items():
        out_key, out_value = _convert_value(key, child)
        result[out_key] = _normalize_mapping(out_value)
    return result


def _compile_trigger(trigger: dict[str, Any]) -> dict[str, Any]:
    result = _normalize_mapping(deepcopy(trigger))
    result["type"] = TRIGGER_NAMES[trigger["type"]]
    if "conditions" in trigger:
        result["conditions"] = [_compile_trigger(item) for item in trigger["conditions"]]
    return result


def _compile_action(action: dict[str, Any]) -> dict[str, Any]:
    result = _normalize_mapping(deepcopy(action))
    result["type"] = ACTION_NAMES[action["type"]]
    return result


def compile_scene(document: dict[str, Any]) -> dict[str, Any]:
    runtime = document["runtime"]
    compiled_runtime = _normalize_mapping(deepcopy(runtime))
    compiled_runtime["beats"] = []
    for beat in runtime["beats"]:
        compiled_runtime["beats"].append(
            {
                "id": beat["id"],
                "once": beat.get("once", True),
                "trigger": _compile_trigger(beat["trigger"]),
                "actions": [_compile_action(action) for action in beat["actions"]],
            }
        )

    return {
        "formatVersion": 1,
        "compiler": {
            "name": "novel-manifest",
            "version": __version__,
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
