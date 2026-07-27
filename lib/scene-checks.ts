import type { SceneDraft } from "./editor-types";
import {
  actionLabels,
  hudChannelLabels,
  triggerLabels,
  type StagingSelection,
} from "./staging-model";
import { truncate } from "./text";

/** Workspace tab a check result points at. A subset of the editor's tabs. */
export type SceneCheckTab = "source" | "dialogue" | "staging" | "layout";

export interface CheckIssue {
  key: string;
  location: string;
  message: string;
  tab: SceneCheckTab;
  staging?: StagingSelection;
  anchorId?: string;
}

/**
 * Validate a scene end to end and return one issue per problem found, each
 * tagged with the tab and anchor needed to jump straight to it. Pure: it reads
 * only the scene and its current authoring hash and returns findings; callers
 * own presenting them.
 */
export function runSceneChecks(
  scene: SceneDraft,
  authoringHash: string | undefined,
): CheckIssue[] {
  const found: CheckIssue[] = [];
  const push = (issue: Omit<CheckIssue, "key">) =>
    found.push({ key: String(found.length), ...issue });

  if (!scene.sourceExcerpt.trim()) {
    push({
      location: "Source",
      message:
        "The source passage is empty — paste the passage this scene adapts.",
      tab: "source",
    });
  }
  if (!scene.playerGoal.trim()) {
    push({
      location: "Scene settings",
      message:
        "No player goal yet — describe what the player is trying to do (right-hand panel).",
      tab: "source",
    });
  }

  scene.dialogue.forEach((dialogue, dialogueIndex) => {
    const line =
      truncate(dialogue.text, 36) || `Dialogue ${dialogueIndex + 1}`;
    if (!dialogue.speaker.trim()) {
      push({
        location: "Dialogue",
        message: `“${line}” has no speaker.`,
        tab: "dialogue",
        anchorId: dialogue.id,
      });
    }
    if (dialogue.playerChoice) {
      if (dialogue.playerChoice.options.length < 2) {
        push({
          location: "Dialogue",
          message: `The choice “${truncate(dialogue.playerChoice.prompt, 40)}” needs at least two options.`,
          tab: "dialogue",
          anchorId: dialogue.id,
        });
      }
      dialogue.playerChoice.options.forEach((option) => {
        if (!option.effect.trim() || option.effectScopes.length === 0) {
          push({
            location: "Dialogue",
            message: `Option “${truncate(option.label, 32)}” needs a written consequence and at least one effect scope.`,
            tab: "dialogue",
            anchorId: dialogue.id,
          });
        }
      });
    }
  });

  if (scene.beats.length === 0) {
    push({
      location: "Staging",
      message:
        "No beats yet — add at least one beat so the scene is playable.",
      tab: "staging",
    });
  }
  const beatIds = new Set(scene.beats.map((beat) => beat.id));
  const npcIds = new Set(scene.npcs.map((npc) => npc.id));
  const itemIds = new Set(scene.items.map((item) => item.id));
  const interactableIds = new Set(
    scene.interactables.map((interactable) => interactable.id),
  );
  const hudIds = new Set(scene.hudEvents.map((event) => event.id));
  const dialogueIds = new Set(
    scene.dialogue.map((dialogue) => dialogue.id),
  );

  scene.npcs.forEach((npc) => {
    const name = npc.displayName.trim() || npc.id;
    const focus: StagingSelection = { kind: "npc", id: npc.id };
    if (!npc.displayName.trim() || !npc.role.trim()) {
      push({
        location: "Staging · NPCs",
        message: `${name} needs a display name and a story role.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (npc.presence === "enters_on_beat" && !npc.entranceBeatId) {
      push({
        location: "Staging · NPCs",
        message: `${name} is set to enter mid-scene, but no entrance beat is chosen.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (
      (npc.entranceBeatId && !beatIds.has(npc.entranceBeatId)) ||
      (npc.exitBeatId && !beatIds.has(npc.exitBeatId))
    ) {
      push({
        location: "Staging · NPCs",
        message: `${name} points at an entrance or exit beat that no longer exists.`,
        tab: "staging",
        staging: focus,
      });
    }
  });

  scene.items.forEach((item) => {
    if (!item.name.trim() || !item.outcome.trim()) {
      push({
        location: "Staging · Items",
        message: `${item.name.trim() || item.id} needs a name and an interaction outcome.`,
        tab: "staging",
        staging: { kind: "item", id: item.id },
      });
    }
  });

  scene.interactables.forEach((interactable) => {
    if (!interactable.name.trim() || !interactable.outcome.trim()) {
      push({
        location: "Staging · Interactables",
        message: `${interactable.name.trim() || interactable.id} needs a name and an interaction outcome.`,
        tab: "staging",
        staging: { kind: "interactable", id: interactable.id },
      });
    }
  });

  scene.hudEvents.forEach((event) => {
    const name = `The ${hudChannelLabels[event.channel].toLowerCase()} HUD event`;
    const focus: StagingSelection = { kind: "hud", id: event.id };
    if (!event.text.trim() || !event.trigger.trim()) {
      push({
        location: "Staging · HUD",
        message: `${name} needs on-screen text and an author-facing trigger.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (event.dismissMode === "timed" && event.durationSeconds <= 0) {
      push({
        location: "Staging · HUD",
        message: `${name} is timed but has no duration in seconds.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (event.responses && event.responses.length === 1) {
      push({
        location: "Staging · HUD",
        message: `${name} has only one player response — add another response or make it informational.`,
        tab: "staging",
        staging: focus,
      });
    }
    event.responses?.forEach((response, responseIndex) => {
      if (!response.label.trim() || !response.outcome.trim()) {
        push({
          location: "Staging · HUD",
          message: `${name}, response ${responseIndex + 1}, needs a label and an outcome.`,
          tab: "staging",
          staging: focus,
        });
      }
    });
  });

  scene.beats.forEach((beat, beatIndex) => {
    const name = `Beat ${beatIndex + 1} “${truncate(beat.title, 30) || beat.id}”`;
    const focus: StagingSelection = { kind: "beat", id: beat.id };
    if (!beat.title.trim()) {
      push({
        location: "Staging · Beats",
        message: `Beat ${beatIndex + 1} has no title.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (beat.triggerType !== "begin_play" && !beat.triggerTarget.trim()) {
      push({
        location: "Staging · Beats",
        message: `${name} triggers on “${triggerLabels[beat.triggerType].toLowerCase()}” but has no target — pick what it reacts to.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (
      beat.triggerType === "beat_completed" &&
      beat.triggerTarget.trim() &&
      !beatIds.has(beat.triggerTarget)
    ) {
      push({
        location: "Staging · Beats",
        message: `${name} waits for a beat that doesn't exist anymore.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (
      beat.triggerType === "interaction" &&
      beat.triggerTarget.trim() &&
      !interactableIds.has(beat.triggerTarget)
    ) {
      push({
        location: "Staging · Beats",
        message: `${name} waits for an interactable that doesn't exist anymore.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (
      beat.triggerType === "item_used" &&
      beat.triggerTarget.trim() &&
      !itemIds.has(beat.triggerTarget)
    ) {
      push({
        location: "Staging · Beats",
        message: `${name} waits for an inventory item that doesn't exist anymore.`,
        tab: "staging",
        staging: focus,
      });
    }
    if (beat.actions.length === 0) {
      push({
        location: "Staging · Beats",
        message: `${name} has no actions — add what happens.`,
        tab: "staging",
        staging: focus,
      });
    }
    beat.actions.forEach((action, actionIndex) => {
      const actionName = `${name}, action ${actionIndex + 1} (${actionLabels[action.type]})`;
      if (!action.detail.trim()) {
        push({
          location: "Staging · Beats",
          message: `${actionName} has no direction text.`,
          tab: "staging",
          staging: focus,
        });
      }
      const targetExists =
        action.type === "show_hud"
          ? hudIds.has(action.targetId)
          : action.type === "spawn_npc" || action.type === "move_npc"
            ? npcIds.has(action.targetId)
            : action.type === "give_item" || action.type === "update_item"
              ? itemIds.has(action.targetId)
              : action.type === "update_interactable"
                ? interactableIds.has(action.targetId)
                : action.type === "play_dialogue"
                  ? dialogueIds.has(action.targetId)
                  : true;
      if (!targetExists) {
        push({
          location: "Staging · Beats",
          message: action.targetId
            ? `${actionName} targets “${action.targetId}”, which doesn't exist in this scene.`
            : `${actionName} needs a target.`,
          tab: "staging",
          staging: focus,
        });
      }
    });
  });

  const layout = scene.layout;
  const currentAuthoringHash = authoringHash;
  if (!layout) {
    if (scene.status === "approved" || scene.status === "locked") {
      push({
        location: "Layout",
        message:
          "The story is approved, but this scene has no spatial layout YAML yet.",
        tab: "layout",
      });
    }
  } else {
    if (
      currentAuthoringHash &&
      layout.upstreamAuthoringHash !== currentAuthoringHash
    ) {
      push({
        location: "Layout · Change ripple",
        message:
          "The authoring YAML changed after this layout was created. Merge story changes before layout approval.",
        tab: "layout",
      });
    }
    if (layout.mergeConflicts.length > 0) {
      push({
        location: "Layout · Merge review",
        message: `${layout.mergeConflicts.length} merge review item${
          layout.mergeConflicts.length === 1 ? " remains" : "s remain"
        } unresolved.`,
        tab: "layout",
      });
    }
    if (!layout.levelName.trim() || !layout.outputPath.trim()) {
      push({
        location: "Layout · Level",
        message:
          "The layout needs both a level name and future content output path.",
        tab: "layout",
      });
    }
    if (
      layout.dimensions.lengthM <= 0 ||
      layout.dimensions.widthM <= 0 ||
      layout.dimensions.heightM <= 0
    ) {
      push({
        location: "Layout · Bounds",
        message: "Every scene dimension must be greater than zero.",
        tab: "layout",
      });
    }
    if (
      !layout.placements.some(
        (placement) => placement.kind === "player_start",
      )
    ) {
      push({
        location: "Layout · Placements",
        message: "No player-start placement exists.",
        tab: "layout",
      });
    }

    const requiredSpatialIds = new Set([
      ...scene.npcs.map((npc) => npc.id),
      ...scene.interactables.map((interactable) => interactable.id),
      ...scene.items
        .filter((item) => item.initialState === "visible")
        .map((item) => item.id),
    ]);
    const placedSourceIds = new Set(
      layout.placements.map((placement) => placement.sourceId),
    );
    requiredSpatialIds.forEach((sourceId) => {
      if (!placedSourceIds.has(sourceId)) {
        push({
          location: "Layout · Story bindings",
          message: `${sourceId} has spatial presence in Story but no layout placement.`,
          tab: "layout",
        });
      }
    });

    layout.placements.forEach((placement) => {
      if (placement.orphaned) {
        push({
          location: "Layout · Story bindings",
          message: `${placement.label} is orphaned from its Story resource.`,
          tab: "layout",
        });
      }
      if (placement.beatId && !beatIds.has(placement.beatId)) {
        push({
          location: "Layout · Beat bindings",
          message: `${placement.label} points to a beat that no longer exists.`,
          tab: "layout",
        });
      }
      const activeAxis =
        scene.presentationMode === "static_cinematic"
          ? placement.yM
          : placement.zM;
      const activeAxisLimit =
        scene.presentationMode === "static_cinematic"
          ? layout.dimensions.widthM
          : layout.dimensions.heightM;
      if (
        placement.xM < 0 ||
        placement.xM > layout.dimensions.lengthM ||
        activeAxis < 0 ||
        activeAxis > activeAxisLimit
      ) {
        push({
          location: "Layout · Bounds",
          message: `${placement.label} is outside the visible scene bounds.`,
          tab: "layout",
        });
      }
    });

    layout.paths.forEach((path) => {
      if (path.points.length < 2) {
        push({
          location: "Layout · Paths",
          message: `${path.id} needs at least two route points.`,
          tab: "layout",
        });
      }
      if (path.sourceId && !npcIds.has(path.sourceId)) {
        push({
          location: "Layout · Paths",
          message: `${path.id} is bound to an NPC that no longer exists.`,
          tab: "layout",
        });
      }
      if (path.beatId && !beatIds.has(path.beatId)) {
        push({
          location: "Layout · Paths",
          message: `${path.id} points to a beat that no longer exists.`,
          tab: "layout",
        });
      }
    });

    if (
      layout.status === "layout_approved" &&
      scene.status !== "approved" &&
      scene.status !== "locked"
    ) {
      push({
        location: "Layout · Approval",
        message:
          "Layout is approved while the upstream story is still under review.",
        tab: "layout",
      });
    }
  }

  return found;
}
