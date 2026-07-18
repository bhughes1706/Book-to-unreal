# Changelog

## 0.2.0

- Added approved author directives with explicit scope and provenance.
- Defined consequential dialogue-choice policy while leaving the final state model deferred.
- Added per-scene `choice_points` with canonical bounds, effect scopes, approval, and implementation status.
- Defined the Lens as the primary diegetic player interface.
- Added spoiler-safe identity and later-reveal handling.
- Marked the three Chapter 1 author questions answered.
- Added a deferred full-game dialogue-state architecture question.
- Extended validation for directive references, choice-to-beat references, answered questions, and required choice effects.

## 0.3.0

- Delayed Noah's adaptation debut until Grayson arrives at the reading venue.
- Removed Noah from the beach, dike walkway, and route-to-venue gameplay sequences.
- Added explicit approved source-departure records to the affected scenes.
- Updated the focused dike scene so Grayson exits alone after the boy disappears.
- Marked Noah's first adaptation scene as `CH01_S04_BOOK_READING`.

## 0.4.0

- Added installable `novel-manifest` Python package and repository-local CLI.
- Added strict focused-scene JSON Schema.
- Converted the Chapter 1 dike YAML into a compiler-ready scene manifest.
- Added schema, semantic, resource, beat, event, and cross-manifest validation.
- Added deterministic YAML-to-JSON compilation with Unreal centimeter normalization.
- Added canonical source hashing for editor change detection.
- Added nine regression tests and a compiled dike-scene fixture.
- Replaced the legacy chapter validator internals with the shared validation library.
- Added compiler contract and updated package documentation.
