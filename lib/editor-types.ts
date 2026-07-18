export type SceneStatus =
  | "draft"
  | "needs_author_review"
  | "approved"
  | "locked";

export type PresentationMode = "scrolling_hd2d" | "static_cinematic";

export type ReviewStatus =
  | "unreviewed"
  | "approved"
  | "rejected"
  | "needs_discussion";

export type EffectScope =
  | "relationship"
  | "self_definition"
  | "public_perception"
  | "resources"
  | "scene_variation"
  | "later_access";

export interface ChoiceOption {
  id: string;
  label: string;
  effect: string;
  effectScopes: EffectScope[];
}

export interface PlayerChoice {
  id: string;
  prompt: string;
  canonicalBounds: string;
  status: ReviewStatus;
  options: ChoiceOption[];
}

export interface DialogueUnit {
  id: string;
  speaker: string;
  text: string;
  sourceLocked: boolean;
  status: ReviewStatus;
  playerChoice?: PlayerChoice;
}

export interface StoryChange {
  id: string;
  type: string;
  canonical: string;
  proposed: string;
  rationale: string;
  status: ReviewStatus;
}

export type NpcPresence =
  | "present_at_start"
  | "enters_on_beat"
  | "conditional";

export type NpcBehavior =
  | "stationary"
  | "idle"
  | "follow_player"
  | "follow_path"
  | "scripted";

export interface SceneNpc {
  id: string;
  displayName: string;
  role: string;
  presence: NpcPresence;
  behavior: NpcBehavior;
  entranceBeatId: string;
  exitBeatId: string;
  stagingNotes: string;
  status: ReviewStatus;
}

export type SceneItemKind =
  | "environmental_interactable"
  | "scene_prop"
  | "narrative_item";

export type SceneItemState = "visible" | "hidden" | "held";
export type SceneItemPersistence = "scene" | "chapter";

export interface SceneItem {
  id: string;
  name: string;
  kind: SceneItemKind;
  initialState: SceneItemState;
  persistence: SceneItemPersistence;
  interactionPrompt: string;
  outcome: string;
  status: ReviewStatus;
}

export type HudChannel =
  | "internal_observation"
  | "message"
  | "news"
  | "translation"
  | "system_notification"
  | "objective"
  | "item_reveal"
  | "choice_consequence";

export type HudDismissMode =
  | "timed"
  | "player_dismiss"
  | "beat_advance"
  | "persistent";

export interface HudEvent {
  id: string;
  channel: HudChannel;
  text: string;
  trigger: string;
  dismissMode: HudDismissMode;
  durationSeconds: number;
  status: ReviewStatus;
}

export type BeatTriggerType =
  | "begin_play"
  | "interaction"
  | "dialogue_complete"
  | "player_enters"
  | "timer"
  | "event"
  | "beat_completed";

export type BeatActionType =
  | "show_hud"
  | "spawn_npc"
  | "move_npc"
  | "give_item"
  | "update_item"
  | "play_dialogue"
  | "play_audio"
  | "camera"
  | "unlock_exit"
  | "set_flag"
  | "custom";

export interface BeatAction {
  id: string;
  type: BeatActionType;
  targetId: string;
  detail: string;
}

export interface SceneBeat {
  id: string;
  title: string;
  triggerType: BeatTriggerType;
  triggerTarget: string;
  optional: boolean;
  actions: BeatAction[];
  status: ReviewStatus;
}

export interface SceneDraft {
  id: string;
  order: number;
  title: string;
  timeContext: string;
  status: SceneStatus;
  presentationMode: PresentationMode;
  playerGoal: string;
  sourceExcerpt: string;
  dialogue: DialogueUnit[];
  storyChanges: StoryChange[];
  npcs: SceneNpc[];
  items: SceneItem[];
  hudEvents: HudEvent[];
  beats: SceneBeat[];
  notes: string;
}

export interface ChapterDraft {
  id: string;
  title: string;
  sourceFilename: string;
  scenes: SceneDraft[];
}
