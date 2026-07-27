export type SceneStatus =
  | "draft"
  | "needs_author_review"
  | "approved"
  | "locked";

export type PresentationMode = "scrolling_hd2d" | "static_cinematic";

// Engine the compiler targets. Recorded on export so `novel-manifest compile`
// applies the right units/axes/naming. The neutral authoring data is unchanged.
export type EngineTarget = "unreal" | "godot" | "unity";

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
  | "personal_item"
  | "key_item"
  | "consumable"
  | "document";

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

export type SceneInteractableKind =
  | "inspection"
  | "prop"
  | "transition"
  | "traversal";

export interface SceneInteractable {
  id: string;
  name: string;
  kind: SceneInteractableKind;
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

export type EventThreadRole =
  | "setup"
  | "escalation"
  | "callback"
  | "choice"
  | "consequence"
  | "resolution"
  | "reference";

export interface HudResponse {
  id: string;
  label: string;
  outcome: string;
  setFlag: string;
}

export interface HudEvent {
  id: string;
  channel: HudChannel;
  text: string;
  trigger: string;
  dismissMode: HudDismissMode;
  durationSeconds: number;
  responses?: HudResponse[];
  eventThreadId?: string;
  eventThreadRole?: EventThreadRole;
  eventThreadNote?: string;
  status: ReviewStatus;
}

export type BeatTriggerType =
  | "begin_play"
  | "interaction"
  | "item_used"
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
  | "update_interactable"
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
  eventThreadId?: string;
  eventThreadRole?: EventThreadRole;
  eventThreadNote?: string;
  status: ReviewStatus;
}

export type LayoutStatus =
  | "draft"
  | "needs_review"
  | "layout_approved";

export type LayoutCameraMode =
  | "side_view_perspective"
  | "orthographic"
  | "fixed_cinematic";

export type LayoutPlacementKind =
  | "player_start"
  | "npc"
  | "interactable"
  | "item"
  | "transition"
  | "camera"
  | "audio"
  | "custom";

export interface LayoutPoint {
  xM: number;
  yM: number;
  zM: number;
}

export interface LayoutDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
}

export interface LayoutCamera {
  mode: LayoutCameraMode;
  horizontalTracking: boolean;
  verticalTracking: boolean;
  perspectiveFovDegrees: number;
  orthographicWidthM: number;
  framingNotes: string;
}

export interface LayoutPlacement extends LayoutPoint {
  id: string;
  sourceId: string;
  label: string;
  kind: LayoutPlacementKind;
  beatId: string;
  radiusM: number;
  widthM: number;
  heightM: number;
  assetId: string;
  notes: string;
  orphaned?: boolean;
}

export interface LayoutEnvironmentPiece extends LayoutPoint {
  id: string;
  label: string;
  kind: "floor" | "wall" | "backdrop" | "prop" | "volume";
  assetId: string;
  dimensions: LayoutDimensions;
  notes: string;
}

export interface LayoutPath {
  id: string;
  sourceId: string;
  beatId: string;
  speedMps: number;
  points: LayoutPoint[];
  notes: string;
}

export interface SceneLayoutDraft {
  status: LayoutStatus;
  upstreamAuthoringHash: string;
  mergeMode: "create" | "merge" | "import";
  sourceManifestPath: string;
  levelName: string;
  outputPath: string;
  environmentKitIds: string[];
  dimensions: LayoutDimensions;
  camera: LayoutCamera;
  placements: LayoutPlacement[];
  environmentPieces: LayoutEnvironmentPiece[];
  paths: LayoutPath[];
  grayboxAssets: string[];
  artReplacementAssets: string[];
  acceptanceTests: string[];
  mergeConflicts: string[];
  notes: string;
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
  interactables: SceneInteractable[];
  hudEvents: HudEvent[];
  beats: SceneBeat[];
  layout?: SceneLayoutDraft;
  notes: string;
}

export interface ChapterDraft {
  id: string;
  title: string;
  sourceFilename: string;
  scenes: SceneDraft[];
}

// A book. Chapters live inside a project so the workspace can hold several
// books and delete them independently. The compile engine target is per-book.
export interface ProjectDraft {
  id: string;
  title: string;
  targetEngine: EngineTarget;
  chapters: ChapterDraft[];
}
