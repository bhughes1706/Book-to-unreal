from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from novel_manifest.compiler import compile_scene
from novel_manifest.loaders import load_yaml
from novel_manifest.validators import (
    validate_chapter_semantics,
    validate_scene_against_chapter,
    validate_scene_semantics,
    validate_schema,
)

ROOT = Path(__file__).resolve().parents[1]
CHAPTER_DIR = ROOT / "chapters" / "CH01"
SCENE = CHAPTER_DIR / "scenes" / "CH01_S01_DikeBeach.scene.yaml"
SCENE_SCHEMA = ROOT / "schemas" / "scene_manifest.schema.json"
AUTHORING = CHAPTER_DIR / "scenes" / "CH01_S03_TowardReading.authoring.yaml"
EVENT_AUTHORING = (
    ROOT.parent / "imports" / "CH01" / "CH01_S07_HOTEL_BAR.authoring.yaml"
)
AUTHORING_SCHEMA = ROOT / "schemas" / "scene_authoring.schema.json"
CHAPTER = CHAPTER_DIR / "CH01.manifest.yaml"
CHAPTER_SCHEMA = ROOT / "schemas" / "chapter_manifest.schema.json"
SOURCE = CHAPTER_DIR / "source" / "Ch1.extracted.txt"


class SceneManifestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.document = load_yaml(SCENE)

    def test_scene_is_valid(self) -> None:
        diagnostics = validate_schema(self.document, SCENE_SCHEMA)
        diagnostics.extend(validate_scene_semantics(self.document))
        diagnostics.extend(validate_scene_against_chapter(self.document, SCENE))
        self.assertEqual([], [item for item in diagnostics if item.severity == "error"])

    def test_compile_converts_unreal_units(self) -> None:
        compiled = compile_scene(self.document)
        self.assertEqual(12000.0, compiled["runtime"]["environment"]["wall"]["lengthCm"])
        self.assertEqual(550.0, compiled["runtime"]["beats"][2]["actions"][1]["speedCmps"])
        self.assertEqual([6200.0, 0.0, 20.0], compiled["runtime"]["resources"]["paths"][0]["pointsCm"][0])

    def test_compile_is_deterministic(self) -> None:
        first = json.dumps(compile_scene(self.document), sort_keys=True)
        second = json.dumps(compile_scene(self.document), sort_keys=True)
        self.assertEqual(first, second)

    def test_unresolved_resource_is_rejected(self) -> None:
        changed = copy.deepcopy(self.document)
        changed["runtime"]["beats"][1]["actions"][0]["content_id"] = "LENS_MISSING"
        diagnostics = validate_scene_semantics(changed)
        self.assertIn("UNRESOLVED_REFERENCE", {item.code for item in diagnostics})

    def test_unresolved_event_is_rejected(self) -> None:
        changed = copy.deepcopy(self.document)
        changed["runtime"]["beats"][3]["trigger"]["event_id"] = "EVENT_NEVER_EMITTED"
        diagnostics = validate_scene_semantics(changed)
        self.assertIn("UNRESOLVED_EVENT", {item.code for item in diagnostics})

    def test_forward_beat_dependency_is_rejected(self) -> None:
        changed = copy.deepcopy(self.document)
        changed["runtime"]["beats"][0]["trigger"] = {
            "type": "beat_completed",
            "beat_id": "BEAT_BOY_RUNS_ACROSS",
        }
        diagnostics = validate_scene_semantics(changed)
        self.assertIn("FORWARD_BEAT_DEPENDENCY", {item.code for item in diagnostics})


    def test_unknown_chapter_character_is_rejected(self) -> None:
        changed = copy.deepcopy(self.document)
        changed["runtime"]["player"]["character_id"] = "CHAR_NOT_IN_CHAPTER"
        diagnostics = validate_scene_against_chapter(changed, SCENE)
        self.assertIn("UNKNOWN_CHAPTER_CHARACTER", {item.code for item in diagnostics})

    def test_unknown_property_fails_schema(self) -> None:
        changed = copy.deepcopy(self.document)
        changed["runtime"]["camera"]["mystery_setting"] = True
        diagnostics = validate_schema(changed, SCENE_SCHEMA)
        self.assertIn("SCHEMA", {item.code for item in diagnostics})


class PackagingTests(unittest.TestCase):
    def test_packaged_schemas_match_repository_schemas(self) -> None:
        for name in (
            "chapter_manifest.schema.json",
            "scene_authoring.schema.json",
            "scene_manifest.schema.json",
        ):
            self.assertEqual(
                json.loads((ROOT / "schemas" / name).read_text(encoding="utf-8")),
                json.loads(
                    (ROOT / "novel_manifest" / "schemas" / name).read_text(
                        encoding="utf-8"
                    )
                ),
            )


class SceneAuthoringTests(unittest.TestCase):
    def test_authoring_scene_is_valid(self) -> None:
        document = load_yaml(AUTHORING)
        diagnostics = validate_schema(document, AUTHORING_SCHEMA)
        self.assertEqual([], diagnostics)

    def test_event_thread_and_hud_responses_are_valid(self) -> None:
        document = load_yaml(EVENT_AUTHORING)
        diagnostics = validate_schema(document, AUTHORING_SCHEMA)
        self.assertEqual([], diagnostics)

        hud_event = next(
            event
            for event in document["staging"]["hud_events"]
            if event["id"]
            == "LENS_SYSTEM_NOTIFICATION_CONGRATULATE_DIVER_FAMILY"
        )
        self.assertEqual(
            "EVENT_PIER_DIVER_FAMILY_PAYOUT",
            hud_event["event_thread"]["id"],
        )
        self.assertEqual(2, len(hud_event["responses"]))


class ChapterManifestTests(unittest.TestCase):
    def test_chapter_is_valid(self) -> None:
        document = load_yaml(CHAPTER)
        diagnostics = validate_schema(document, CHAPTER_SCHEMA)
        if SOURCE.exists():
            diagnostics.extend(validate_chapter_semantics(document, SOURCE))
        else:
            diagnostics.extend(validate_chapter_semantics(document))
        self.assertEqual([], [item for item in diagnostics if item.severity == "error"])


if __name__ == "__main__":
    unittest.main()
