# Scenework authoring contract

Read the current JSON Schema before building:

`chapter-to-game-yaml/novel_manifest/schemas/scene_authoring.schema.json`

Treat the schema as authoritative when it differs from this summary.

## Output

Create one YAML document per scene:

`imports/<BOOK_SLUG>/<CHAPTER_ID>/<SCENE_ID>.authoring.yaml`

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
- Use stable speaker-owned IDs:
  - `<SPEAKER>_DIALOGUE_<CADENCE>` for spoken lines;
  - `GRAYSON_MONOLOGUE_<CADENCE>` for Grayson's internal narration.
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

## ID cadence

IDs are opaque to presentation but essential for traceability. Use uppercase
snake case and keep accepted IDs stable across revisions.

- dialogue: `<SPEAKER>_DIALOGUE_<CADENCE>`;
- Grayson internal text: `GRAYSON_MONOLOGUE_<CADENCE>`;
- Lens/HUD: `LENS_<CHANNEL>_<CADENCE>`;
- Grayson inventory: `GRAYSON_ITEM_<CADENCE>`;
- world interaction: `WORLD_INTERACT_<CADENCE>`;
- NPC: `NPC_<NAME_OR_ROLE>`;
- beat: `BEAT_<SCENE_CADENCE>`;
- cross-scene thread: `EVENT_<CADENCE>`.

Cadence is a short semantic phrase, not a serial number alone. Do not rename an
existing valid ID merely to improve style.

## Event threads

Use the same `EVENT_…` ID on beats and HUD events that form a meaningful
cross-scene setup, escalation, callback, choice, consequence, or resolution.
Assign the closest supported role and a short note explaining the link.

Do not thread ordinary chronology. A thread should answer, “What cause or
promise is this occurrence carrying across scene boundaries?”

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
