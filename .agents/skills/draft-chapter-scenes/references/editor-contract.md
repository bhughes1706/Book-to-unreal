# Scenework authoring contract

Read the current JSON Schema before building:

`chapter-to-game-yaml/schemas/scene_authoring.schema.json`

Treat the schema as authoritative when it differs from this summary.

## Output

Create one YAML document per scene:

`imports/<CHAPTER_ID>/<SCENE_ID>.authoring.yaml`

Use:

- `schema_version: 0.1.0`
- `kind: scene_authoring`
- the approved chapter and scene IDs;
- `status: needs_author_review` for a substantive AI first pass;
- exact source excerpts;
- approved presentation mode and player goal;
- reviewable staging, story changes, and notes.

Do not create runtime manifests or compiled Unreal JSON in this workflow.

## Dialogue

- Preserve source text exactly.
- Use stable `DIALOGUE_` IDs.
- Set extracted source lines to `source_locked: true`.
- Set proposed connective lines to `source_locked: false`.
- Do not invent dialogue unless it is necessary to express an approved proposal.
- Give choices canonical bounds and consequences; never add cosmetic choices
  without an explicit author request.

## Staging resources

Use distinct resource categories:

- `npcs`: characters staged in the scene;
- `interactables`: environmental inspection points, props, transitions, or
  traversal points;
- `items`: personal items, key items, consumables, or documents Grayson can
  retain in inventory;
- `hud_events`: diegetic Lens text and explicitly justified objectives or state
  feedback;
- `beats`: ordered playable or staged moments.

Do not classify a door, chair, drink glass, window, scenery, or traversal point
as an inventory item. Do not make every mentioned object interactive.

## Beat references

Use category-correct targets:

- `interaction` trigger → interactable;
- `item_used` trigger → inventory item;
- `dialogue_complete` trigger → dialogue;
- `beat_completed` trigger → earlier beat;
- `show_hud` action → HUD event;
- `spawn_npc` or `move_npc` action → NPC;
- `give_item` or `update_item` action → inventory item;
- `update_interactable` action → interactable;
- `play_dialogue` action → dialogue.

Use freeform targets only for action or trigger types whose schema and editor
allow them. Keep references stable when revising names.

## Review state

Use `unreviewed` or `needs_discussion` for AI-generated staging decisions.
Never emit `approved` unless the author explicitly approved that exact decision.
Carry approved plan boundaries into the files without silently adding new
story changes.

## Validation

Run the bundled `validate_authoring.py` against every generated scene. Treat
schema errors, duplicate IDs, unresolved typed references, invalid NPC
entrance/exit beats, and forward beat dependencies as blocking.
