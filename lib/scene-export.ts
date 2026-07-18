import YAML from "yaml";

import type { SceneDraft } from "./editor-types";

export function toAuthoringDocument(scene: SceneDraft) {
  return {
    schema_version: "0.1.0",
    kind: "scene_authoring",
    chapter_id: scene.id.split("_S")[0],
    scene_id: scene.id,
    title: scene.title,
    status: scene.status,
    presentation: {
      mode: scene.presentationMode,
    },
    player_goal: scene.playerGoal,
    source: {
      excerpt: scene.sourceExcerpt,
    },
    dialogue: scene.dialogue.map((unit) => ({
      id: unit.id,
      speaker: unit.speaker,
      text: unit.text,
      source_locked: unit.sourceLocked,
      approval: unit.status,
      ...(unit.playerChoice
        ? {
            player_choice: {
              id: unit.playerChoice.id,
              prompt: unit.playerChoice.prompt,
              canonical_bounds: unit.playerChoice.canonicalBounds,
              approval: unit.playerChoice.status,
              options: unit.playerChoice.options.map((option) => ({
                id: option.id,
                label: option.label,
                effect: option.effect,
                effect_scopes: option.effectScopes,
              })),
            },
          }
        : {}),
    })),
    story_changes: scene.storyChanges.map((change) => ({
      id: change.id,
      type: change.type,
      canonical: change.canonical,
      proposed: change.proposed,
      rationale: change.rationale,
      approval: change.status,
    })),
    notes: scene.notes,
  };
}

export function toNormalizedDocument(scene: SceneDraft) {
  const authoring = toAuthoringDocument(scene);

  return {
    formatVersion: 1,
    kind: "sceneAuthoring",
    source: {
      schemaVersion: authoring.schema_version,
      chapterId: authoring.chapter_id,
      sceneId: authoring.scene_id,
    },
    review: {
      status: scene.status,
      presentationMode: scene.presentationMode,
      dialogueApproved: scene.dialogue.filter((item) => item.status === "approved")
        .length,
      storyChangesApproved: scene.storyChanges.filter(
        (item) => item.status === "approved",
      ).length,
    },
    authoring,
  };
}

export function sceneToYaml(scene: SceneDraft) {
  return YAML.stringify(toAuthoringDocument(scene), {
    lineWidth: 96,
  });
}

export function sceneToJson(scene: SceneDraft) {
  return JSON.stringify(toNormalizedDocument(scene), null, 2);
}
