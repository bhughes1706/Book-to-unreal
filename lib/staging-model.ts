import type {
  BeatActionType,
  BeatTriggerType,
  EventThreadRole,
  HudChannel,
  HudDismissMode,
  NpcBehavior,
  NpcPresence,
  SceneBeat,
  SceneDraft,
  SceneInteractable,
  SceneInteractableKind,
  SceneItem,
  SceneItemKind,
  SceneItemPersistence,
  SceneItemState,
  SceneNpc,
  HudEvent,
} from "./editor-types";

export const triggerLabels: Record<BeatTriggerType, string> = {
  begin_play: "Scene begins",
  interaction: "World object used",
  item_used: "Inventory item used",
  dialogue_complete: "Dialogue completes",
  player_enters: "Player enters area",
  timer: "Timer elapses",
  event: "Event fires",
  beat_completed: "Beat completes",
};

export const actionLabels: Record<BeatActionType, string> = {
  show_hud: "Show HUD / Lens",
  spawn_npc: "Spawn NPC",
  move_npc: "Move NPC",
  give_item: "Give inventory item",
  update_item: "Update inventory item",
  update_interactable: "Update interactable",
  play_dialogue: "Play dialogue",
  play_audio: "Play audio",
  camera: "Camera direction",
  unlock_exit: "Unlock exit",
  set_flag: "Set story flag",
  custom: "Custom direction",
};

export const presenceLabels: Record<NpcPresence, string> = {
  present_at_start: "Present at start",
  enters_on_beat: "Enters on beat",
  conditional: "Conditional",
};

export const behaviorLabels: Record<NpcBehavior, string> = {
  stationary: "Stationary",
  idle: "Ambient idle",
  follow_player: "Follow player",
  follow_path: "Follow path",
  scripted: "Scripted sequence",
};

export const itemKindLabels: Record<SceneItemKind, string> = {
  personal_item: "Personal item",
  key_item: "Key item",
  consumable: "Consumable",
  document: "Document or clue",
};

export const itemStateLabels: Record<SceneItemState, string> = {
  visible: "Available to collect",
  hidden: "Not yet available",
  held: "Starts in inventory",
};

export const persistenceLabels: Record<SceneItemPersistence, string> = {
  scene: "Until scene ends",
  chapter: "Across chapter",
};

export const interactableKindLabels: Record<SceneInteractableKind, string> = {
  inspection: "Inspection point",
  prop: "Interactive prop",
  transition: "Scene transition",
  traversal: "Traversal point",
};

export const hudChannelLabels: Record<HudChannel, string> = {
  internal_observation: "Internal observation",
  message: "Message",
  news: "News",
  translation: "Translation",
  system_notification: "System notification",
  objective: "Objective",
  item_reveal: "Item reveal",
  choice_consequence: "Choice consequence",
};

export const dismissLabels: Record<HudDismissMode, string> = {
  timed: "Timed",
  player_dismiss: "Player dismisses",
  beat_advance: "Until next beat",
  persistent: "Persistent",
};

export const eventThreadRoleLabels: Record<EventThreadRole, string> = {
  setup: "Setup",
  escalation: "Escalation",
  callback: "Callback",
  choice: "Player choice",
  consequence: "Consequence",
  resolution: "Resolution",
  reference: "Reference",
};

export type ResourceKind =
  | "npc"
  | "item"
  | "interactable"
  | "hud"
  | "dialogue"
  | "beat";

/** A selected staging resource, used to focus the staging editor on it. */
export interface StagingSelection {
  kind: "beat" | "npc" | "interactable" | "item" | "hud";
  id: string;
}

export interface CatalogEntry {
  id: string;
  kind: ResourceKind;
  label: string;
}

export function buildCatalog(scene: SceneDraft): CatalogEntry[] {
  return [
    ...scene.npcs.map((npc) => ({
      id: npc.id,
      kind: "npc" as const,
      label: npc.displayName,
    })),
    ...scene.items.map((item) => ({
      id: item.id,
      kind: "item" as const,
      label: item.name,
    })),
    ...scene.interactables.map((interactable) => ({
      id: interactable.id,
      kind: "interactable" as const,
      label: interactable.name,
    })),
    ...scene.hudEvents.map((event) => ({
      id: event.id,
      kind: "hud" as const,
      label: hudChannelLabels[event.channel],
    })),
    ...scene.dialogue.map((dialogue) => ({
      id: dialogue.id,
      kind: "dialogue" as const,
      label: dialogue.speaker,
    })),
    ...scene.beats.map((beat) => ({
      id: beat.id,
      kind: "beat" as const,
      label: beat.title,
    })),
  ];
}

export function resolveEntry(catalog: CatalogEntry[], id: string) {
  if (!id) return undefined;
  return catalog.find((entry) => entry.id === id);
}

