# Book to Unreal

Turn novel chapters into editable Story and Layout scenes, approve each
authoring layer, then export traceable YAML.

## Current milestone

The web-based **Scenework** editor provides:

- a chapter workspace built from the nine Chapter 1 scenes;
- exact source-passage editing and dialogue selection;
- scene-level approval states and author notes;
- consequence-bearing player dialogue choices;
- a playable-staging workspace for ordered beats, NPC entrances and behavior,
  items and interactables, plus diegetic HUD/Lens events;
- a visual Layout workspace for scene dimensions, camera intent, draggable
  story-resource placements, movement paths, graybox geometry, placeholder
  assets, and spatial acceptance tests;
- separate `.authoring.yaml` and `.scene.yaml` exports in one editor;
- authoring SHA-256 tracking, stale Layout indicators, and merge mode that
  preserves hand-authored spatial work;
- an explicit choice between scrolling HD-2D and static cinematic staging;
- an adaptation ledger for reviewing every change from source;
- browser-local autosave plus portable YAML downloads and normalized authoring
  JSON preview.

The [`chapter-to-game-yaml`](chapter-to-game-yaml/) package provides:

- a Codex skill for extracting canonical chapter content and explicit adaptation
  proposals;
- strict JSON Schemas for chapters, authoring scenes, and runtime scenes;
- semantic and cross-manifest validators;
- a deterministic YAML-to-Unreal-JSON compiler;
- the validated Chapter 1 production artifacts and regression suite.

The Story document is intentionally separate from the visual Layout document.
Story decisions are reviewed first. Layout carries approved IDs into a spatial
blockout and records the exact hash of its upstream Story source.

The unified workflow and ownership rules are documented in
[Scenework YAML pipeline](docs/scenework-yaml-pipeline.md). This editor work
stops at YAML; it does not change the legacy JSON compiler or add Unreal code.

## Permanent game rules

The governing policy is [Content Redlines: Children & Violence](docs/content-redlines-children-violence.md).
It applies to source analysis, scene planning, authoring YAML, Unreal staging,
generated art and audio, marketing, and every future agent workflow.

It allows the game to imply and critique institutional harm, but never to make a
child's body or suffering the spectacle. It prohibits harmful player agency,
explicit child injury or death, sexual or suggestive child content, exploitative
camera framing, replicable mechanics of harm, and real-child likenesses or
voices. Every child-adjacent scene or asset must pass its player-verb,
abstraction, and 40-second clip checks before it enters the build.

## Run the local scene editor

Scenework is a local-only web app. It binds to your computer at
`http://127.0.0.1:3001` and does not require a cloud account or hosted backend.

```bash
pnpm install
pnpm local
```

Open `http://127.0.0.1:3001`.

Edits autosave in that browser's local storage. Export Story and Layout YAML
regularly if you want portable backups or need to move work between browsers.

### Traceable IDs and event threads

ID fields offer a one-click suggestion built from ownership, resource type, and
a short content cadence. Character lines begin with the speaker
(`GRAYSON_DIALOGUE_…`), Grayson’s internal observations use
`GRAYSON_MONOLOGUE_…`, Lens UI uses `LENS_<CHANNEL>_…`, inventory uses
`GRAYSON_ITEM_…`, and world interactions use `WORLD_INTERACT_…`. Existing IDs
remain valid; accepting a suggestion also updates beat references.

Assign the same `EVENT_…` thread ID to beats and HUD events in different scenes.
The **Event threads** tab then shows the setup, callback, choice, consequence,
and resolution as one chapter-wide timeline.

Destructive deletes open a confirmation dialog before changing the workspace.
Use **Undo**, `⌘Z` on macOS, or `Ctrl+Z` elsewhere to restore the last workspace
change. Normal text-field undo continues to work while typing.

## Create a chapter first pass with AI

The project skill `$draft-chapter-scenes` reads a complete chapter, proposes
scenes and beats, explains every boundary, and reports anything it would
condense or omit. It does not create editor files until you approve the reported
plan.

Start with a prompt such as:

```text
Use $draft-chapter-scenes to analyze CH02 from this attached chapter.
Report the scene and beat plan for my approval.
```

Request changes directly in the chat, or approve the current plan. After
approval, the skill writes validated Story files to `imports/<CHAPTER_ID>/`.
Use **Import YAML** in Scenework to load them, then make cleanup changes in
Story.

## Create a visual blockout with AI

After a Story scene is approved, `$draft-scene-blockout` proposes dimensions,
camera, player flow, resource placements, movement paths, graybox geometry, and
placeholder assets. It explains its decisions and waits for approval before
creating or merging `<SCENE_ID>.scene.yaml`.

```text
Use $draft-scene-blockout to propose a visual blockout for
imports/CH02/CH02_S01_EXAMPLE.authoring.yaml.
```

Import the resulting YAML or continue editing the same scene in the **Layout**
tab. If Story changes later, Scenework marks Layout stale. **Merge story
changes** carries new Story bindings downstream while preserving manual
coordinates and other spatial work.

For a local production-mode build:

```bash
pnpm build
pnpm start
```

## Local verification

The validator requires Python 3.11 or newer. With `uv`:

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python \
  -r chapter-to-game-yaml/requirements.txt

cd chapter-to-game-yaml
PYTHONPATH=. ../.venv/bin/python -m unittest discover -s tests -v
../.venv/bin/python tools/novel_manifest.py validate \
  chapters/CH01/scenes/CH01_S01_DikeBeach.scene.yaml
```

See the [package README](chapter-to-game-yaml/README.md) for validation and
compilation commands.
