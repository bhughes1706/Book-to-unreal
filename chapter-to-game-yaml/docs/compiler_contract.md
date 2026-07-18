# Novel Manifest Compiler Contract

The compiler treats the focused scene YAML as author-readable source and emits deterministic JSON for Unreal editor tooling.

## Commands

```bash
python tools/novel_manifest.py validate chapters/CH01/scenes/CH01_S01_DikeBeach.scene.yaml

python tools/novel_manifest.py compile \
  chapters/CH01/scenes/CH01_S01_DikeBeach.scene.yaml \
  --output chapters/CH01/compiled/CH01_S01_DikeBeach.compiled.json
```

The installed package also exposes the same interface as `novel-manifest`.

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
- Trigger and action type names become Unreal-friendly PascalCase enum names.
- A canonical SHA-256 is calculated from parsed, key-sorted source data. Comments and whitespace do not affect the hash.
- No build timestamp is emitted, allowing byte-for-byte deterministic output from identical source data and compiler versions.

## Unreal boundary

Unreal should consume only the compiled JSON. The creative YAML and its schema remain outside runtime code. An editor importer can deserialize the JSON into C++ structs or Primary Data Assets, build the graybox, and then retain the source hash for change detection.