/** The resource kind an action's target must resolve to; null means freeform. */
export const actionTargetKind: Record<BeatActionType, ResourceKind | null> = {
  show_hud: "hud",
  spawn_npc: "npc",
  move_npc: "npc",
  give_item: "item",
  update_item: "item",
  update_interactable: "interactable",
  play_dialogue: "dialogue",
  play_audio: null,
  camera: null,
  unlock_exit: null,
  set_flag: null,
  custom: null,
};

export const triggerTargetKind: Record<BeatTriggerType, ResourceKind | null> = {
  begin_play: null,
  interaction: "interactable",
  item_used: "item",
  dialogue_complete: "dialogue",
  player_enters: null,
  timer: null,
  event: null,
  beat_completed: "beat",
};

export const actionTargetPlaceholder: Record<BeatActionType, string> = {
  show_hud: "HUD event",
  spawn_npc: "NPC",
  move_npc: "NPC",
  give_item: "Inventory item",
  update_item: "Inventory item",
  update_interactable: "Interactable",
  play_dialogue: "Dialogue line",
  play_audio: "Audio cue",
  camera: "Shot or subject",
  unlock_exit: "Exit name",
  set_flag: "Flag name",
  custom: "Target (optional)",
};

export function triggerSentence(beat: SceneBeat, catalog: CatalogEntry[]) {
  if (beat.triggerType === "begin_play") return "When the scene begins";
  const entry = resolveEntry(catalog, beat.triggerTarget);
  const target = entry ? entry.label : beat.triggerTarget || "…";
  switch (beat.triggerType) {
    case "interaction":
      return `When the player interacts with ${target}`;
    case "item_used":
      return `When Grayson uses ${target} from inventory`;
    case "dialogue_complete":
      return `After the ${target} dialogue`;
    case "player_enters":
      return `When the player enters ${target}`;
    case "timer":
      return `After ${target}`;
    case "event":
      return `When ${target} fires`;
    case "beat_completed":
      return `After “${target}”`;
  }
}

export function actionSentence(
  type: BeatActionType,
  targetId: string,
  catalog: CatalogEntry[],
) {
  const entry = resolveEntry(catalog, targetId);
  const target = entry ? entry.label : targetId;
  return target ? `${actionLabels[type]} · ${target}` : actionLabels[type];
}

const beatIndexOf = (scene: SceneDraft, beatId: string) =>
  scene.beats.findIndex((beat) => beat.id === beatId);

export interface NpcSpan {
  npc: SceneNpc;
  /** First beat index the NPC is on stage (0 when present at start). */
  start: number;
  /** Last beat index the NPC is on stage, inclusive. */
  end: number;
  entersDuringScene: boolean;
  exitsDuringScene: boolean;
  conditional: boolean;
  /** Entrance/exit beat IDs that no longer resolve to a beat. */
  broken: boolean;
}

export function npcSpan(scene: SceneDraft, npc: SceneNpc): NpcSpan {
  const lastIndex = Math.max(scene.beats.length - 1, 0);
  let broken = false;

  let start = 0;
  let entersDuringScene = false;
  if (npc.presence !== "present_at_start" && npc.entranceBeatId) {
    const index = beatIndexOf(scene, npc.entranceBeatId);
    if (index === -1) broken = true;
    else {
      start = index;
      entersDuringScene = index > 0;
    }
  }

  let end = lastIndex;
  let exitsDuringScene = false;
  if (npc.exitBeatId) {
    const index = beatIndexOf(scene, npc.exitBeatId);
    if (index === -1) broken = true;
    else {
      end = Math.max(index, start);
      exitsDuringScene = true;
    }
  }

  return {
    npc,
    start,
    end,
    entersDuringScene,
    exitsDuringScene,
    conditional: npc.presence === "conditional",
    broken,
  };
}

export interface StageState {
  npcs: {
    npc: SceneNpc;
    entering: boolean;
    leaving: boolean;
    conditional: boolean;
  }[];
  huds: { event: HudEvent; sinceBeat: number }[];
  items: {
    item: SceneItem;
    state: SceneItemState;
    changedAtBeat: number | null;
  }[];
  interactables: {
    interactable: SceneInteractable;
    active: boolean;
  }[];
  flags: string[];
  exits: string[];
}

