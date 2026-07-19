# Review contract

Create a temporary JSON plan for validation, then render the same information in
chat. Do not save the plan under `imports/` before approval.

## Temporary plan shape

Use this structure:

```json
{
  "plan_revision": 1,
  "chapter_id": "CH02",
  "source_sha256": "<ledger sha256>",
  "source_summary": {
    "paragraph_count": 42,
    "word_count": 3100,
    "opening_anchor": "Exact short opening anchor",
    "closing_anchor": "Exact short closing anchor"
  },
  "scenes": [
    {
      "id": "CH02_S01_EXAMPLE",
      "order": 1,
      "title": "Example",
      "source_paragraphs": ["P001", "P002"],
      "presentation_mode": "scrolling_hd2d",
      "player_goal": "Immediate playable purpose",
      "dramatic_purpose": "Why this scene exists",
      "entry_state": "State at scene start",
      "exit_state": "State at scene end",
      "boundary_rationale": "Why this begins and ends here",
      "beats": [
        {
          "id": "BEAT_EXAMPLE",
          "title": "Example beat",
          "source_paragraphs": ["P001"],
          "player_experience": "What the player does, sees, or hears",
          "beat_rationale": "Why this deserves a separate beat",
          "optional": false,
          "basis": "source"
        }
      ]
    }
  ],
  "coverage": [
    {
      "source_paragraphs": ["P001", "P002"],
      "disposition": "direct",
      "scene_id": "CH02_S01_EXAMPLE",
      "anchor": "Exact short source anchor",
      "reason": "How this material is represented"
    }
  ],
  "proposed_changes": [
    {
      "source_paragraphs": ["P010"],
      "canonical": "What the source does",
      "proposed": "What the game first pass would change",
      "rationale": "Why",
      "approval": "needs_discussion"
    }
  ],
  "unresolved_questions": ["Question requiring author judgment"]
}
```

Require:

- one coverage assignment for every ledger paragraph;
- no duplicate coverage assignments;
- scene source paragraphs equal the paragraphs assigned to that scene;
- contiguous scene ranges in source order;
- beat paragraphs belong to their scene;
- `basis` equal to `source`, `inference`, or `proposal`;
- `disposition` equal to `direct`, `condensed`, or `omitted`;
- a null or absent `scene_id` only for omitted material;
- an explicit proposed-change entry for altered canon.

## Chat report

Report in this exact order:

### Chapter read confirmation

State chapter ID, plan revision, SHA-256 prefix, paragraph and word counts, and
opening and closing anchors. Explicitly confirm that the complete ledger was
read.

### Proposed scene map

Use a compact table with order, scene ID/title, paragraph range, presentation,
player goal, and boundary rationale.

### Proposed beats

Group beats by scene. For each beat, give its ID/title, paragraph support,
player experience, rationale, optionality, and basis.

### Condensed or omitted

List every coverage entry with disposition `condensed` or `omitted`. Include
paragraph IDs, anchor, scene destination if any, and reason. Write `None` when
there are none.

### Adaptation proposals

List staging inferences and deliberate changes separately. Include canonical
source behavior, proposal, rationale, and approval need. Write `None` when
there are none.

### Questions for approval

List only decisions that materially change segmentation or authoring output.
Avoid asking questions already answered by project data.

### Coverage check

Report direct, condensed, omitted, total assigned, and total source paragraph
counts. State that validation passed.

End exactly with:

`Awaiting approval — no scene files have been created.`
