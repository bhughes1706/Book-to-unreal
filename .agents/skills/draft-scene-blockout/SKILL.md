---
name: draft-scene-blockout
description: Read approved Scenework scene-authoring YAML and propose a traceable visual blockout with dimensions, camera, graybox geometry, story-resource placements, and movement paths; explain the staging choices; wait for author approval; then create or merge a separate .scene.yaml while preserving hand-authored spatial work. Use when an approved story scene needs a first visual layout, an existing layout is stale after story edits, or a merge-safe blockout needs revision before editor cleanup.
---

# Draft Scene Blockout

Turn approved story intent into an author-reviewed spatial plan, then into
importable Layout YAML. Keep Story and Layout as separate truths and preserve
manual layout work across downstream revisions.

## Read standing project context

At the start of every run, find the nearest repository root containing
`imports/`, `docs/content-redlines-children-violence.md`, and
`game-guide-1-mechanics.md`.

Read both governing documents completely. Retain them as standing context for
the whole run.

- Apply every child-safety redline to camera, distance, animation implications,
  audio cues, staging notes, and placeholder-asset requests.
- Preserve the game's diegetic systems. Do not introduce a conventional HUD,
  abstract meter, combat substitute, or disconnected mechanic.
- Check every proposed system interaction against the mechanics guide's
  integration map.

Read `references/layout-contract.md` completely before planning or writing.

## Enforce the workflow state

Use exactly these phases:

1. `ANALYZE`: read the complete authoring scene and any existing layout.
2. `AWAIT_APPROVAL`: report the spatial proposal in chat and stop.
3. `BUILD`: create or merge Layout YAML only after explicit approval.

A request to draft, stage, scaffold, or show a first pass authorizes phases 1–2
only. An explicit approval of the current reported plan authorizes phase 3. If
the author revises the proposal, increment the plan revision and return to
`AWAIT_APPROVAL`.

## Phase 1: analyze the complete story scene

1. Read the complete `<SCENE_ID>.authoring.yaml`; do not infer the scene from a
   synopsis or selected beat.
2. Require the story scene to be `approved` or `locked`. If it is not, report
   that Layout may be explored but cannot be approved.
3. Account for every beat, NPC, interactable, visible inventory item, HUD
   event, dialogue reference, and event-thread binding.
4. Inspect project assets and neighboring approved scene layouts when present.
   Reuse established kit IDs, scale, camera language, and transition positions.
5. If `<SCENE_ID>.scene.yaml` already exists, treat this as `merge` mode:
   preserve layout-owned values and identify upstream additions, removals, and
   changed bindings.
6. Calculate SHA-256 from the canonical authoring document represented by the
   editor export:

   ```bash
   node <skill-dir>/scripts/authoring_hash.mjs \
     imports/<BOOK_SLUG>/<CHAPTER_ID>/<SCENE_ID>.authoring.yaml
   ```

   Record the result as the proposed `source_authoring.sha256`.
7. Propose only values that affect visual blockout:
   - scene dimensions and playable bounds;
   - camera mode, tracking, FOV or orthographic width, and framing rationale;
   - player start, story-resource placements, transitions, and trigger volumes;
   - graybox geometry and placeholder assets;
   - NPC movement paths and beat bindings;
   - acceptance tests and explicit art-replacement needs.
8. Do not change story dialogue, beats, item category, event threads, player
   goal, or source adaptation in this phase. Send those problems upstream to
   Story.

## Phase 2: report and stop

Report:

1. Input confirmation: scene ID, story status, hash prefix, create/merge mode,
   and every story resource accounted for.
2. Spatial concept: player flow, scale, camera, entrances/exits, and why this
   composition serves the scene.
3. Beat walk-through: what changes spatially at each beat.
4. Placement table: source ID, kind, beat binding, proposed coordinates, and
   rationale.
5. Graybox and paths: geometry, movement routes, placeholder assets, and
   replacements needed later.
6. Merge report when applicable:
   - story-owned fields carried forward;
   - layout-owned fields preserved;
   - new resources added for review;
   - removed resources retained as orphans;
   - conflicts requiring judgment.
7. Safety and mechanics checks.
8. Assumptions and author decisions.

End exactly with:

`Awaiting layout approval — no scene layout file has been created or changed.`

## Phase 3: build or merge the approved layout

1. Write `imports/<BOOK_SLUG>/<CHAPTER_ID>/<SCENE_ID>.scene.yaml`, using the
   same book slug as the source authoring file.
2. Use `schema_version: 0.3.0` and `kind: scene_manifest`.
3. Store the exact authoring path and SHA-256 under `source_authoring`.
4. Copy story IDs into `runtime.story_bindings`; do not rename them.
5. In create mode, generate the approved placements, paths, geometry, camera,
   assets, notes, and acceptance tests.
6. In merge mode:
   - update story-owned bindings from the approved authoring YAML;
   - preserve hand-authored coordinates, dimensions, geometry, paths, camera,
     assets, and layout notes;
   - preserve any existing `design.engine`; it is the book's editor-owned
     compile target and must survive the merge untouched;
   - add new story resources as review-needed placements;
   - retain removed story resources with `orphaned: true`;
   - list unresolved items under `merge.unresolved`;
   - set layout status to `needs_review`.
7. Never mark a generated or merged layout `layout_approved` on the author's
   behalf.
8. Re-read the produced YAML and confirm that every story binding is exact,
   every point uses meters, and every unresolved merge issue is visible.
9. Report the file, hash, create/merge result, preserved values, conflicts, and
   remaining editor cleanup.

Do not create compiled JSON, modify the JSON compiler, create Unreal code, or
edit Unreal assets. This skill stops at Layout YAML.

## Change-ripple law

- Edits flow downstream only: Story → Layout → future compiled output.
- A story problem returns to Story. A spatial problem returns to Layout.
- Never repair upstream truth by editing copied fields downstream.
- A layout whose stored authoring hash differs from the current story hash is
  stale, even if the visible change seems harmless.
- Merge is preservation-first. Never silently discard manual spatial work.
- An orphan or ambiguity remains explicit until an author resolves it.