/** Cumulative scene state after beats 0..beatIndex have played. */
export function computeStageState(
  scene: SceneDraft,
  beatIndex: number,
): StageState {
  const played = scene.beats.slice(0, beatIndex + 1);

  const npcs = scene.npcs
    .map((npc) => ({ npc, span: npcSpan(scene, npc) }))
    .filter(
      ({ span }) => span.start <= beatIndex && span.end >= beatIndex,
    )
    .map(({ npc, span }) => ({
      npc,
      entering: span.entersDuringScene && span.start === beatIndex,
      leaving: span.exitsDuringScene && span.end === beatIndex,
      conditional: span.conditional,
    }));

  const huds: StageState["huds"] = [];
  scene.hudEvents.forEach((event) => {
    for (let index = played.length - 1; index >= 0; index -= 1) {
      const shown = played[index].actions.some(
        (action) => action.type === "show_hud" && action.targetId === event.id,
      );
      if (!shown) continue;
      const visible =
        event.dismissMode === "persistent" ? true : index === beatIndex;
      if (visible) huds.push({ event, sinceBeat: index });
      break;
    }
  });

  const items = scene.items.map((item) => {
    let state = item.initialState;
    let changedAtBeat: number | null = null;
    played.forEach((beat, index) => {
      beat.actions.forEach((action) => {
        if (action.targetId !== item.id) return;
        if (action.type === "give_item") {
          state = "held";
          changedAtBeat = index;
        }
        if (action.type === "update_item") changedAtBeat = index;
      });
    });
    return { item, state, changedAtBeat };
  });

  const currentBeat = scene.beats[beatIndex];
  const activeInteractableIds = new Set<string>();
  if (currentBeat?.triggerType === "interaction") {
    activeInteractableIds.add(currentBeat.triggerTarget);
  }
  currentBeat?.actions.forEach((action) => {
    if (action.type === "update_interactable") {
      activeInteractableIds.add(action.targetId);
    }
  });
  const interactables = scene.interactables
    .filter((interactable) => activeInteractableIds.has(interactable.id))
    .map((interactable) => ({ interactable, active: true }));

  const flags: string[] = [];
  const exits: string[] = [];
  played.forEach((beat) => {
    beat.actions.forEach((action) => {
      const label = action.targetId || action.detail;
      if (action.type === "set_flag" && label) flags.push(label);
      if (action.type === "unlock_exit" && label) exits.push(label);
    });
  });

  return { npcs, huds, items, interactables, flags, exits };
}

export interface BackReference {
  kind: ResourceKind;
  id: string;
  label: string;
  role: string;
}

/** Everything that references the given resource, with how it uses it. */
export function backReferences(
  scene: SceneDraft,
  resourceId: string,
): BackReference[] {
  const references: BackReference[] = [];
  scene.beats.forEach((beat, beatIndex) => {
    const label = `Beat ${String(beatIndex + 1).padStart(2, "0")} · ${beat.title}`;
    if (beat.triggerTarget === resourceId) {
      references.push({
        kind: "beat",
        id: beat.id,
        label,
        role: `Trigger · ${triggerLabels[beat.triggerType]}`,
      });
    }
    beat.actions.forEach((action) => {
      if (action.targetId === resourceId) {
        references.push({
          kind: "beat",
          id: beat.id,
          label,
          role: actionLabels[action.type],
        });
      }
    });
  });
  scene.npcs.forEach((npc) => {
    if (npc.entranceBeatId === resourceId) {
      references.push({
        kind: "npc",
        id: npc.id,
        label: npc.displayName,
        role: "Enters on this beat",
      });
    }
    if (npc.exitBeatId === resourceId) {
      references.push({
        kind: "npc",
        id: npc.id,
        label: npc.displayName,
        role: "Exits on this beat",
      });
    }
  });
  return references;
}

/**
 * Rewrite every beat trigger target and action target that points at `fromId`
 * so it points at `toId`. Used when a resource's stable ID is renamed. Both
 * trigger targets and action targets are rewritten regardless of resource kind:
 * a stale ID can only ever match the one resource being renamed, so rewriting
 * both is always safe and keeps item/dialogue/interactable renames consistent.
 */
export function renameBeatReferences(
  beats: SceneBeat[],
  fromId: string,
  toId: string,
): SceneBeat[] {
  return beats.map((beat) => ({
    ...beat,
    triggerTarget: beat.triggerTarget === fromId ? toId : beat.triggerTarget,
    actions: beat.actions.map((action) => ({
      ...action,
      targetId: action.targetId === fromId ? toId : action.targetId,
    })),
  }));
}

/**
 * Remove a resource from every beat: any trigger that fires on it reverts to
 * begin_play, and any action targeting it is dropped. Used when a resource is
 * deleted so no beat is left pointing at a resource that no longer exists.
 */
export function removeResourceFromBeats(
  beats: SceneBeat[],
  resourceId: string,
): SceneBeat[] {
  return beats.map((beat) => {
    const triggersOnResource = beat.triggerTarget === resourceId;
    return {
      ...beat,
      triggerType: triggersOnResource ? "begin_play" : beat.triggerType,
      triggerTarget: triggersOnResource ? "" : beat.triggerTarget,
      actions: beat.actions.filter((action) => action.targetId !== resourceId),
    };
  });
}

export type StagingDragPayload =
  | {
      type:
        | "beat"
        | "npc"
        | "item"
        | "interactable"
        | "hud"
        | "npc-presence"
        | "npc-span-start"
        | "npc-span-end";
      id: string;
    }
  | {
      type: "action-placement";
      id: string;
      sourceBeatId: string;
    }
  | {
      type: "trigger-placement";
      id: string;
      sourceBeatId: string;
    };

export type TimelinePlacement =
  | {
      kind: "action";
      beatId: string;
      actionId: string;
    }
  | {
      kind: "trigger";
      beatId: string;
    };
