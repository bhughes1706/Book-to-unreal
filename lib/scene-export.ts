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
    staging: {
      npcs: scene.npcs.map((npc) => ({
        id: npc.id,
        display_name: npc.displayName,
        role: npc.role,
        presence: npc.presence,
        behavior: npc.behavior,
        ...(npc.entranceBeatId
          ? { entrance_beat_id: npc.entranceBeatId }
          : {}),
        ...(npc.exitBeatId ? { exit_beat_id: npc.exitBeatId } : {}),
        staging_notes: npc.stagingNotes,
        approval: npc.status,
      })),
      interactables: scene.interactables.map((interactable) => ({
        id: interactable.id,
        name: interactable.name,
        kind: interactable.kind,
        interaction_prompt: interactable.interactionPrompt,
        outcome: interactable.outcome,
        approval: interactable.status,
      })),
      items: scene.items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        initial_state: item.initialState,
        persistence: item.persistence,
        interaction_prompt: item.interactionPrompt,
        outcome: item.outcome,
        approval: item.status,
      })),
      hud_events: scene.hudEvents.map((event) => ({
        id: event.id,
        channel: event.channel,
        text: event.text,
        trigger: event.trigger,
        dismiss_mode: event.dismissMode,
        duration_seconds: event.durationSeconds,
        ...(event.responses && event.responses.length > 0
          ? {
              responses: event.responses.map((response) => ({
                id: response.id,
                label: response.label,
                outcome: response.outcome,
                ...(response.setFlag ? { set_flag: response.setFlag } : {}),
              })),
            }
          : {}),
        ...(event.eventThreadId
          ? {
              event_thread: {
                id: event.eventThreadId,
                role: event.eventThreadRole || "reference",
                ...(event.eventThreadNote
                  ? { note: event.eventThreadNote }
                  : {}),
              },
            }
          : {}),
        approval: event.status,
      })),
      beats: scene.beats.map((beat) => ({
        id: beat.id,
        title: beat.title,
        trigger: {
          type: beat.triggerType,
          ...(beat.triggerTarget ? { target: beat.triggerTarget } : {}),
        },
        optional: beat.optional,
        ...(beat.eventThreadId
          ? {
              event_thread: {
                id: beat.eventThreadId,
                role: beat.eventThreadRole || "reference",
                ...(beat.eventThreadNote
                  ? { note: beat.eventThreadNote }
                  : {}),
              },
            }
          : {}),
        actions: beat.actions.map((action) => ({
          id: action.id,
          type: action.type,
          ...(action.targetId ? { target_id: action.targetId } : {}),
          detail: action.detail,
        })),
        approval: beat.status,
      })),
    },
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
      staging: {
        npcsApproved: scene.npcs.filter((item) => item.status === "approved")
          .length,
        interactablesApproved: scene.interactables.filter(
          (item) => item.status === "approved",
        ).length,
        itemsApproved: scene.items.filter((item) => item.status === "approved")
          .length,
        hudEventsApproved: scene.hudEvents.filter(
          (item) => item.status === "approved",
        ).length,
        beatsApproved: scene.beats.filter((item) => item.status === "approved")
          .length,
      },
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
