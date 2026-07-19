# Book to Unreal

Turn novel chapters into editable game scenes, approve the adaptation, then
export traceable YAML and normalized JSON.

## Current milestone

The web-based **Scenework** editor provides:

- a chapter workspace built from the nine Chapter 1 scenes;
- exact source-passage editing and dialogue selection;
- scene-level approval states and author notes;
- consequence-bearing player dialogue choices;
- a playable-staging workspace for ordered beats, NPC entrances and behavior,
  items and interactables, plus diegetic HUD/Lens events;
- an explicit choice between scrolling HD-2D and static cinematic staging;
- an adaptation ledger for reviewing every change from source;
- browser-local autosave plus YAML and JSON downloads.

The [`chapter-to-game-yaml`](chapter-to-game-yaml/) package provides:

- a Codex skill for extracting canonical chapter content and explicit adaptation
  proposals;
- strict JSON Schemas for chapters, authoring scenes, and runtime scenes;
- semantic and cross-manifest validators;
- a deterministic YAML-to-Unreal-JSON compiler;
- the validated Chapter 1 production artifacts and regression suite.

The author-facing scene document is intentionally separate from the Unreal
runtime manifest. Authoring decisions are reviewed first; runtime beats and
geometry are compiled only after a scene is approved.

## Run the local scene editor

Scenework is a local-only web app. It binds to your computer at
`http://127.0.0.1:3001` and does not require a cloud account or hosted backend.

```bash
pnpm install
pnpm local
```

Open `http://127.0.0.1:3001`.

Edits autosave in that browser's local storage. Export YAML or JSON regularly
if you want portable backups or need to move work between browsers.

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
approval, the skill writes validated scene files to `imports/<CHAPTER_ID>/`.
Use **Import scenes** in Scenework to load them, then make cleanup changes in the
UI.

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
