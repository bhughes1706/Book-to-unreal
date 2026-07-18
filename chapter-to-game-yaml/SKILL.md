---
name: chapter-to-game-yaml
description: Convert novel chapter text or DOCX files into traceable, production-oriented game YAML manifests, validate chapter and focused-scene manifests, and compile approved focused scenes into deterministic Unreal-facing JSON. Use when Codex needs to extract canon and adaptation proposals from a book chapter, segment a chapter into playable scenes, preserve source anchors and author directives, prepare a scene for Unreal automation, or diagnose chapter/scene manifest validation errors.
---

# Chapter → Game YAML

## Purpose

Convert one novel chapter into a traceable, production-oriented YAML manifest for a narrative game. The manifest must preserve what is canonical in the source while keeping game-design proposals explicitly separate.

This skill is designed to be repeated chapter by chapter and later invoked from an editor agent, Unreal MCP tool, CLI, or CI pipeline.

## Inputs

Required:

- Full chapter text, or extracted text from a `.docx` file.
- Stable chapter ID such as `CH01`.
- Source filename.

Optional:

- Existing project manifest containing known characters, locations, environment kits, world systems, author directives, interface rules, and naming conventions.
- Approved adaptation decisions from the author.
- Target genre, camera model, and gameplay constraints.

## Output

Return exactly one YAML document conforming to:

`schemas/chapter_manifest.schema.json`

Chapter schema version in this package: `0.1.0`. Focused scene schema version: `0.2.0`.

Do not wrap the YAML in Markdown fences when the output will be consumed by a tool.

## Output layout

Store production artifacts by stable chapter ID:

```text
chapters/
└── CH01/
    ├── CH01.manifest.yaml
    ├── source/
    │   ├── Ch1.extracted.txt
    │   └── Ch1.source.json
    ├── scenes/
    │   └── CH01_S01_DikeBeach.scene.yaml
    └── compiled/
        └── CH01_S01_DikeBeach.compiled.json
```

Keep focused scenes in `scenes/`, compiled Unreal-facing data in `compiled/`, and source extraction artifacts in `source/`. Resolve each focused scene's `source_manifest` relative to the scene file, such as `../CH01.manifest.yaml`.

## Non-negotiable rules

1. **Preserve canon.** Do not silently rewrite the chapter.
2. **Separate fact from proposal.** Put source-supported material under `canonical`; put game-design interpretation under `adaptation`.
3. **Record deliberate changes.** Every adaptation that changes order, staging, character presence, location, motivation, or outcome must appear in `changes_from_source`.
4. **Use source anchors.** Every scene must include short start and end text anchors that can be located in the chapter.
5. **Do not invent missing proper nouns.** Use a stable descriptive ID and add an unresolved question.
6. **Prefer reusable kits.** Classify assets as `kit`, `shared`, or `unique`.
7. **Do not over-segment.** Split scenes when at least one of these changes materially: location, time, player objective, dramatic purpose, controllable state, or transition mode.
8. **Do not under-segment.** A long passage with a new gameplay loop or production environment should become a new scene even if prose flows continuously.
9. **Use stable IDs.** IDs are uppercase snake case and must remain stable across revisions.
10. **Express uncertainty.** Use `confidence` and `unresolved_questions`; never conceal ambiguity.
11. **Flag sensitive material.** Record content that affects presentation, ratings, accessibility, or player safety under `content_notes` without moralizing or rewriting it.
12. **No final dialogue rewrite.** Extract dialogue functions and candidate lines, but do not replace the author's final narrative writing unless separately requested.
13. **Preserve author directives.** Carry approved project canon, interface decisions, and game-design rules forward into every later chapter. Do not re-ask resolved questions.
14. **Use spoiler-safe identity labels.** When a character is unnamed in the current chapter but named later, preserve a stable descriptive ID and current display label until the approved reveal point.
15. **Make dialogue consequences explicit.** Every proposed dialogue choice must declare `consequence_required`, intended `effect_scopes`, canonical bounds, and implementation status.
16. **Classify interface information.** Record whether player-facing information is diegetic, non-diegetic, or an accessibility exception; do not invent a conventional HUD when an approved in-world interface exists.

## Stable ID conventions

- Chapter: `CH01`
- Scene: `CH01_S01_DIKE_BEACH`
- Character: `CHAR_GRAYSON_OCHS`
- Location: `LOC_OSAKA_DIKE_BEACH`
- Environment kit: `KIT_COASTAL_INFRASTRUCTURE`
- World system: `SYS_LIFE_BRACELET`
- Asset: `AST_DIKE_WALL_MODULE_A`
- Narrative beat: `BEAT_OPENING_STILLNESS`

When a source does not name an entity, create a descriptive stable ID such as `CHAR_WHISKEY_WOMAN` and preserve the absence of a canonical name.

## Workflow

### 1. Normalize the source

- Preserve paragraph order.
- Normalize obvious encoding artifacts only when they are unambiguous.
- Do not correct prose or grammar as part of extraction.
- Compute or receive source metadata where available.

### 2. Apply approved project directives

Before extracting the chapter:

