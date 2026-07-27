# Novel Manifest Compiler Contract

The compiler treats the focused scene YAML as author-readable source and emits deterministic JSON for a chosen game engine. The source YAML is engine-neutral (meters, author coordinate convention); the engine target is the only layer that applies units, axes, and naming.

## Commands

```bash
python tools/novel_manifest.py validate tests/fixtures/CH01/scenes/CH01_S01_DikeBeach.scene.yaml

# Engine defaults to design.engine on the manifest, else Unreal.
python tools/novel_manifest.py compile \
  tests/fixtures/CH01/scenes/CH01_S01_DikeBeach.scene.yaml \
  --output build/CH01_S01_DikeBeach.compiled.json

# Or force a target explicitly.
python tools/novel_manifest.py compile \
  tests/fixtures/CH01/scenes/CH01_S01_DikeBeach.scene.yaml \
  --target godot \
  --output build/godot/CH01_S01_DikeBeach.json
```

The paths above point at this package's self-contained regression fixtures.
A book's real chapter artifacts live at the repository root under
`imports/<BOOK_SLUG>/<CHAPTER_ID>/`; substitute that path when validating or compiling a
chapter you are actually authoring.

The installed package also exposes the same interface as `novel-manifest`.

## Engine targets

`--target {auto,unreal,godot,unity}` (default `auto`). `auto` reads `design.engine` from the manifest — which the Scenework editor writes when you pick an engine at export — and falls back to `unreal`. Every target reads the same neutral source; only the emitted numbers, axis order, and unit suffixes differ.

| Target | Units | Up axis | Handedness | Vector fields |
| --- | --- | --- | --- | --- |
| `unreal` | centimeters (×100) | Z | left | `locationCm`, `pointsCm`, `speedCmps` |
| `unity` | meters (×1) | Y | left | `locationM`, `pointsM`, `speedMps` |
| `godot` | meters (×1) | Y | right | `locationM`, `pointsM`, `speedMps` |

Author space is `X` = horizontal run, `Y` = depth into the scene, `Z` = up. Y-up targets move height into `Y` and depth into `Z`; the right-handed target (`godot`) negates depth. The compiled JSON records the resolved profile under a top-level `target` block (`engine`, `unitScale`, `upAxis`, `handedness`) so an importer never has to guess.

Adding an engine means adding one `EngineTarget` in `novel_manifest/compiler.py` — the trigger/action semantics, validation, and source hash are shared across all targets.

## Exit codes

- `0`: valid or compiled successfully
- `1`: validation/semantic errors
- `2`: file loading or YAML parsing failure

## Validation layers

1. **JSON Schema:** strict fields, types, enums, ranges, and no unknown properties.
2. **Semantic validation:** duplicate IDs, resource references, beat references, event producers/consumers, and required `begin_play` entry.
3. **Chapter source checks:** optional DOCX/TXT anchor verification for chapter manifests.

Warnings do not block compilation. Errors do.

## Normalization rules

- YAML snake_case keys become JSON camelCase keys.
- Scalar `_m` values become `_cm` and are multiplied by 100.
- `location_m` and `points_m` vectors become `locationCm` and `pointsCm`.
- `_mps` values become `_cmps` and are multiplied by 100.
- Scalar `_m`/`_mps`/`_meters` values and `location_m`/`points_m` vectors convert to the target's units and unit-suffixed names (see the engine table above).
- Position vectors are axis-remapped for the target's up axis and handedness; named extents (length/width/height) keep their names and are not reordered.
- Trigger and action type names become PascalCase enum names (shared across engines).
- A canonical SHA-256 is calculated from parsed, key-sorted source data. Comments, whitespace, and the chosen engine target do not affect the hash — the same source hashes identically for every engine.
- No build timestamp is emitted, allowing byte-for-byte deterministic output from identical source data, compiler version, and target.

## Engine boundary

The target engine should consume only the compiled JSON. The creative YAML and its schema remain outside runtime code. An importer can deserialize the JSON into engine structs/assets, read the `target` block to confirm units and axes, build the graybox, and retain the source hash for change detection.
