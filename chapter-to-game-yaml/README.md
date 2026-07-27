# Chapter → Game YAML package

This package contains two linked layers:

1. **Chapter extraction:** convert a novel chapter into a traceable chapter manifest.
2. **Focused scene compilation:** convert an approved scene YAML into deterministic JSON for Unreal editor tooling.

## Contents

- `SKILL.md` — repeatable chapter-to-manifest instructions and adaptation policy.
- `novel_manifest/schemas/chapter_manifest.schema.json` — chapter manifest contract.
- `novel_manifest/schemas/scene_authoring.schema.json` — author-facing scene editor contract.
- `novel_manifest/schemas/scene_manifest.schema.json` — strict focused-scene/compiler contract.
- `novel_manifest/` — installable validator/compiler package (the schemas above ship inside it).
- `tools/novel_manifest.py` — repository-local CLI entry point.
- `tests/` — regression tests, backed by self-contained fixtures under `tests/fixtures/`.
- `docs/compiler_contract.md` — compiler boundary and normalization rules.

A book's live chapter artifacts (Story `.authoring.yaml` and Layout `.scene.yaml`)
live at the repository root under `imports/<BOOK_SLUG>/<CHAPTER_ID>/` — see the top-level
[README](../README.md) and [Scenework YAML pipeline](../docs/scenework-yaml-pipeline.md).
This package no longer owns a `chapters/<ID>/` directory for live books; its
`tests/fixtures/CH01/` copy exists only to exercise the validator and compiler
in isolation from any book you are currently editing.

## Installation

The repository-local command works with the dependencies in `requirements.txt`:

```bash
python -m pip install -r requirements.txt
python tools/novel_manifest.py --help
```

The package can also be installed from the included wheel or source tree:

```bash
python -m pip install .
novel-manifest --help
```

## Validate the complete chapter

```bash
python tools/novel_manifest.py validate \
  tests/fixtures/CH01/CH01.manifest.yaml \
  --kind chapter \
  --source /path/to/Ch1.docx
```

Chapter validation performs:

- JSON Schema validation
- duplicate-ID detection
- cross-reference checks
- continuous scene-order checks
- optional source-anchor lookup against DOCX or TXT

## Validate the focused scene

```bash
python tools/novel_manifest.py validate \
  tests/fixtures/CH01/scenes/CH01_S01_DikeBeach.scene.yaml
```

Focused-scene validation performs:

- strict schema checks with unknown fields rejected
- resource and marker reference checks
- beat dependency validation
- emitted-event/consumed-event validation
- source chapter-manifest lookup
- character and environment-kit cross-checks

Machine-readable diagnostics are available with `--json`.

## Compile for an engine

```bash
# Target defaults to design.engine on the manifest, else Unreal.
python tools/novel_manifest.py compile \
  tests/fixtures/CH01/scenes/CH01_S01_DikeBeach.scene.yaml \
  --output build/CH01_S01_DikeBeach.compiled.json

# Or pick one: --target {unreal,godot,unity}
python tools/novel_manifest.py compile \
  tests/fixtures/CH01/scenes/CH01_S01_DikeBeach.scene.yaml \
  --target godot --output build/godot/CH01_S01_DikeBeach.json
```

Compilation:

- refuses manifests with semantic errors
- converts meters to the target's units (Unreal centimeters; Godot/Unity meters)
- reorients position vectors to the target's up axis and handedness
- converts snake_case keys to camelCase with target unit suffixes
- converts trigger/action names to PascalCase enum names
- records the resolved engine profile under a top-level `target` block
- emits a canonical SHA-256 for change detection (identical across engines)
- omits timestamps, so identical input + target produces byte-identical output

See [docs/compiler_contract.md](docs/compiler_contract.md) for the full engine target table.

## Run tests

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

## Intended engine workflow

```text
chapter.docx
  → chapter YAML skill
  → author-approved chapter manifest
  → focused scene YAML (engine chosen at export → design.engine)
  → novel-manifest validate/compile --target <engine>
  → engine-native JSON
  → engine importer / scene builder / MCP tool
```

The compiler does not directly modify any engine. The next layer is an importer (starting with a `NovelPipeline` Unreal editor plugin) that consumes the compiled JSON and builds the dike graybox deterministically; the same neutral source can compile to Godot or Unity by switching the target.
