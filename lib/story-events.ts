import type {
  ChapterDraft,
  EventThreadRole,
  HudEvent,
  SceneBeat,
} from "./editor-types";

export interface StoryEventOccurrence {
  eventId: string;
  sceneId: string;
  sceneTitle: string;
  sceneOrder: number;
  kind: "beat" | "hud";
  resourceId: string;
  label: string;
  detail: string;
  role: EventThreadRole;
}

export interface StoryEventThread {
  id: string;
  label: string;
  occurrences: StoryEventOccurrence[];
}

function eventLabel(id: string) {
  return id
    .replace(/^EVENT_/, "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function beatOccurrence(
  eventId: string,
  sceneId: string,
  sceneTitle: string,
  sceneOrder: number,
  beat: SceneBeat,
): StoryEventOccurrence {
  return {
    eventId,
    sceneId,
    sceneTitle,
    sceneOrder,
    kind: "beat",
    resourceId: beat.id,
    label: beat.title,
    detail: beat.eventThreadNote || "Beat occurrence",
    role: beat.eventThreadRole || "reference",
  };
}

function hudOccurrence(
  eventId: string,
  sceneId: string,
  sceneTitle: string,
  sceneOrder: number,
  hud: HudEvent,
): StoryEventOccurrence {
  return {
    eventId,
    sceneId,
    sceneTitle,
    sceneOrder,
    kind: "hud",
    resourceId: hud.id,
    label: hud.text,
    detail: hud.eventThreadNote || hud.trigger,
    role: hud.eventThreadRole || "reference",
  };
}

export function buildStoryEventThreads(
  chapter: ChapterDraft,
): StoryEventThread[] {
  const occurrences: StoryEventOccurrence[] = [];
  chapter.scenes.forEach((scene) => {
    scene.beats.forEach((beat) => {
      if (!beat.eventThreadId) return;
      occurrences.push(
        beatOccurrence(
          beat.eventThreadId,
          scene.id,
          scene.title,
          scene.order,
          beat,
        ),
      );
    });
    scene.hudEvents.forEach((hud) => {
      if (!hud.eventThreadId) return;
      occurrences.push(
        hudOccurrence(
          hud.eventThreadId,
          scene.id,
          scene.title,
          scene.order,
          hud,
        ),
      );
    });
  });

  const grouped = new Map<string, StoryEventOccurrence[]>();
  occurrences.forEach((occurrence) => {
    grouped.set(occurrence.eventId, [
      ...(grouped.get(occurrence.eventId) || []),
      occurrence,
    ]);
  });

  return [...grouped.entries()]
    .map(([id, threadOccurrences]) => ({
      id,
      label: eventLabel(id),
      occurrences: threadOccurrences.sort(
        (left, right) =>
          left.sceneOrder - right.sceneOrder ||
          (left.kind === "beat" ? -1 : 1),
      ),
    }))
    .sort(
      (left, right) =>
        (left.occurrences[0]?.sceneOrder ?? 0) -
          (right.occurrences[0]?.sceneOrder ?? 0) ||
        left.id.localeCompare(right.id),
    );
}
