# Scenework YAML pipeline

Scenework is one local authoring app with two connected workspaces. Story owns
what happens. Layout owns where and how the approved story is blocked out.

The current pipeline stops at YAML:

```text
complete chapter prose
        ↓  $draft-chapter-scenes + author approval
<SCENE_ID>.authoring.yaml
        ↓  Story cleanup and approval in Scenework
        ↓  $draft-scene-blockout + author approval, or manual Layout start
<SCENE_ID>.scene.yaml
        ↓
future compilation and Unreal import (not implemented by this editor work)
```

## Ownership

| Concern | Story / `.authoring.yaml` | Layout / `.scene.yaml` |
| --- | --- | --- |
| Source passage and adaptation | Owns | References only |
| Dialogue and player choices | Owns | Mirrors IDs only |
| Beats and event threads | Owns | Binds exact IDs |
| NPC, item, interactable, HUD definitions | Owns | Places spatial resources |
| Dimensions and playable bounds | — | Owns |
| Camera and framing | Narrative intent only | Owns blockout values |
| Coordinates and movement paths | — | Owns |
| Graybox geometry and placeholder assets | — | Owns |
| Review status | Story approval | Layout approval |

An upstream concern is never repaired downstream. A story problem goes back to
Story; a spatial problem goes back to Layout.

## One editor, two files

The workspaces are tabs in the same scene editor. Layout reads the Story state
directly, so there is no second application and no manual copying.

Creating a starter blockout:

1. calculates the SHA-256 of the current canonical Story document;
2. creates a player start and placements for NPCs, interactables, transitions,
   and visible inventory items;
3. proposes dimensions, a camera, a graybox floor, names, assets, and acceptance
   tests;
4. keeps every value editable in Layout;
5. exports a separate `<SCENE_ID>.scene.yaml`.

Both authoring and layout YAML can be imported through **Import YAML**.

## Change-ripple rule

Every Layout document records:

```yaml
source_authoring:
  path: imports/buzzing-electric/CH01/CH01_S01_EXAMPLE.authoring.yaml
  sha256: <canonical authoring SHA-256>
```

When Story changes, its current hash no longer matches the hash stored in
Layout. Scenework marks the scene and Layout tab **stale**. Chapter navigation
also reports stale counts.

**Merge story changes** performs a preservation-first downstream merge:

- current Story bindings replace copied Story bindings;
- hand-placed coordinates, geometry, paths, camera, dimensions, assets, and
  Layout notes remain unchanged;
- new Story resources get starter placements and review items;
- removed Story resources remain visible as orphans;
- missing beat/resource bindings become explicit merge review items;
- the stored upstream hash updates;
- an approved Layout returns to `needs_review`.

Layout approval is unavailable while its Story hash is stale or merge review
items remain. Scene checks also catch missing spatial resources, orphan
bindings, invalid paths, missing player starts, and out-of-bounds placements.

## AI approval gates

`$draft-chapter-scenes` reads the complete chapter, accounts for every passage,
proposes scenes, beats, and event threads, explains boundaries and omissions,
and stops before file creation. After approval, it writes Story YAML.

`$draft-scene-blockout` reads one complete approved Story scene plus any
existing Layout YAML, proposes the visual blockout and merge report, and stops
before file creation. After approval, it creates or merges Layout YAML.

Neither skill may mark its generated decisions approved for the author.

## Deleting a chapter or a book

Scenework's browser storage and a book's exported files are two separate
things by design. **Delete book** in the editor clears that book from browser
localStorage only; it has no filesystem access and never touches disk. A
book's actual portable artifacts — Story and Layout YAML alike, for every
chapter — live in exactly one place, `imports/<BOOK_SLUG>/<CHAPTER_ID>/`, so
removing them from disk is a single, explicit, separate step:
`python3 scripts/delete_chapter.py <BOOK_SLUG> <CHAPTER_ID>` for one chapter,
or `python3 scripts/delete_chapter.py <BOOK_SLUG>` for the whole book. Nothing
else in the repository should hold chapter-scoped authoring or layout files; a
second location is a sign something wrote to the wrong place.

## Scale across 36 chapters

Stable IDs and hashes make a scene the unit of iteration. Revising one scene
does not invalidate an unrelated scene. The scene rail shows whether a Layout
exists, highlights stale Layouts, and summarizes stale counts by chapter.

Export portable YAML regularly. Browser-local autosave is convenient working
state, not the long-term source repository.

## Current scope boundary

The generic editor Layout document uses `schema_version: 0.3.0` and
`kind: scene_manifest`. Its current contract is documented in
`.agents/skills/draft-scene-blockout/references/layout-contract.md`.

This work does not modify the existing legacy compiler, its v0.2 prototype
schema, any JSON output contract, or Unreal code. A future compiler must consume
the approved Story and Layout layers without changing their ownership model.
