import YAML from "yaml";

import type {
  BeatActionType,
  BeatTriggerType,
  DialogueUnit,
  EffectScope,
  EventThreadRole,
  HudChannel,
  HudDismissMode,
  NpcBehavior,
  NpcPresence,
  PresentationMode,
  ReviewStatus,
  SceneBeat,
  SceneDraft,
  SceneInteractable,
  SceneInteractableKind,
  SceneItem,
  SceneItemKind,
  SceneItemPersistence,
  SceneItemState,
  SceneNpc,
  SceneStatus,
  StoryChange,
} from "./editor-types";

export interface ImportedScene {
  chapterId: string;
  scene: SceneDraft;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

const sceneStatuses: SceneStatus[] = [
  "draft",
  "needs_author_review",
  "approved",
  "locked",
];
const reviewStatuses: ReviewStatus[] = [
  "unreviewed",
  "approved",
  "rejected",
  "needs_discussion",
];
const presentationModes: PresentationMode[] = [
  "scrolling_hd2d",
  "static_cinematic",
];
const effectScopes: EffectScope[] = [
  "relationship",
  "self_definition",
  "public_perception",
  "resources",
  "scene_variation",
  "later_access",
];
const npcPresences: NpcPresence[] = [
  "present_at_start",
  "enters_on_beat",
  "conditional",
];
const npcBehaviors: NpcBehavior[] = [
  "stationary",
  "idle",
  "follow_player",
  "follow_path",
  "scripted",
];
const itemKinds: SceneItemKind[] = [
  "personal_item",
  "key_item",
  "consumable",
  "document",
];
const itemStates: SceneItemState[] = ["visible", "hidden", "held"];
const itemPersistences: SceneItemPersistence[] = ["scene", "chapter"];
const interactableKinds: SceneInteractableKind[] = [
  "inspection",
  "prop",
  "transition",
  "traversal",
];
const hudChannels: HudChannel[] = [
  "internal_observation",
  "message",
  "news",
  "translation",
  "system_notification",
  "objective",
  "item_reveal",
  "choice_consequence",
];
const dismissModes: HudDismissMode[] = [
  "timed",
  "player_dismiss",
  "beat_advance",
  "persistent",
];
const eventThreadRoles: EventThreadRole[] = [
  "setup",
  "escalation",
  "callback",
  "choice",
  "consequence",
  "resolution",
  "reference",
];
const triggerTypes: BeatTriggerType[] = [
  "begin_play",
  "interaction",
  "item_used",
  "dialogue_complete",
  "player_enters",
  "timer",
  "event",
  "beat_completed",
];
const actionTypes: BeatActionType[] = [
  "show_hud",
  "spawn_npc",
  "move_npc",
  "give_item",
  "update_item",
  "update_interactable",
  "play_dialogue",
  "play_audio",
  "camera",
  "unlock_exit",
  "set_flag",
  "custom",
];

function parseDialogue(raw: Record<string, unknown>, index: number): DialogueUnit {
  const choice = record(raw.player_choice);
  const hasChoice = Object.keys(choice).length > 0;
  return {
    id: text(raw.id, `DIALOGUE_${index + 1}`),
    speaker: text(raw.speaker, "Unknown speaker"),
    text: text(raw.text),
    sourceLocked: raw.source_locked === true,
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
    ...(hasChoice
      ? {
          playerChoice: {
            id: text(choice.id, `CHOICE_${index + 1}`),
            prompt: text(choice.prompt),
            canonicalBounds: text(choice.canonical_bounds),
            status: oneOf(choice.approval, reviewStatuses, "unreviewed"),
            options: list(choice.options).map((option, optionIndex) => ({
              id: text(option.id, `OPTION_${optionIndex + 1}`),
              label: text(option.label, "Response"),
              effect: text(option.effect),
              effectScopes: Array.isArray(option.effect_scopes)
                ? option.effect_scopes.filter(
                    (scope): scope is EffectScope =>
                      typeof scope === "string" &&
                      (effectScopes as string[]).includes(scope),
                  )
                : [],
            })),
          },
        }
      : {}),
  };
}

function parseStoryChange(
  raw: Record<string, unknown>,
  index: number,
): StoryChange {
  return {
    id: text(raw.id, `CHANGE_${index + 1}`),
    type: text(raw.type, "story_edit"),
    canonical: text(raw.canonical),
    proposed: text(raw.proposed),
    rationale: text(raw.rationale),
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
  };
}

function parseNpc(raw: Record<string, unknown>, index: number): SceneNpc {
  return {
    id: text(raw.id, `ACTOR_${index + 1}`),
    displayName: text(raw.display_name, "Unnamed character"),
    role: text(raw.role),
    presence: oneOf(raw.presence, npcPresences, "present_at_start"),
    behavior: oneOf(raw.behavior, npcBehaviors, "idle"),
    entranceBeatId: text(raw.entrance_beat_id),
    exitBeatId: text(raw.exit_beat_id),
    stagingNotes: text(raw.staging_notes),
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
  };
}

function parseItem(raw: Record<string, unknown>, index: number): SceneItem {
  return {
    id: text(raw.id, `ITEM_${index + 1}`),
    name: text(raw.name, "Unnamed item"),
    kind: oneOf(raw.kind, itemKinds, "personal_item"),
    initialState: oneOf(raw.initial_state, itemStates, "visible"),
    persistence: oneOf(raw.persistence, itemPersistences, "scene"),
    interactionPrompt: text(raw.interaction_prompt),
    outcome: text(raw.outcome),
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
  };
}

function inferLegacyInteractableKind(
  raw: Record<string, unknown>,
): SceneInteractableKind {
  const id = text(raw.id).toUpperCase();
  if (
    raw.kind === "scene_prop" ||
    [
      "WHISKEY",
      "CIGARETTE",
      "COCKTAIL",
      "MICROPHONE",
      "STOOL",
      "WATER",
      "COOKIE",
    ].some((token) => id.includes(token))
  ) {
    return "prop";
  }
  if (
    id.includes("ENTRANCE") ||
    id.includes("EXIT") ||
    id.includes("PLATFORM") ||
    id.includes("FENCE")
  ) {
    return "transition";
  }
  if (id.includes("STAIR")) return "traversal";
  return "inspection";
}

function parseInteractable(
  raw: Record<string, unknown>,
  index: number,
): SceneInteractable {
  const kind = (interactableKinds as readonly string[]).includes(
    text(raw.kind),
  )
    ? oneOf(raw.kind, interactableKinds, "inspection")
    : inferLegacyInteractableKind(raw);
  return {
    id: text(raw.id, `INTERACT_${index + 1}`),
    name: text(raw.name, "Unnamed interactable"),
    kind,
    interactionPrompt: text(raw.interaction_prompt, "Interact"),
    outcome: text(raw.outcome),
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
  };
}

function parseHudEvent(raw: Record<string, unknown>, index: number) {
  const duration = Number(raw.duration_seconds);
  const eventThread = record(raw.event_thread);
  return {
    id: text(raw.id, `HUD_${index + 1}`),
    channel: oneOf(raw.channel, hudChannels, "internal_observation"),
    text: text(raw.text),
    trigger: text(raw.trigger),
    dismissMode: oneOf(raw.dismiss_mode, dismissModes, "player_dismiss"),
    durationSeconds: Number.isFinite(duration) ? duration : 0,
    responses: list(raw.responses).map((response, responseIndex) => ({
      id: text(response.id, `HUD_RESPONSE_${responseIndex + 1}`),
      label: text(response.label, "Respond"),
      outcome: text(response.outcome),
      setFlag: text(response.set_flag),
    })),
    ...(text(eventThread.id)
      ? {
          eventThreadId: text(eventThread.id),
          eventThreadRole: oneOf(
            eventThread.role,
            eventThreadRoles,
            "reference",
          ),
          eventThreadNote: text(eventThread.note),
        }
      : {}),
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
  };
}

function parseBeat(raw: Record<string, unknown>, index: number): SceneBeat {
  const trigger = record(raw.trigger);
  const eventThread = record(raw.event_thread);
  const beatId = text(raw.id, `BEAT_${index + 1}`);
  const actions = list(raw.actions).map((action, actionIndex) => ({
    id: text(action.id, `${beatId}_ACTION_${actionIndex + 1}`),
    type: oneOf(action.type, actionTypes, "custom"),
    targetId: text(action.target_id),
    detail: text(action.detail),
  }));
  return {
    id: beatId,
    title: text(raw.title, `Beat ${index + 1}`),
    triggerType: oneOf(trigger.type, triggerTypes, "begin_play"),
    triggerTarget: text(trigger.target),
    optional: raw.optional === true,
    actions:
      actions.length > 0
        ? actions
        : [
            {
              id: `${beatId}_ACTION_1`,
              type: "custom",
              targetId: "",
              detail: "",
            },
          ],
    ...(text(eventThread.id)
      ? {
          eventThreadId: text(eventThread.id),
          eventThreadRole: oneOf(
            eventThread.role,
            eventThreadRoles,
            "reference",
          ),
          eventThreadNote: text(eventThread.note),
        }
      : {}),
    status: oneOf(raw.approval, reviewStatuses, "unreviewed"),
  };
}

/**
 * Parse an exported authoring document (YAML or normalized JSON) back into
 * a SceneDraft. Throws with a readable message when the file is not a scene.
 */
export function parseAuthoringScene(source: string): ImportedScene {
  let parsed: unknown;
  try {
    parsed = YAML.parse(source);
  } catch (error) {
    throw new Error(
      `not valid YAML or JSON (${error instanceof Error ? error.message.split("\n")[0] : "parse error"})`,
    );
  }

  let doc = record(parsed);
  if (doc.kind === "sceneAuthoring" && doc.authoring) {
    doc = record(doc.authoring);
  }
  if (doc.kind !== "scene_authoring") {
    throw new Error(
      'not a scene authoring document (expected kind: "scene_authoring")',
    );
  }
  const sceneId = text(doc.scene_id);
  if (!sceneId) {
    throw new Error("missing scene_id");
  }

  const staging = record(doc.staging);
  const rawItems = list(staging.items);
  const legacyPropIds = new Set([
    "ITEM_REAL_WHISKEY_BOTTLE",
    "ITEM_SHARED_WHISKEY_BOTTLE",
    "ITEM_SHARED_CIGARETTE",
  ]);
  const isLegacyInteractable = (item: Record<string, unknown>) =>
    item.kind === "environmental_interactable" ||
    item.kind === "scene_prop" ||
    legacyPropIds.has(text(item.id));
  const legacyInteractables = rawItems.filter(isLegacyInteractable);
  const inventoryItems = rawItems.filter((item) => !isLegacyInteractable(item));
  const inventoryItemIds = new Set(inventoryItems.map((item) => text(item.id)));
  const interactables = [
    ...list(staging.interactables),
    ...legacyInteractables,
  ].map(parseInteractable);
  const interactableIds = new Set(interactables.map((item) => item.id));
  const beats = list(staging.beats)
    .map(parseBeat)
    .map((beat) => ({
      ...beat,
      triggerType:
        beat.triggerType === "interaction" &&
        inventoryItemIds.has(beat.triggerTarget)
          ? ("item_used" as const)
          : beat.triggerType,
      actions: beat.actions.map((action) =>
        action.type === "update_item" && interactableIds.has(action.targetId)
          ? { ...action, type: "update_interactable" as const }
          : action,
      ),
    }));
  const scene: SceneDraft = {
    id: sceneId,
    order: 0,
    title: text(doc.title, sceneId),
    timeContext: "",
    status: oneOf(doc.status, sceneStatuses, "draft"),
    presentationMode: oneOf(
      record(doc.presentation).mode,
      presentationModes,
      "scrolling_hd2d",
    ),
    playerGoal: text(doc.player_goal),
    sourceExcerpt: text(record(doc.source).excerpt),
    dialogue: list(doc.dialogue).map(parseDialogue),
    storyChanges: list(doc.story_changes).map(parseStoryChange),
    npcs: list(staging.npcs).map(parseNpc),
    items: inventoryItems.map(parseItem),
    interactables,
    hudEvents: list(staging.hud_events).map(parseHudEvent),
    beats,
    notes: text(doc.notes),
  };

  return {
    chapterId: text(doc.chapter_id, sceneId.split("_S")[0] || "CH00"),
    scene,
  };
}
