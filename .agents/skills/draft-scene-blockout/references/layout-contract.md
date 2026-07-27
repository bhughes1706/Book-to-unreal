# Scenework Layout YAML contract

The Layout workspace owns visual blockout decisions. It does not own story
intent and it is not executable Unreal data.

## Separate authoring layers

For each scene:

- `<SCENE_ID>.authoring.yaml` owns source excerpts, dialogue, choices, story
  changes, NPC/item/interactable/HUD definitions, beats, and event threads.
- `<SCENE_ID>.scene.yaml` owns dimensions, camera intent, graybox geometry,
  placements, movement paths, placeholder assets, and spatial acceptance tests.

Both files for a scene live together at
`imports/<BOOK_SLUG>/<CHAPTER_ID>/`.

Never copy a layout value back into Story. Never rewrite a story value from
Layout.

## Layout document

Use this top-level shape:

```yaml
schema_version: 0.3.0
kind: scene_manifest
chapter_id: CH01
scene_id: CH01_S01_EXAMPLE
source_authoring:
  path: imports/buzzing-electric/CH01/CH01_S01_EXAMPLE.authoring.yaml
  sha256: <64 lowercase hex characters>
source_manifest: ../CH01.manifest.yaml
status: needs_review
merge:
  mode: create
  unresolved: []
design: {}
graybox_assets: []
art_replacement_assets: []
runtime: {}
acceptance_tests: []
notes: ""
```

`status` is `draft`, `needs_review`, or `layout_approved`. `merge.mode` is
`create`, `merge`, or `import`.

The authoring hash is semantic rather than a hash of YAML formatting. Parse the
authoring document, recursively sort object keys while preserving array order,
serialize compact JSON as UTF-8, and SHA-256 those bytes. Use the bundled
`scripts/authoring_hash.mjs`; it matches the editor.

## Design

`design.presentation_mode` mirrors Story and remains story-owned.

`design.engine` is the optional compile target (`unreal`, `godot`, or `unity`).
It is a per-book decision owned by the editor, not by Layout. In create mode,
omit it — the compiler defaults to `unreal` and the editor stamps the book's
engine on export. In merge mode, treat any existing `design.engine` as a
preserved, layout-adjacent value: carry it forward unchanged. Never invent,
change, or drop it; a wiped engine silently reverts a Godot or Unity book to
Unreal units and axes.

`design.dimensions_m` contains positive `length`, `width`, and `height`.

`design.camera` contains:

- `mode`: `side_view_perspective`, `orthographic`, or `fixed_cinematic`;
- `horizontal_tracking` and `vertical_tracking`;
- `perspective_fov_degrees`;
- `orthographic_width_m`;
- `framing_notes`.

Camera framing is a visual contract, not an instruction to generate code.

## Runtime blockout

`runtime.level` contains a future level name, future content output path, and
environment-kit IDs. These are naming and handoff data only.

`runtime.environment.pieces` contains stable IDs, labels, kind, placeholder
asset ID, `[x, y, z]` location in meters, dimensions in meters, and notes.

`runtime.resources.placements` contains:

- a stable placement ID;
- exact upstream `source_id` when bound to Story;
- label and kind;
- optional exact upstream `beat_id`;
- `[x, y, z]` location in meters;
- radius and visible bounds;
- placeholder asset ID and notes;
- `orphaned: true` when a previous story resource was removed.

Placement kinds are `player_start`, `npc`, `interactable`, `item`,
`transition`, `camera`, `audio`, and `custom`.

`runtime.resources.paths` contains a stable ID, optional NPC and beat bindings,
movement speed in meters per second, ordered `[x, y, z]` points, and notes.

`runtime.story_bindings` mirrors exact upstream beat, dialogue, HUD, and event
thread IDs. It exists for traceability and is never edited independently.

## Create and merge

Create mode may propose defaults. Every proposed value remains reviewable.

Merge mode must:

- carry current story-owned bindings;
- preserve layout-owned coordinates and visual work;
- preserve an existing `design.engine` set by the editor;
- add new spatial story resources;
- retain removed resources as orphans;
- flag missing beats, missing resources, and ambiguous rebinding;
- update the upstream hash;
- demote approved layout to `needs_review`.

A layout cannot be approved while stale, while merge conflicts remain, or while
required spatial story resources are unplaced.

## Scope boundary

The current editor contract ends at YAML. It does not define compiled JSON,
incremental Unreal import, Blueprint/C++ behavior, or asset creation.
