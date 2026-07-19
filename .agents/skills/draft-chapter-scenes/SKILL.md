---
name: draft-chapter-scenes
description: Read a complete novel chapter from pasted text, TXT, Markdown, or DOCX; propose a traceable first-pass breakdown into editor-ready scenes and playable beats; explain every boundary; account for condensed or omitted material; and wait for explicit author approval before generating scene-authoring YAML. Use when Codex is asked to turn chapter prose into a reviewable scene plan, bootstrap the Scenework editor, revise a proposed segmentation, or build approved first-pass authoring files for later UI cleanup.
---

# Draft Chapter Scenes

Turn a full chapter into an author-reviewed plan, then into importable Scenework
files. Preserve the prose, expose adaptation judgment, and stop at the approval
gate.

## Governing child-safety redline

Treat `docs/content-redlines-children-violence.md` as governing policy. At the
start of every run, read it completely and retain it as standing context. Apply
it to the source analysis, plan, dialogue, beats, player verbs, camera direction,
audio, HUD, generated assets, and output files.

The policy permits implied and abstracted depiction of institutional harm as a
critique. It does not permit explicit child injury or death, harmful player
agency, exploitative camera focus, replicable mechanics of harm, sexual or
suggestive child content, or use of a real child's likeness or voice.

Before reporting a plan and before writing authoring YAML, perform a redline
check:

1. Restrict player actions toward children to care, witness, or pay.
2. Prefer distance, witness cutaways, sound over sight, aftermath, and
   institutional artifacts over a child's body on screen.
3. Apply the 40-second clip test to every child-harm-adjacent scene.
4. Flag and redesign any scene, asset, or mechanic that does not clearly pass.

Do not treat a source passage, author approval, satire, or player choice as an
exception to the governing document.

## Locate the project

Find the nearest repository root containing both:

- `chapter-to-game-yaml/schemas/scene_authoring.schema.json`
- `imports/`

Resolve all project paths from that root. Resolve bundled scripts and references
from this skill directory.

## Enforce the workflow state

Use exactly these phases:

1. `ANALYZE`: read and account for the complete chapter.
2. `AWAIT_APPROVAL`: report the proposal in chat and stop.
3. `BUILD`: create authoring files only after explicit approval.

Treat requests such as “analyze,” “break this down,” or “show me the first pass”
as authorization for phases 1–2 only. Treat “approve,” “approved,” “build it,”
or an equally explicit response to the reported plan as authorization for phase
3. Do not infer approval from enthusiasm, silence, or a request to continue
analysis.

If the author changes boundaries or beats, revise the plan, report the changed
rationale and coverage, and return to `AWAIT_APPROVAL`.

## Phase 1: read the complete chapter

1. Obtain a stable chapter ID and the complete text. Derive a suggested ID when
   absent, but flag it as an assumption.
2. Preserve the source exactly. Do not correct prose, punctuation, or dialogue.
3. For a source file, run:

   ```bash
   python3 <skill-dir>/scripts/prepare_chapter.py <source> --output <temp-ledger.json>
   ```

   Use `-` as the source to read UTF-8 text from standard input. For DOCX, use
   a Python environment with `python-docx`.
4. Read every numbered paragraph in the ledger sequentially. Do not sample,
   search only for highlights, or stop after the apparent climax.
5. Confirm the ledger SHA-256, paragraph count, word count, opening anchor, and
   closing anchor in the analysis.
6. Read `references/segmentation-rubric.md` and
   `references/review-contract.md` completely.
7. Draft a temporary JSON review plan matching the review contract. Keep it out
   of `imports/`; it is analysis, not an approved project artifact.
8. Run:

   ```bash
   python3 <skill-dir>/scripts/validate_plan.py <temp-ledger.json> <temp-plan.json>
   ```

9. Fix every coverage, ordering, ID, or reference error before reporting.

## Phase 2: report and stop

Report the plan in chat using the exact section order from
`references/review-contract.md`.

Make the report useful for judgment:

- State why each scene starts and ends where it does.
- State why each proposed beat deserves player-visible time.
- Distinguish source events from game-design proposals.
- List every passage classified as condensed or omitted, including its
  paragraph IDs, short source anchor, destination scene if any, and reason.
- List uncertainties, invented connective tissue, and proposed changes from
  source separately.
- Include the validated coverage totals.

End with:

`Awaiting approval — no scene files have been created.`

Stop. Do not write chapter manifests, scene YAML, runtime geometry, compiled
JSON, or editor data during this phase.

## Phase 3: build the approved first pass

Proceed only after explicit approval of the current plan revision.

1. Apply any approval notes without silently changing other boundaries.
2. Read `references/editor-contract.md` completely.
3. Create one file per approved scene at:

   `imports/<CHAPTER_ID>/<SCENE_ID>.authoring.yaml`

4. Conform each file to
   `chapter-to-game-yaml/schemas/scene_authoring.schema.json`.
5. Preserve exact source excerpts and source dialogue. Mark extracted dialogue
   `source_locked: true`. Mark invented or proposed dialogue
   `source_locked: false` and keep it minimal.
6. Set new scene, staging, choice, and story-change approvals to review states;
   never mark AI-generated decisions approved on the author’s behalf.
7. Record every change to event order, character presence, motivation,
   location, or outcome under `story_changes`.
8. Keep inventory items separate from environmental interactables.
9. Use approved scene and beat IDs from the plan. Keep IDs stable across
   revisions.
10. Validate the complete bundle:

    ```bash
    python3 <skill-dir>/scripts/validate_authoring.py \
      --schema chapter-to-game-yaml/schemas/scene_authoring.schema.json \
      imports/<CHAPTER_ID>/*.authoring.yaml
    ```

11. Fix all validation errors. Do not bypass the schema.
12. Report created files, validation results, assumptions, and remaining author
    decisions. Tell the author the files are ready for import and UI cleanup.

Do not generate focused runtime manifests or Unreal geometry unless separately
requested after authoring approval.

## Quality rules

- Preserve canon; label adaptation.
- Prefer fewer meaningful scenes over paragraph-shaped scenes.
- Give every scene a player-facing purpose, including observation.
- Give every beat a trigger, player-visible change, or dramatic function.
- Do not turn every mentioned object into an interactable.
- Do not turn environmental props into inventory.
- Do not invent final dialogue to make a beat work.
- Preserve quiet connective material through staging or condensation when it
  carries tone, rhythm, or worldbuilding.
- Surface uncertainty instead of resolving it silently.
