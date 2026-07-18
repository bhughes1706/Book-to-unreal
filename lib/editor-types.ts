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
  notes: string;
}

export interface ChapterDraft {
  id: string;
  title: string;
  sourceFilename: string;
  scenes: SceneDraft[];
}
