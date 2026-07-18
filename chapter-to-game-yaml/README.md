# Chapter → Game YAML package

This package contains two linked layers:

1. **Chapter extraction:** convert a novel chapter into a traceable chapter manifest.
2. **Focused scene compilation:** convert an approved scene YAML into deterministic JSON for Unreal editor tooling.

## Contents

- `SKILL.md` — repeatable chapter-to-manifest instructions and adaptation policy.
- `schemas/chapter_manifest.schema.json` — chapter manifest contract.
- `schemas/scene_authoring.schema.json` — author-facing scene editor contract.
- `schemas/scene_manifest.schema.json` — strict focused-scene/compiler contract.
- `chapters/CH01/CH01.manifest.yaml` — Chapter 1 production breakdown.
- `chapters/CH01/source/` — extracted source text and source metadata.
- `chapters/CH01/scenes/` — compiler-ready focused scenes.
- `chapters/CH01/compiled/` — deterministic Unreal-facing output.
- `novel_manifest/` — installable validator/compiler package.
- `tools/novel_manifest.py` — repository-local CLI entry point.
- `tests/` — regression tests.
- `docs/compiler_contract.md` — compiler boundary and normalization rules.

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
  chapters/CH01/CH01.manifest.yaml \
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
  chapters/CH01/scenes/CH01_S01_DikeBeach.scene.yaml
```

Focused-scene validation performs:

- strict schema checks with unknown fields rejected
- resource and marker reference checks
- beat dependency validation
- emitted-event/consumed-event validation
- source chapter-manifest lookup
- character and environment-kit cross-checks

Machine-readable diagnostics are available with `--json`.

## Compile for Unreal

```bash
python tools/novel_manifest.py compile \
  chapters/CH01/scenes/CH01_S01_DikeBeach.scene.yaml \
  --output chapters/CH01/compiled/CH01_S01_DikeBeach.compiled.json
```

Compilation:

- refuses manifests with semantic errors
- converts meters to Unreal centimeters
- converts snake_case keys to camelCase
- converts trigger/action names to Unreal-friendly enum names
- emits a canonical SHA-256 for change detection
- omits timestamps, so identical input produces byte-identical output

## Run tests

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

## Intended Unreal workflow

```text
chapter.docx
  → chapter YAML skill
  → author-approved chapter manifest
  → focused scene YAML
  → novel-manifest validate/compile
  → normalized JSON
  → Unreal editor importer / scene builder / MCP tool
```

The compiler does not directly modify Unreal. The next layer will be a `NovelPipeline` Unreal editor plugin that consumes the compiled JSON and builds the dike graybox deterministically.