- Load all existing `author_directives`.
- Preserve project-canon reveal timing and spoiler-safe labels.
- Apply the approved dialogue-choice and player-interface policies.
- Do not convert an answered project question back to `open`.
- If a later chapter supersedes a directive, preserve history and mark the old directive `superseded`; never silently replace it.

### 3. Extract canonical entities

Identify:

- characters
- locations
- world systems and institutions
- important props and technologies
- recurring visual motifs
- content notes

For each entity, include concise canonical facts and confidence.

### 4. Segment the chapter

Create ordered scenes. For each scene record:

- location and time
- characters present
- source anchors
- canonical events
- narrative function
- entrance and exit state

### 5. Propose game adaptation

For each scene propose:

- player role and immediate goal
- camera and spatial model
- gameplay beats
- interactions
- scripted events
- audio, lighting, and VFX direction
- transitions
- changes from source

The adaptation is a proposal, not canon.

### 6. Build the production breakdown

Classify requirements into:

- reusable environment kits
- shared game assets
- scene-unique hero assets
- systems and code dependencies
- risk and unknowns

### 7. Validate internally

Before returning YAML, check:

- IDs are unique.
- All references resolve.
- Scene order is continuous.
- Source anchors are present in the chapter.
- Canonical and adaptation data are not mixed.
- Every source change is declared.
- Every scene has a player-facing purpose, even if the purpose is observation.
- No asset is listed as unique when it clearly belongs to a reusable kit.

## Scene splitting heuristic

Start a new scene when one or more are true:

- The physical production location changes.
- The camera or traversal model changes substantially.
- Control shifts between gameplay, performance, transit, or cinematic interaction.
- The dramatic question changes.
- A new reusable environment kit is required.
- A transition would likely require loading, streaming, or a new level instance.

Do not create a new scene solely because a new paragraph begins.

## Adaptation-change examples

Source canon:

- Noah is already sitting beside Grayson before the boy appears.

Approved game proposal:

- Grayson begins alone.
- The player explores in silence.
- The boy runs through.
- Grayson continues alone through the dike and route-to-venue scenes.
- Noah first appears when Grayson reaches the reading venue.

Required manifest entry:

```yaml
changes_from_source:
  - type: character_entry_order
    canonical: Noah is present before the boy appears and accompanies Grayson to the venue.
    proposed: Noah is absent until Grayson reaches the reading venue.
    rationale: Preserve the opening isolation and make Noah's arrival a clear emotional shift.
    approval: approved_by_author
```

## Output quality bar

A good manifest should allow another developer—or an Unreal editor tool—to answer:

- What happens?
- What is canon?
- What is an adaptation choice?
- What does the player do?
- Which assets are reusable?
- Which assets are unique?
- What systems are required?
- What is still unknown?
- How can the result be traced back to the chapter?


## Dialogue-choice policy

When dialogue choices are enabled:

- Do not assume a choice must create an immediate branch. A choice can preserve the canonical event sequence while changing relationship state, self-definition, public perception, resources, scene variation, or later narrative access.
- Add each candidate choice under `adaptation.choice_points`.
- Use `approval: needs_discussion` for specific choice designs not yet approved by the author.
- Use `implementation_status: deferred` when the project has approved consequences in principle but has not defined persistent variables or thresholds.
- Never present multiple options that write no state unless the author explicitly approves a cosmetic choice.

## Diegetic-interface policy

When a project defines a primary in-world interface such as the Lens:

- Treat it as a world system and as an operational player-interface policy.
- List the information channels it exposes.
- Add scene dependencies when the interface displays translation, payments, mail, messages, news, state notifications, or contextual data.
- Keep pause, settings, accessibility, and debug UI explicitly classified as exceptions rather than pretending they exist in the fiction.
- Do not overload quiet scenes with interface elements merely because the system exists.

## Scene authoring

Use `schemas/scene_authoring.schema.json` for the author-facing scene editor. Keep this document focused on decisions an author can review:

- exact source excerpts and source-locked dialogue
- proposed dialogue kept visibly separate from source text
- scene approval state
- `scrolling_hd2d` or `static_cinematic` presentation
- player choices with canonical bounds, consequences, and effect scopes
- declared story changes with rationale and approval

Treat the chapter manifest as the ordered collection of scenes. Do not add Unreal geometry or executable runtime actions to the authoring document. Convert an approved authoring scene into a focused runtime scene as a separate compilation step.

## Focused scene compilation

After an author approves a chapter scene, create a focused scene YAML conforming to `schemas/scene_manifest.schema.json`. Preserve creative constraints and approved changes at the top level, and put only machine-executable setup under `runtime`.

The runtime section must define:

- level output and reusable kit IDs
- camera settings
- player spawn and abilities
- placeholder environment dimensions
- markers, actors, paths, interactables, Lens content, and audio
- ordered beats with typed triggers and actions

Validate and compile with:

```bash
python tools/novel_manifest.py validate path/to/scene.yaml
python tools/novel_manifest.py compile path/to/scene.yaml --output path/to/scene.compiled.json
```

Do not let an AI agent bypass the schema by directly constructing arbitrary Unreal actors. The compiled JSON is the approved automation boundary.
