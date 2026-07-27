import { chapterSeed } from "./chapter-seed";
import type {
  ChapterDraft,
  SceneDraft,
  SceneInteractable,
  SceneInteractableKind,
  SceneItem,
  SceneItemKind,
} from "./editor-types";

/**
 * Bring a persisted chapter up to the current data model: split legacy item
 * kinds into inventory items vs. environmental interactables, retarget beats
 * whose triggers/actions now point at the migrated interactables, and — when
 * `enrichSeedDetails` is set for an older data version — backfill richer
 * details for the seeded Chapter One scenes that gained them.
 */
export function migrateChapter(
  saved: ChapterDraft,
  enrichSeedDetails = false,
): ChapterDraft {
  return {
    ...saved,
    scenes: saved.scenes.map((scene) => {
      const seededScene = chapterSeed.scenes.find(
        (candidate) => candidate.id === scene.id,
      );
      type LegacySceneItem = Omit<SceneItem, "kind"> & { kind: string };
      const legacyItems = (scene.items ??
        seededScene?.items ??
        []) as LegacySceneItem[];
      const becomesInteractable = (item: LegacySceneItem) =>
        item.kind === "environmental_interactable" ||
        item.kind === "scene_prop" ||
        [
          "ITEM_REAL_WHISKEY_BOTTLE",
          "ITEM_SHARED_WHISKEY_BOTTLE",
          "ITEM_SHARED_CIGARETTE",
        ].includes(item.id);
      const inferInteractableKind = (
        item: LegacySceneItem,
      ): SceneInteractableKind => {
        const id = item.id.toUpperCase();
        if (
          item.kind === "scene_prop" ||
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
      };
      const migratedLegacyInteractables: SceneInteractable[] = legacyItems
        .filter(becomesInteractable)
        .map((item) => ({
          id: item.id,
          name: item.name,
          kind: inferInteractableKind(item),
          interactionPrompt: item.interactionPrompt,
          outcome: item.outcome,
          status: item.status,
        }));
      const migratedItems: SceneItem[] = legacyItems
        .filter((item) => !becomesInteractable(item))
        .map((item) => ({
          ...item,
          kind: (
            ["personal_item", "key_item", "consumable", "document"].includes(
              item.kind,
            )
              ? item.kind
              : item.id.includes("FORTUNE")
                ? "document"
                : "personal_item"
          ) as SceneItemKind,
        }));
      const savedInteractables =
        (
          scene as SceneDraft & {
            interactables?: SceneInteractable[];
          }
        ).interactables ?? [];
      const interactables = [
        ...savedInteractables,
        ...migratedLegacyInteractables.filter(
          (candidate) =>
            !savedInteractables.some((item) => item.id === candidate.id),
        ),
      ];
      const interactableIds = new Set(
        interactables.map((interactable) => interactable.id),
      );
      const itemIds = new Set(migratedItems.map((item) => item.id));
      const migrated = {
        ...scene,
        npcs: scene.npcs ?? seededScene?.npcs ?? [],
        items: migratedItems,
        interactables,
        hudEvents: scene.hudEvents ?? seededScene?.hudEvents ?? [],
        beats: (scene.beats ?? seededScene?.beats ?? []).map((beat) => ({
          ...beat,
          triggerType:
            beat.triggerType === "interaction" &&
            itemIds.has(beat.triggerTarget)
              ? ("item_used" as const)
              : beat.triggerType,
          actions: beat.actions.map((action) =>
            action.type === "update_item" &&
            interactableIds.has(action.targetId)
              ? { ...action, type: "update_interactable" as const }
              : action,
          ),
        })),
      };
      const continuityHudIds = new Set([
        "LENS_SYSTEM_NOTIFICATION_CONGRATULATE_DIVER_FAMILY",
      ]);
      const continuityBeatIds = new Set([
        "SCENE_BEAT_PIER_DIVER_DISAPPEARS",
        "SCENE_BEAT_DIVER_FAMILY_NOTIFICATION",
      ]);
      const withContinuity =
        enrichSeedDetails && seededScene
          ? {
              ...migrated,
              hudEvents: [
                ...migrated.hudEvents,
                ...seededScene.hudEvents.filter(
                  (event) =>
                    continuityHudIds.has(event.id) &&
                    !migrated.hudEvents.some(
                      (candidate) => candidate.id === event.id,
                    ),
                ),
              ],
              beats: [
                ...migrated.beats,
                ...seededScene.beats.filter(
                  (beat) =>
                    continuityBeatIds.has(beat.id) &&
                    !migrated.beats.some(
                      (candidate) => candidate.id === beat.id,
                    ),
                ),
              ],
            }
          : migrated;
      const isNewlyDetailedChapterOneScene =
        seededScene &&
        seededScene.order >= 4 &&
        seededScene.order <= 9 &&
        seededScene.id.startsWith("CH01_");
      if (!enrichSeedDetails || !isNewlyDetailedChapterOneScene) {
        return withContinuity;
      }
      return {
        ...withContinuity,
        timeContext: withContinuity.timeContext || seededScene.timeContext,
        status:
          withContinuity.status === "draft"
            ? seededScene.status
            : withContinuity.status,
        playerGoal: withContinuity.playerGoal || seededScene.playerGoal,
        sourceExcerpt:
          withContinuity.sourceExcerpt || seededScene.sourceExcerpt,
        dialogue:
          withContinuity.dialogue.length > 0
            ? withContinuity.dialogue
            : seededScene.dialogue,
        storyChanges:
          withContinuity.storyChanges.length > 0
            ? withContinuity.storyChanges
            : seededScene.storyChanges,
        npcs:
          withContinuity.npcs.length > 0
            ? withContinuity.npcs
            : seededScene.npcs,
        items:
          withContinuity.items.length > 0
            ? withContinuity.items
            : seededScene.items,
        interactables:
          withContinuity.interactables.length > 0
            ? withContinuity.interactables
            : seededScene.interactables,
        hudEvents:
          withContinuity.hudEvents.length > 0
            ? withContinuity.hudEvents
            : seededScene.hudEvents,
        beats:
          withContinuity.beats.length > 0
            ? withContinuity.beats
            : seededScene.beats,
        notes: withContinuity.notes || seededScene.notes,
      };
    }),
  };
}
