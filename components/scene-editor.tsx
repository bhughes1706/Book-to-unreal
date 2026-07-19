"use client";

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  BookPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Circle,
  Clock3,
  Download,
  FileJson2,
  FileText,
  GitBranch,
  Menu,
  MessageSquareQuote,
  MonitorPlay,
  MoveHorizontal,
  Network,
  PanelLeftClose,
  PanelTop,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SetStateAction } from "react";

import {
  ConfirmationDialog,
  type ConfirmationRequest,
} from "@/components/confirmation-dialog";
import { IdField } from "@/components/id-field";
import { EventThreadView } from "@/components/event-thread-view";
import { StagingEditor } from "@/components/staging-editor";
import type { StagingSelection } from "@/components/staging-editor";
import type { ImportedScene } from "@/lib/authoring-import";
import { parseAuthoringScene } from "@/lib/authoring-import";
import { chapterSeed } from "@/lib/chapter-seed";
import { dialogueIdSuggestion } from "@/lib/id-builder";
import { buildStoryEventThreads } from "@/lib/story-events";
import {
  actionLabels,
  hudChannelLabels,
  triggerLabels,
} from "@/lib/staging-model";
import type {
  ChapterDraft,
  ChoiceOption,
  DialogueUnit,
  EffectScope,
  PresentationMode,
  ReviewStatus,
  SceneDraft,
  SceneInteractable,
  SceneInteractableKind,
  SceneItem,
  SceneItemKind,
  SceneStatus,
  StoryChange,
} from "@/lib/editor-types";
import { sceneToJson, sceneToYaml } from "@/lib/scene-export";

const WORKSPACE_KEY = "scenework.workspace.v1";
const LEGACY_KEY = "scenework.chapter.CH01.v1";
const SEED_DATA_VERSION = 4;

interface CheckIssue {
  key: string;
  location: string;
  message: string;
  tab: WorkspaceTab;
  staging?: StagingSelection;
  anchorId?: string;
}

interface UndoSnapshot {
  chapters: ChapterDraft[];
  activeChapterId: string;
  activeSceneId: string;
}

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

const sceneStatusLabel: Record<SceneStatus, string> = {
  draft: "Draft",
  needs_author_review: "Needs review",
  approved: "Approved",
  locked: "Locked",
};

const reviewStatusLabel: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
  needs_discussion: "Discuss",
};

const effectScopes: { value: EffectScope; label: string }[] = [
  { value: "relationship", label: "Relationship" },
  { value: "self_definition", label: "Self-definition" },
  { value: "public_perception", label: "Public perception" },
  { value: "resources", label: "Resources" },
  { value: "scene_variation", label: "Scene variation" },
  { value: "later_access", label: "Later access" },
];

type WorkspaceTab =
  | "source"
  | "dialogue"
  | "staging"
  | "events"
  | "changes"
  | "output";
type OutputMode = "yaml" | "json";

function makeId(prefix: string, value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase()
    .slice(0, 44);
  return `${prefix}_${slug || Date.now()}`;
}

function migrateChapter(
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

function blankScene(id: string, order: number): SceneDraft {
  return {
    id,
    order,
    title: "New scene",
    timeContext: "",
    status: "draft",
    presentationMode: "scrolling_hd2d",
    playerGoal: "",
    sourceExcerpt: "",
    dialogue: [],
    storyChanges: [],
    npcs: [],
    items: [],
    interactables: [],
    hudEvents: [],
    beats: [],
    notes: "",
  };
}

function chapterTitleFromId(chapterId: string) {
  const number = Number.parseInt(chapterId.replace(/\D+/g, ""), 10);
  return Number.isFinite(number) && number > 0
    ? `Chapter ${number}`
    : chapterId;
}

function mergeImports(chapters: ChapterDraft[], imported: ImportedScene[]) {
  const next = chapters.map((chapter) => ({
    ...chapter,
    scenes: [...chapter.scenes],
  }));
  const createdChapterIds = new Set<string>();
  let added = 0;
  let updated = 0;
  imported.forEach(({ chapterId, scene }) => {
    let chapter = next.find((candidate) => candidate.id === chapterId);
    if (!chapter) {
      chapter = {
        id: chapterId,
        title: chapterTitleFromId(chapterId),
        sourceFilename: "",
        scenes: [],
      };
      next.push(chapter);
      createdChapterIds.add(chapterId);
    }
    const index = chapter.scenes.findIndex(
      (candidate) => candidate.id === scene.id,
    );
    if (index === -1) {
      chapter.scenes.push(scene);
      added += 1;
    } else {
      chapter.scenes[index] = scene;
      updated += 1;
    }
  });
  next.forEach((chapter) => {
    if (createdChapterIds.has(chapter.id)) {
      chapter.scenes.sort((a, b) => a.id.localeCompare(b.id));
    }
    chapter.scenes = chapter.scenes.map((scene, index) => ({
      ...scene,
      order: index + 1,
    }));
  });
  return { chapters: next, added, updated };
}

function truncate(value: string, length: number) {
  const trimmed = value.trim();
  return trimmed.length > length ? `${trimmed.slice(0, length)}…` : trimmed;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function StatusDot({ status }: { status: SceneStatus }) {
  if (status === "approved" || status === "locked") {
    return <CheckCircle2 aria-hidden size={15} />;
  }
  if (status === "needs_author_review") {
    return <Clock3 aria-hidden size={15} />;
  }
  return <Circle aria-hidden size={14} />;
}

function ReviewPill({
  value,
  onChange,
}: {
  value: ReviewStatus;
  onChange: (status: ReviewStatus) => void;
}) {
  return (
    <label className={`review-pill review-${value}`}>
      <span>{reviewStatusLabel[value]}</span>
      <ChevronDown aria-hidden size={13} />
      <select
        aria-label="Review status"
        value={value}
        onChange={(event) => onChange(event.target.value as ReviewStatus)}
      >
        {Object.entries(reviewStatusLabel).map(([status, label]) => (
          <option key={status} value={status}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SceneEditor() {
  const [chapters, setChaptersRaw] = useState<ChapterDraft[]>([chapterSeed]);
  const [activeChapterId, setActiveChapterId] = useState(chapterSeed.id);
  const [activeSceneId, setActiveSceneId] = useState(
    "CH01_S03_WALK_TO_VENUE",
  );
  const [canUndo, setCanUndo] = useState(false);
  const [confirmation, setConfirmation] =
    useState<ConfirmationRequest | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("source");
  const [outputMode, setOutputMode] = useState<OutputMode>("yaml");
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [issues, setIssues] = useState<CheckIssue[] | null>(null);
  const [stagingFocus, setStagingFocus] = useState<{
    selection: StagingSelection;
    token: number;
  } | null>(null);
  const [notice, setNotice] = useState(
    "Your edits stay in this browser until you export them.",
  );
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const chaptersRef = useRef<ChapterDraft[]>([chapterSeed]);
  const activeChapterIdRef = useRef(activeChapterId);
  const activeSceneIdRef = useRef(activeSceneId);
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const lastHistoryInputRef = useRef<{
    element: Element | null;
    at: number;
  } | null>(null);

  useEffect(() => {
    activeChapterIdRef.current = activeChapterId;
  }, [activeChapterId]);

  useEffect(() => {
    activeSceneIdRef.current = activeSceneId;
  }, [activeSceneId]);

  const setChapters = useCallback(
    (update: SetStateAction<ChapterDraft[]>) => {
      const current = chaptersRef.current;
      const next =
        typeof update === "function"
          ? (update as (value: ChapterDraft[]) => ChapterDraft[])(current)
          : update;
      if (next === current) return;

      const focused =
        typeof document === "undefined" ? null : document.activeElement;
      const now = Date.now();
      const lastInput = lastHistoryInputRef.current;
      const coalesce =
        isTextEditingTarget(focused) &&
        lastInput?.element === focused &&
        now - lastInput.at < 700;

      if (!coalesce) {
        undoStackRef.current.push({
          chapters: current,
          activeChapterId: activeChapterIdRef.current,
          activeSceneId: activeSceneIdRef.current,
        });
        if (undoStackRef.current.length > 80) {
          undoStackRef.current.shift();
        }
      }
      lastHistoryInputRef.current = isTextEditingTarget(focused)
        ? { element: focused, at: now }
        : null;
      chaptersRef.current = next;
      setChaptersRaw(next);
      setCanUndo(undoStackRef.current.length > 0);
    },
    [],
  );

  const undo = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) {
      setNotice("Nothing to undo.");
      return;
    }
    lastHistoryInputRef.current = null;
    chaptersRef.current = snapshot.chapters;
    setChaptersRaw(snapshot.chapters);
    activeChapterIdRef.current = snapshot.activeChapterId;
    activeSceneIdRef.current = snapshot.activeSceneId;
    setActiveChapterId(snapshot.activeChapterId);
    setActiveSceneId(snapshot.activeSceneId);
    setConfirmation(null);
    setIssues(null);
    setCanUndo(undoStackRef.current.length > 0);
    setNotice("Undid the last workspace change.");
  }, []);

  const requestConfirmation = useCallback(
    (request: ConfirmationRequest) => setConfirmation(request),
    [],
  );

  const closeConfirmation = useCallback(() => setConfirmation(null), []);

  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "z" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.shiftKey ||
        isTextEditingTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      undo();
    };
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [undo]);

  useEffect(() => {
    try {
      const savedWorkspace = window.localStorage.getItem(WORKSPACE_KEY);
      if (savedWorkspace) {
        const parsed = JSON.parse(savedWorkspace) as {
          chapters?: ChapterDraft[];
          activeChapterId?: string;
          dataVersion?: number;
        };
        if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          const enrichSeedDetails =
            (parsed.dataVersion ?? 1) < SEED_DATA_VERSION;
          const restored = parsed.chapters.map((chapter) =>
            migrateChapter(chapter, enrichSeedDetails),
          );
          chaptersRef.current = restored;
          setChaptersRaw(restored);
          undoStackRef.current = [];
          setCanUndo(false);
          const restoredActive =
            restored.find((chapter) => chapter.id === parsed.activeChapterId) ??
            restored[0];
          activeChapterIdRef.current = restoredActive.id;
          setActiveChapterId(restoredActive.id);
          setNotice("Recovered your local chapters.");
          setHydrated(true);
          return;
        }
      }
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const restored = [
          migrateChapter(JSON.parse(legacy) as ChapterDraft, true),
        ];
        chaptersRef.current = restored;
        setChaptersRaw(restored);
        undoStackRef.current = [];
        setCanUndo(false);
        setNotice("Recovered your local edit and updated its staging data.");
      }
    } catch {
      window.localStorage.removeItem(WORKSPACE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({
        dataVersion: SEED_DATA_VERSION,
        chapters,
        activeChapterId,
      }),
    );
  }, [chapters, activeChapterId, hydrated]);

  const chapter = useMemo(
    () =>
      chapters.find((candidate) => candidate.id === activeChapterId) ??
      chapters[0],
    [chapters, activeChapterId],
  );
  const chapterIndex = chapters.indexOf(chapter);
  const eventThreads = useMemo(
    () => buildStoryEventThreads(chapter),
    [chapter],
  );
  const eventThreadIds = useMemo(
    () => eventThreads.map((thread) => thread.id),
    [eventThreads],
  );

  const activeScene = useMemo(
    () =>
      chapter.scenes.find((scene) => scene.id === activeSceneId) ??
      chapter.scenes[0],
    [activeSceneId, chapter.scenes],
  );

  const filteredScenes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chapter.scenes;
    return chapter.scenes.filter(
      (scene) =>
        scene.title.toLowerCase().includes(needle) ||
        scene.id.toLowerCase().includes(needle),
    );
  }, [chapter.scenes, query]);

  const approvedCount = chapter.scenes.filter(
    (scene) => scene.status === "approved" || scene.status === "locked",
  ).length;
  const progress = Math.round(
    (approvedCount / Math.max(chapter.scenes.length, 1)) * 100,
  );

  const updateScene = useCallback(
    (updates: Partial<SceneDraft>) => {
      setChapters((current) =>
        current.map((candidate) =>
          candidate.id !== activeChapterId
            ? candidate
            : {
                ...candidate,
                scenes: candidate.scenes.map((scene) =>
                  scene.id === activeSceneId
                    ? { ...scene, ...updates }
                    : scene,
                ),
              },
        ),
      );
    },
    [activeChapterId, activeSceneId],
  );

  const openScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setTab("source");
    setNavOpen(false);
    setIssues(null);
    setNotice("Scene loaded. Changes save locally as you work.");
  };

  const openChapter = (chapterId: string) => {
    const target = chapters.find((candidate) => candidate.id === chapterId);
    if (!target || chapterId === activeChapterId) return;
    setActiveChapterId(chapterId);
    setActiveSceneId(target.scenes[0]?.id ?? "");
    setTab("source");
    setIssues(null);
    setNotice(`Switched to ${target.title}.`);
  };

  const addScene = () => {
    const index = chapter.scenes.length + 1;
    const existing = new Set(chapter.scenes.map((scene) => scene.id));
    let id = `${chapter.id}_S${String(index).padStart(2, "0")}_NEW`;
    let suffix = 1;
    while (existing.has(id)) {
      suffix += 1;
      id = `${chapter.id}_S${String(index).padStart(2, "0")}_NEW_${suffix}`;
    }
    setChapters((current) =>
      current.map((candidate) =>
        candidate.id === chapter.id
          ? { ...candidate, scenes: [...candidate.scenes, blankScene(id, index)] }
          : candidate,
      ),
    );
    setActiveSceneId(id);
    setTab("source");
    setIssues(null);
    setNotice("Scene added. Paste its source passage to begin.");
  };

  const addChapter = () => {
    const existingIds = new Set(chapters.map((candidate) => candidate.id));
    let number = chapters.length + 1;
    let id = `CH${String(number).padStart(2, "0")}`;
    while (existingIds.has(id)) {
      number += 1;
      id = `CH${String(number).padStart(2, "0")}`;
    }
    const sceneId = `${id}_S01_NEW`;
    setChapters((current) => [
      ...current,
      {
        id,
        title: `Chapter ${number}`,
        sourceFilename: "",
        scenes: [blankScene(sceneId, 1)],
      },
    ]);
    setActiveChapterId(id);
    setActiveSceneId(sceneId);
    setTab("source");
    setIssues(null);
    setNotice(
      `${id} created with a first scene. Paste its source passage, or import scene files instead.`,
    );
  };

  const deleteChapter = () => {
    requestConfirmation({
      title: `Delete ${chapter.title}?`,
      description: `This removes ${chapter.id} and its ${chapter.scenes.length} scene${
        chapter.scenes.length === 1 ? "" : "s"
      } from the local workspace. Exported files are unaffected.`,
      confirmLabel: "Delete chapter",
      onConfirm: () => {
        const remaining = chapters.filter(
          (candidate) => candidate.id !== chapter.id,
        );
        const emptied = remaining.length === 0;
        if (emptied) {
          remaining.push({
            id: "CH01",
            title: "Chapter 1",
            sourceFilename: "",
            scenes: [blankScene("CH01_S01_NEW", 1)],
          });
        }
        setChapters(remaining);
        setActiveChapterId(remaining[0].id);
        setActiveSceneId(remaining[0].scenes[0]?.id ?? "");
        setTab("source");
        setIssues(null);
        setNotice(
          emptied
            ? "Chapter deleted. A blank chapter is ready — undo to restore it."
            : "Chapter deleted. Press ⌘Z or Ctrl+Z to restore it.",
        );
      },
    });
  };

  const deleteScene = () => {
    if (chapter.scenes.length <= 1) {
      setNotice(
        "A chapter needs at least one scene — delete the chapter instead.",
      );
      return;
    }
    requestConfirmation({
      title: `Delete “${activeScene.title}”?`,
      description: `This removes ${activeScene.id}, including its dialogue, staging, and event links, from the local chapter.`,
      confirmLabel: "Delete scene",
      onConfirm: () => {
        const remaining = chapter.scenes
          .filter((scene) => scene.id !== activeScene.id)
          .map((scene, index) => ({ ...scene, order: index + 1 }));
        setChapters((current) =>
          current.map((candidate) =>
            candidate.id === chapter.id
              ? { ...candidate, scenes: remaining }
              : candidate,
          ),
        );
        setActiveSceneId(remaining[0].id);
        setTab("source");
        setIssues(null);
        setNotice("Scene deleted. Press ⌘Z or Ctrl+Z to restore it.");
      },
    });
  };

  const importScenes = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imported: ImportedScene[] = [];
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        imported.push(parseAuthoringScene(await file.text()));
      } catch (error) {
        failures.push(
          `${file.name} (${error instanceof Error ? error.message : "unreadable"})`,
        );
      }
    }
    if (imported.length === 0) {
      setNotice(`Import failed — ${failures.join("; ")}.`);
      return;
    }
    const merged = mergeImports(chapters, imported);
    setChapters(merged.chapters);
    setActiveChapterId(imported[0].chapterId);
    setActiveSceneId(imported[0].scene.id);
    setTab("source");
    setIssues(null);
    const summary = [
      merged.added > 0 ? `${merged.added} new` : "",
      merged.updated > 0 ? `${merged.updated} updated` : "",
    ]
      .filter(Boolean)
      .join(", ");
    setNotice(
      `Imported ${imported.length} scene${imported.length === 1 ? "" : "s"} (${summary}).${
        failures.length > 0 ? ` Skipped ${failures.join("; ")}.` : ""
      }`,
    );
  };

  const jumpToIssue = (issue: CheckIssue) => {
    setTab(issue.tab);
    if (issue.staging) {
      const selection = issue.staging;
      setStagingFocus((current) => ({
        selection,
        token: (current?.token ?? 0) + 1,
      }));
    }
    if (issue.anchorId) {
      window.setTimeout(() => {
        document
          .getElementById(`entity-${issue.anchorId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  };

  const openEventOccurrence = (
    sceneId: string,
    selection: StagingSelection,
  ) => {
    setActiveSceneId(sceneId);
    setTab("staging");
    setStagingFocus((current) => ({
      selection,
      token: (current?.token ?? 0) + 1,
    }));
    setNotice("Opened this occurrence in its scene staging.");
  };

  const updateDialogue = (
    dialogueId: string,
    updater: (dialogue: DialogueUnit) => DialogueUnit,
  ) => {
    updateScene({
      dialogue: activeScene.dialogue.map((dialogue) =>
        dialogue.id === dialogueId ? updater(dialogue) : dialogue,
      ),
    });
  };

  const renameDialogueId = (dialogueId: string, nextId: string) => {
    updateScene({
      dialogue: activeScene.dialogue.map((dialogue) =>
        dialogue.id === dialogueId ? { ...dialogue, id: nextId } : dialogue,
      ),
      beats: activeScene.beats.map((beat) => ({
        ...beat,
        triggerTarget:
          beat.triggerTarget === dialogueId ? nextId : beat.triggerTarget,
        actions: beat.actions.map((action) => ({
          ...action,
          targetId: action.targetId === dialogueId ? nextId : action.targetId,
        })),
      })),
    });
    setNotice(`Dialogue ID renamed to ${nextId}; beat references were updated.`);
  };

  const updateChange = (
    changeId: string,
    updater: (change: StoryChange) => StoryChange,
  ) => {
    updateScene({
      storyChanges: activeScene.storyChanges.map((change) =>
        change.id === changeId ? updater(change) : change,
      ),
    });
  };

  const addDialogueFromSelection = () => {
    const textarea = sourceRef.current;
    if (!textarea) return;
    const selected = textarea.value
      .slice(textarea.selectionStart, textarea.selectionEnd)
      .trim()
      .replace(/^["“]|["”]$/g, "");
    if (!selected) {
      setNotice("Select a line in the source passage first.");
      textarea.focus();
      return;
    }
    const id = makeId("DIALOGUE", selected);
    if (activeScene.dialogue.some((dialogue) => dialogue.id === id)) {
      setNotice("That selection is already in the dialogue list.");
      return;
    }
    updateScene({
      dialogue: [
        ...activeScene.dialogue,
        {
          id,
          speaker: "Unknown speaker",
          text: selected,
          sourceLocked: true,
          status: "unreviewed",
        },
      ],
    });
    setTab("dialogue");
    setNotice("Source dialogue added for review.");
  };

  const addBlankDialogue = () => {
    const id = `GRAYSON_DIALOGUE_NEW_LINE_${activeScene.dialogue.length + 1}`;
    const dialogue: DialogueUnit = {
      id,
      speaker: "Grayson",
      text: "New dialogue line",
      sourceLocked: false,
      status: "unreviewed",
    };
    updateScene({ dialogue: [...activeScene.dialogue, dialogue] });
    setNotice("Added a proposed dialogue line.");
  };

  const attachChoice = (dialogueId: string) => {
    updateDialogue(dialogueId, (dialogue) => ({
      ...dialogue,
      playerChoice: {
        id: `CHOICE_${dialogue.id.replace(/^DIALOGUE_/, "")}`,
        prompt: `How does ${dialogue.speaker} respond?`,
        canonicalBounds:
          "Preserve the canonical scene outcome; record consequences in state.",
        status: "needs_discussion",
        options: [
          {
            id: "OPTION_DIRECT",
            label: "Answer directly",
            effect: "Changes the tone of the exchange.",
            effectScopes: ["scene_variation"],
          },
          {
            id: "OPTION_DEFLECT",
            label: "Deflect",
            effect: "Preserves ambiguity into the next beat.",
            effectScopes: ["self_definition"],
          },
        ],
      },
    }));
    setNotice("Player choice attached. Define a consequence for every option.");
  };

  const updateChoiceOption = (
    dialogueId: string,
    optionId: string,
    updates: Partial<ChoiceOption>,
  ) => {
    updateDialogue(dialogueId, (dialogue) => {
      if (!dialogue.playerChoice) return dialogue;
      return {
        ...dialogue,
        playerChoice: {
          ...dialogue.playerChoice,
          options: dialogue.playerChoice.options.map((option) =>
            option.id === optionId ? { ...option, ...updates } : option,
          ),
        },
      };
    });
  };

  const addChoiceOption = (dialogueId: string) => {
    updateDialogue(dialogueId, (dialogue) => {
      if (!dialogue.playerChoice) return dialogue;
      const index = dialogue.playerChoice.options.length + 1;
      return {
        ...dialogue,
        playerChoice: {
          ...dialogue.playerChoice,
          options: [
            ...dialogue.playerChoice.options,
            {
              id: `OPTION_${index}`,
              label: "New response",
              effect: "Describe what state this response changes.",
              effectScopes: ["scene_variation"],
            },
          ],
        },
      };
    });
  };

  const toggleScope = (
    dialogueId: string,
    option: ChoiceOption,
    scope: EffectScope,
  ) => {
    const effectScopes = option.effectScopes.includes(scope)
      ? option.effectScopes.filter((item) => item !== scope)
      : [...option.effectScopes, scope];
    updateChoiceOption(dialogueId, option.id, { effectScopes });
  };

  const addStoryChange = () => {
    const index = activeScene.storyChanges.length + 1;
    updateScene({
      storyChanges: [
        ...activeScene.storyChanges,
        {
          id: `CHANGE_PROPOSAL_${index}`,
          type: "story_edit",
          canonical: "Describe what happens in the source.",
          proposed: "Describe the game adaptation.",
          rationale: "Explain why this change serves the scene.",
          status: "unreviewed",
        },
      ],
    });
    setNotice("New story-change proposal added.");
  };

  const runChecks = () => {
    const found: CheckIssue[] = [];
    const push = (issue: Omit<CheckIssue, "key">) =>
      found.push({ key: String(found.length), ...issue });

    if (!activeScene.sourceExcerpt.trim()) {
      push({
        location: "Source",
        message:
          "The source passage is empty — paste the passage this scene adapts.",
        tab: "source",
      });
    }
    if (!activeScene.playerGoal.trim()) {
      push({
        location: "Scene settings",
        message:
          "No player goal yet — describe what the player is trying to do (right-hand panel).",
        tab: "source",
      });
    }

    activeScene.dialogue.forEach((dialogue, dialogueIndex) => {
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

    if (activeScene.beats.length === 0) {
      push({
        location: "Staging",
        message:
          "No beats yet — add at least one beat so the scene is playable.",
        tab: "staging",
      });
    }
    const beatIds = new Set(activeScene.beats.map((beat) => beat.id));
    const npcIds = new Set(activeScene.npcs.map((npc) => npc.id));
    const itemIds = new Set(activeScene.items.map((item) => item.id));
    const interactableIds = new Set(
      activeScene.interactables.map((interactable) => interactable.id),
    );
    const hudIds = new Set(activeScene.hudEvents.map((event) => event.id));
    const dialogueIds = new Set(
      activeScene.dialogue.map((dialogue) => dialogue.id),
    );

    activeScene.npcs.forEach((npc) => {
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

    activeScene.items.forEach((item) => {
      if (!item.name.trim() || !item.outcome.trim()) {
        push({
          location: "Staging · Items",
          message: `${item.name.trim() || item.id} needs a name and an interaction outcome.`,
          tab: "staging",
          staging: { kind: "item", id: item.id },
        });
      }
    });

    activeScene.interactables.forEach((interactable) => {
      if (!interactable.name.trim() || !interactable.outcome.trim()) {
        push({
          location: "Staging · Interactables",
          message: `${interactable.name.trim() || interactable.id} needs a name and an interaction outcome.`,
          tab: "staging",
          staging: { kind: "interactable", id: interactable.id },
        });
      }
    });

    activeScene.hudEvents.forEach((event) => {
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

    activeScene.beats.forEach((beat, beatIndex) => {
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

    setIssues(found);
    setNotice(
      found.length > 0
        ? `${found.length} issue${found.length === 1 ? "" : "s"} found — click one below to jump straight to it.`
        : `Scene checks passed: ${activeScene.beats.length} beat${activeScene.beats.length === 1 ? "" : "s"}, ${activeScene.npcs.length} NPC${activeScene.npcs.length === 1 ? "" : "s"}, ${activeScene.interactables.length} interactable${activeScene.interactables.length === 1 ? "" : "s"}, ${activeScene.items.length} inventory item${activeScene.items.length === 1 ? "" : "s"}, and ${activeScene.hudEvents.length} HUD event${activeScene.hudEvents.length === 1 ? "" : "s"}.`,
    );
  };

  const exportScene = (mode: OutputMode) => {
    const stem = activeScene.id;
    if (mode === "yaml") {
      downloadText(
        `${stem}.authoring.yaml`,
        sceneToYaml(activeScene),
        "application/yaml",
      );
    } else {
      downloadText(
        `${stem}.normalized.json`,
        sceneToJson(activeScene),
        "application/json",
      );
    }
    setNotice(`${mode.toUpperCase()} export prepared.`);
  };

  const output =
    outputMode === "yaml" ? sceneToYaml(activeScene) : sceneToJson(activeScene);
  const stagingReviewed =
    activeScene.beats.length > 0 &&
    [
      ...activeScene.beats,
      ...activeScene.npcs,
      ...activeScene.interactables,
      ...activeScene.items,
      ...activeScene.hudEvents,
    ].every((item) => item.status !== "unreviewed");
  const activeSceneResourceIds = useMemo(
    () => [
      ...activeScene.dialogue.map((item) => item.id),
      ...activeScene.npcs.map((item) => item.id),
      ...activeScene.interactables.map((item) => item.id),
      ...activeScene.items.map((item) => item.id),
      ...activeScene.hudEvents.map((item) => item.id),
      ...activeScene.beats.map((item) => item.id),
    ],
    [
      activeScene.beats,
      activeScene.dialogue,
      activeScene.hudEvents,
      activeScene.interactables,
      activeScene.items,
      activeScene.npcs,
    ],
  );

  return (
    <main className="app-shell">
      <ConfirmationDialog
        request={confirmation}
        onCancel={closeConfirmation}
      />
      <header className="topbar">
        <div className="brand-lockup">
          <button
            className="icon-button mobile-only"
            aria-label="Open chapter navigation"
            onClick={() => setNavOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="brand-mark">
            <BookOpenText size={20} strokeWidth={1.8} />
          </div>
          <div>
            <div className="brand-name">Scenework</div>
            <div className="brand-kicker">Book to Unreal</div>
          </div>
        </div>
        <div className="topbar-center">
          <span className="crumb-muted">
            Chapter {String(chapterIndex + 1).padStart(2, "0")}
          </span>
          <span className="crumb-divider">/</span>
          <span>{activeScene.title}</span>
          <span className={`scene-state state-${activeScene.status}`}>
            {sceneStatusLabel[activeScene.status]}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className="button button-quiet"
            onClick={undo}
            disabled={!canUndo}
            title="Undo last workspace change (⌘Z or Ctrl+Z)"
          >
            <Undo2 size={16} />
            <span className="desktop-label">Undo</span>
          </button>
          <button className="button button-quiet" onClick={runChecks}>
            <ShieldCheck size={16} />
            <span className="desktop-label">Run checks</span>
          </button>
          <button
            className="button button-primary"
            onClick={() => exportScene("yaml")}
          >
            <Download size={16} />
            <span className="desktop-label">Export YAML</span>
          </button>
          <button
            className="icon-button mobile-only"
            aria-label="Open scene settings"
            onClick={() => setInspectorOpen(true)}
          >
            <PanelTop size={19} />
          </button>
        </div>
      </header>

      <aside className={`chapter-rail ${navOpen ? "is-open" : ""}`}>
        <div className="mobile-drawer-head">
          <span>Chapter navigation</span>
          <button
            className="icon-button"
            aria-label="Close chapter navigation"
            onClick={() => setNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <section className="chapter-summary">
          <div className="chapter-switch-row">
            <div className="eyebrow">Current chapter</div>
            {chapters.length > 1 && (
              <label className="chapter-switcher">
                <select
                  aria-label="Switch chapter"
                  value={chapter.id}
                  onChange={(event) => openChapter(event.target.value)}
                >
                  {chapters.map((candidate, index) => (
                    <option key={candidate.id} value={candidate.id}>
                      {String(index + 1).padStart(2, "0")} · {candidate.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
            )}
          </div>
          <div className="chapter-title-row">
            <div>
              <div className="chapter-number">
                {String(chapterIndex + 1).padStart(2, "0")}
              </div>
              <input
                className="chapter-title-edit"
                aria-label="Chapter title"
                value={chapter.title}
                onChange={(event) =>
                  setChapters((current) =>
                    current.map((candidate) =>
                      candidate.id === chapter.id
                        ? { ...candidate, title: event.target.value }
                        : candidate,
                    ),
                  )
                }
              />
            </div>
            <button
              className="icon-button danger-hover"
              aria-label="Delete chapter"
              onClick={deleteChapter}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="chapter-meta">
            <span>{chapter.scenes.length} scenes</span>
            <span>{approvedCount} approved</span>
          </div>
          <div className="progress-track" aria-label={`${progress}% approved`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </section>

        <div className="scene-search">
          <Search aria-hidden size={15} />
          <input
            aria-label="Search scenes"
            placeholder="Find a scene"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <nav className="scene-list" aria-label="Chapter scenes">
          {filteredScenes.map((scene) => (
            <button
              className={`scene-nav-item ${
                scene.id === activeScene.id ? "is-active" : ""
              }`}
              key={scene.id}
              onClick={() => openScene(scene.id)}
            >
              <span className="scene-order">{String(scene.order).padStart(2, "0")}</span>
              <span className="scene-nav-copy">
                <strong>{scene.title}</strong>
                <small>
                  {scene.presentationMode === "scrolling_hd2d"
                    ? "Scrolling HD-2D"
                    : "Static cinematic"}
                </small>
              </span>
              <span className={`status-icon status-${scene.status}`}>
                <StatusDot status={scene.status} />
              </span>
            </button>
          ))}
        </nav>

        <div className="rail-footer">
          <button className="button button-full button-quiet" onClick={addScene}>
            <Plus size={16} />
            Add scene
          </button>
          <div className="rail-footer-row">
            <button className="button button-quiet" onClick={addChapter}>
              <BookPlus size={15} />
              New chapter
            </button>
            <button
              className="button button-quiet"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={15} />
              Import scenes
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".yaml,.yml,.json"
            multiple
            hidden
            onChange={(event) => {
              void importScenes(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="source-file">
            <FileText size={15} />
            <span>
              <small>Source</small>
              {chapter.sourceFilename || "No source file yet"}
            </span>
            {chapter.sourceFilename ? <Check size={14} /> : null}
          </div>
        </div>
      </aside>

      {(navOpen || inspectorOpen) && (
        <button
          className="drawer-scrim"
          aria-label="Close open panel"
          onClick={() => {
            setNavOpen(false);
            setInspectorOpen(false);
          }}
        />
      )}

      <section className="workspace">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">{activeScene.id}</div>
            <input
              className="scene-title-input"
              aria-label="Scene title"
              value={activeScene.title}
              onChange={(event) => updateScene({ title: event.target.value })}
            />
          </div>
          <div className="workspace-heading-tools">
            <div className="save-state">
              <Save size={14} />
              Saved locally
            </div>
            <button
              className="icon-button danger-hover"
              aria-label="Delete scene"
              onClick={deleteScene}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="tab-bar" role="tablist" aria-label="Scene workspace">
          {(
            [
              ["source", "Source", FileText],
              ["dialogue", "Dialogue", MessageSquareQuote],
              ["staging", "Staging", Clapperboard],
              ["events", "Event threads", Network],
              ["changes", "Story changes", GitBranch],
              ["output", "Output", FileJson2],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              className={tab === value ? "is-active" : ""}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
            >
              <Icon size={15} />
              {label}
              {value === "dialogue" && activeScene.dialogue.length > 0 && (
                <span className="tab-count">{activeScene.dialogue.length}</span>
              )}
              {value === "staging" && activeScene.beats.length > 0 && (
                <span className="tab-count">{activeScene.beats.length}</span>
              )}
              {value === "events" && eventThreads.length > 0 && (
                <span className="tab-count">{eventThreads.length}</span>
              )}
              {value === "changes" && activeScene.storyChanges.length > 0 && (
                <span className="tab-count">
                  {activeScene.storyChanges.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="notice-bar" role="status">
          <Sparkles size={14} />
          <span>{notice}</span>
        </div>

        {issues && (
          <div
            className={`issues-panel ${issues.length === 0 ? "is-clear" : ""}`}
            role="region"
            aria-label="Scene check results"
          >
            <div className="issues-head">
              <span className="issues-title">
                {issues.length === 0 ? (
                  <>
                    <CheckCircle2 size={15} />
                    All checks pass — this scene is staged and reviewable.
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} />
                    {issues.length} thing{issues.length === 1 ? "" : "s"} to
                    resolve
                  </>
                )}
              </span>
              <span className="issues-tools">
                <button className="text-button" onClick={runChecks}>
                  Re-run
                </button>
                <button
                  className="icon-button"
                  aria-label="Dismiss check results"
                  onClick={() => setIssues(null)}
                >
                  <X size={14} />
                </button>
              </span>
            </div>
            {issues.length > 0 && (
              <ul className="issues-list">
                {issues.map((issue) => (
                  <li key={issue.key}>
                    <button onClick={() => jumpToIssue(issue)}>
                      <span className="issue-location">{issue.location}</span>
                      <span className="issue-message">{issue.message}</span>
                      <ArrowRight size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="workspace-scroll">
          {tab === "source" && (
            <section className="editor-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Source passage</div>
                  <h2>Select the lines that become playable dialogue.</h2>
                </div>
                <button
                  className="button button-secondary"
                  onClick={addDialogueFromSelection}
                >
                  <MessageSquareQuote size={16} />
                  Mark selection as dialogue
                </button>
              </div>
              <div className="source-paper">
                <div className="source-gutter">
                  {Array.from({
                    length: Math.max(
                      8,
                      activeScene.sourceExcerpt.split("\n").length,
                    ),
                  }).map((_, index) => (
                    <span key={index}>{index + 1}</span>
                  ))}
                </div>
                <textarea
                  ref={sourceRef}
                  aria-label="Scene source passage"
                  placeholder="Paste or load the source passage for this scene…"
                  value={activeScene.sourceExcerpt}
                  onChange={(event) =>
                    updateScene({ sourceExcerpt: event.target.value })
                  }
                />
              </div>
              <div className="source-help">
                <span>
                  Select exact source text to preserve traceability. Proposed lines
                  can be added in Dialogue.
                </span>
                <span>
                  {activeScene.sourceExcerpt.trim().split(/\s+/).filter(Boolean)
                    .length || 0}{" "}
                  words
                </span>
              </div>
            </section>
          )}

          {tab === "dialogue" && (
            <section className="editor-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Dialogue map</div>
                  <h2>Approve the line, then define what a choice changes.</h2>
                </div>
                <button
                  className="button button-secondary"
                  onClick={addBlankDialogue}
                >
                  <Plus size={16} />
                  Propose line
                </button>
              </div>

              {activeScene.dialogue.length === 0 ? (
                <div className="empty-state">
                  <MessageSquareQuote size={26} />
                  <h3>No dialogue selected yet</h3>
                  <p>
                    Select exact text in Source, or add a proposed line that is
                    explicitly separate from canon.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={() => setTab("source")}
                  >
                    Go to source
                  </button>
                </div>
              ) : (
                <div className="dialogue-stack">
                  {activeScene.dialogue.map((dialogue, dialogueIndex) => (
                    <article
                      className="dialogue-card"
                      id={`entity-${dialogue.id}`}
                      key={dialogue.id}
                    >
                      <div className="dialogue-card-head">
                        <span className="dialogue-index">
                          D{String(dialogueIndex + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`source-chip ${
                            dialogue.sourceLocked ? "is-canon" : "is-proposed"
                          }`}
                        >
                          {dialogue.sourceLocked
                            ? "Source locked"
                            : "Proposed line"}
                        </span>
                        <ReviewPill
                          value={dialogue.status}
                          onChange={(status) =>
                            updateDialogue(dialogue.id, (item) => ({
                              ...item,
                              status,
                            }))
                          }
                        />
                        <button
                          className="icon-button danger-hover"
                          aria-label="Remove dialogue line"
                          onClick={() =>
                            requestConfirmation({
                              title: `Delete ${dialogue.speaker || "this"} line?`,
                              description: `This removes “${truncate(dialogue.text, 90)}” and may leave beat references that need review.`,
                              confirmLabel: "Delete dialogue",
                              onConfirm: () => {
                                updateScene({
                                  dialogue: activeScene.dialogue.filter(
                                    (item) => item.id !== dialogue.id,
                                  ),
                                });
                                setNotice(
                                  "Dialogue deleted. Press ⌘Z or Ctrl+Z to restore it.",
                                );
                              },
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="dialogue-fields">
                        <IdField
                          className="dialogue-id-field"
                          label="Dialogue ID"
                          ariaLabel={`Dialogue ${dialogueIndex + 1} ID`}
                          value={dialogue.id}
                          suggestedId={dialogueIdSuggestion(
                            dialogue.speaker,
                            dialogue.text,
                          )}
                          suggestionReason="Character dialogue begins with the speaker name, then DIALOGUE, then a short line cadence."
                          reservedIds={activeSceneResourceIds.filter(
                            (id) => id !== dialogue.id,
                          )}
                          onCommit={(nextId) =>
                            renameDialogueId(dialogue.id, nextId)
                          }
                        />
                        <label>
                          <span>Speaker</span>
                          <input
                            value={dialogue.speaker}
                            onChange={(event) =>
                              updateDialogue(dialogue.id, (item) => ({
                                ...item,
                                speaker: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="dialogue-line-field">
                          <span>Line</span>
                          <textarea
                            value={dialogue.text}
                            onChange={(event) =>
                              updateDialogue(dialogue.id, (item) => ({
                                ...item,
                                text: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      {!dialogue.playerChoice ? (
                        <button
                          className="choice-add"
                          onClick={() => attachChoice(dialogue.id)}
                        >
                          <span>
                            <GitBranch size={17} />
                          </span>
                          <span>
                            <strong>Add a player choice</strong>
                            <small>
                              Every option must write relationship, identity, or
                              scene state.
                            </small>
                          </span>
                          <Plus size={16} />
                        </button>
                      ) : (
                        <div className="choice-builder">
                          <div className="choice-builder-head">
                            <div>
                              <span className="eyebrow">Player choice</span>
                              <input
                                aria-label="Choice prompt"
                                value={dialogue.playerChoice.prompt}
                                onChange={(event) =>
                                  updateDialogue(dialogue.id, (item) => ({
                                    ...item,
                                    playerChoice: item.playerChoice
                                      ? {
                                          ...item.playerChoice,
                                          prompt: event.target.value,
                                        }
                                      : undefined,
                                  }))
                                }
                              />
                            </div>
                            <ReviewPill
                              value={dialogue.playerChoice.status}
                              onChange={(status) =>
                                updateDialogue(dialogue.id, (item) => ({
                                  ...item,
                                  playerChoice: item.playerChoice
                                    ? { ...item.playerChoice, status }
                                    : undefined,
                                }))
                              }
                            />
                          </div>
                          <label className="bounds-field">
                            <span>Canonical bounds</span>
                            <textarea
                              value={dialogue.playerChoice.canonicalBounds}
                              onChange={(event) =>
                                updateDialogue(dialogue.id, (item) => ({
                                  ...item,
                                  playerChoice: item.playerChoice
                                    ? {
                                        ...item.playerChoice,
                                        canonicalBounds: event.target.value,
                                      }
                                    : undefined,
                                }))
                              }
                            />
                          </label>
                          <div className="choice-options">
                            {dialogue.playerChoice.options.map(
                              (option, optionIndex) => (
                                <article className="choice-option" key={option.id}>
                                  <div className="choice-letter">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </div>
                                  <div className="choice-option-body">
                                    <input
                                      className="choice-label-input"
                                      aria-label={`Choice ${optionIndex + 1} label`}
                                      value={option.label}
                                      onChange={(event) =>
                                        updateChoiceOption(
                                          dialogue.id,
                                          option.id,
                                          { label: event.target.value },
                                        )
                                      }
                                    />
                                    <textarea
                                      aria-label={`Choice ${optionIndex + 1} effect`}
                                      value={option.effect}
                                      onChange={(event) =>
                                        updateChoiceOption(
                                          dialogue.id,
                                          option.id,
                                          { effect: event.target.value },
                                        )
                                      }
                                    />
                                    <div className="scope-row">
                                      {effectScopes.map((scope) => (
                                        <button
                                          key={scope.value}
                                          className={
                                            option.effectScopes.includes(
                                              scope.value,
                                            )
                                              ? "is-selected"
                                              : ""
                                          }
                                          onClick={() =>
                                            toggleScope(
                                              dialogue.id,
                                              option,
                                              scope.value,
                                            )
                                          }
                                        >
                                          {scope.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {dialogue.playerChoice &&
                                    dialogue.playerChoice.options.length > 2 && (
                                      <button
                                        className="icon-button danger-hover"
                                        aria-label="Remove choice option"
                                        onClick={() =>
                                          requestConfirmation({
                                            title: `Delete “${option.label}”?`,
                                            description:
                                              "This removes the response and its recorded consequence from the player choice.",
                                            confirmLabel: "Delete response",
                                            onConfirm: () =>
                                              updateDialogue(
                                                dialogue.id,
                                                (item) => ({
                                                  ...item,
                                                  playerChoice:
                                                    item.playerChoice
                                                      ? {
                                                          ...item.playerChoice,
                                                          options:
                                                            item.playerChoice.options.filter(
                                                              (candidate) =>
                                                                candidate.id !==
                                                                option.id,
                                                            ),
                                                        }
                                                      : undefined,
                                                }),
                                              ),
                                          })
                                        }
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                </article>
                              ),
                            )}
                          </div>
                          <div className="choice-builder-footer">
                            <button
                              className="button button-quiet"
                              onClick={() => addChoiceOption(dialogue.id)}
                            >
                              <Plus size={15} />
                              Add response
                            </button>
                            <button
                              className="text-button danger-text"
                              onClick={() =>
                                requestConfirmation({
                                  title: "Remove this player choice?",
                                  description:
                                    "This deletes every response, consequence, and canonical-bound note attached to the dialogue line.",
                                  confirmLabel: "Remove choice",
                                  onConfirm: () =>
                                    updateDialogue(dialogue.id, (item) => ({
                                      ...item,
                                      playerChoice: undefined,
                                    })),
                                })
                              }
                            >
                              Remove choice
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "staging" && (
            <StagingEditor
              scene={activeScene}
              onChange={updateScene}
              onNotice={setNotice}
              focusRequest={stagingFocus}
              eventThreadIds={eventThreadIds}
              onRequestConfirmation={requestConfirmation}
            />
          )}

          {tab === "events" && (
            <EventThreadView
              chapter={chapter}
              onOpenOccurrence={openEventOccurrence}
            />
          )}

          {tab === "changes" && (
            <section className="editor-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Adaptation ledger</div>
                  <h2>Nothing changes from the source without a decision.</h2>
                </div>
                <button
                  className="button button-secondary"
                  onClick={addStoryChange}
                >
                  <Plus size={16} />
                  Propose change
                </button>
              </div>
              {activeScene.storyChanges.length === 0 ? (
                <div className="empty-state compact">
                  <GitBranch size={25} />
                  <h3>No changes from source</h3>
                  <p>
                    This scene currently preserves source order, staging,
                    character presence, motivation, and outcome.
                  </p>
                </div>
              ) : (
                <div className="change-stack">
                  {activeScene.storyChanges.map((change) => (
                    <article className="change-card" key={change.id}>
                      <div className="change-card-head">
                        <span className="change-type">{change.type}</span>
                        <ReviewPill
                          value={change.status}
                          onChange={(status) =>
                            updateChange(change.id, (item) => ({
                              ...item,
                              status,
                            }))
                          }
                        />
                      </div>
                      <div className="change-compare">
                        <label>
                          <span>Source canon</span>
                          <textarea
                            value={change.canonical}
                            onChange={(event) =>
                              updateChange(change.id, (item) => ({
                                ...item,
                                canonical: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="change-arrow">
                          <ArrowUpRight size={18} />
                        </div>
                        <label>
                          <span>Game proposal</span>
                          <textarea
                            value={change.proposed}
                            onChange={(event) =>
                              updateChange(change.id, (item) => ({
                                ...item,
                                proposed: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label className="rationale-field">
                        <span>Why this serves the adaptation</span>
                        <input
                          value={change.rationale}
                          onChange={(event) =>
                            updateChange(change.id, (item) => ({
                              ...item,
                              rationale: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "output" && (
            <section className="editor-section output-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Portable scene data</div>
                  <h2>Review the authoring contract before export.</h2>
                </div>
                <div className="output-actions">
                  <div className="segmented-control">
                    <button
                      className={outputMode === "yaml" ? "is-active" : ""}
                      onClick={() => setOutputMode("yaml")}
                    >
                      YAML
                    </button>
                    <button
                      className={outputMode === "json" ? "is-active" : ""}
                      onClick={() => setOutputMode("json")}
                    >
                      JSON
                    </button>
                  </div>
                  <button
                    className="button button-secondary"
                    onClick={() => exportScene(outputMode)}
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
              <pre className="output-code">
                <code>{output}</code>
              </pre>
              <div className="output-note">
                <ShieldCheck size={16} />
                Staging captures author intent. The runtime compiler still owns
                exact geometry, assets, coordinates, and executable Unreal
                actions.
              </div>
            </section>
          )}
        </div>
      </section>

      <aside className={`inspector ${inspectorOpen ? "is-open" : ""}`}>
        <div className="mobile-drawer-head">
          <span>Scene settings</span>
          <button
            className="icon-button"
            aria-label="Close scene settings"
            onClick={() => setInspectorOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="inspector-scroll">
          <section className="inspector-section">
            <div className="inspector-heading">
              <span>Scene state</span>
              <span className={`scene-state state-${activeScene.status}`}>
                {sceneStatusLabel[activeScene.status]}
              </span>
            </div>
            <label className="field-label">
              <span>Review status</span>
              <select
                value={activeScene.status}
                onChange={(event) =>
                  updateScene({ status: event.target.value as SceneStatus })
                }
              >
                {Object.entries(sceneStatusLabel).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              <span>Player goal</span>
              <textarea
                value={activeScene.playerGoal}
                onChange={(event) =>
                  updateScene({ playerGoal: event.target.value })
                }
              />
            </label>
          </section>

          <section className="inspector-section">
            <div className="inspector-heading">
              <span>Presentation</span>
              <MonitorPlay size={16} />
            </div>
            <p className="inspector-copy">
              Choose how the player reads and moves through this scene.
            </p>
            <div className="presentation-grid">
              <button
                className={
                  activeScene.presentationMode === "scrolling_hd2d"
                    ? "is-selected"
                    : ""
                }
                onClick={() =>
                  updateScene({ presentationMode: "scrolling_hd2d" })
                }
              >
                <span className="presentation-icon">
                  <MoveHorizontal size={20} />
                </span>
                <span>
                  <strong>Scrolling HD-2D</strong>
                  <small>
                    Player traverses a composed side-view environment.
                  </small>
                </span>
                <span className="selection-dot">
                  {activeScene.presentationMode === "scrolling_hd2d" && (
                    <Check size={12} />
                  )}
                </span>
              </button>
              <button
                className={
                  activeScene.presentationMode === "static_cinematic"
                    ? "is-selected"
                    : ""
                }
                onClick={() =>
                  updateScene({ presentationMode: "static_cinematic" })
                }
              >
                <span className="presentation-icon">
                  <PanelLeftClose size={20} />
                </span>
                <span>
                  <strong>Static cinematic</strong>
                  <small>
                    Fixed FF7-style composition with staged interaction.
                  </small>
                </span>
                <span className="selection-dot">
                  {activeScene.presentationMode === "static_cinematic" && (
                    <Check size={12} />
                  )}
                </span>
              </button>
            </div>
          </section>

          <section className="inspector-section">
            <div className="inspector-heading">
              <span>Scene readiness</span>
              <span className="readiness-score">
                {
                  [
                    activeScene.sourceExcerpt.trim(),
                    activeScene.playerGoal.trim(),
                    activeScene.presentationMode,
                    activeScene.storyChanges.every(
                      (change) => change.status !== "unreviewed",
                    ),
                    stagingReviewed,
                  ].filter(Boolean).length
                }
                /5
              </span>
            </div>
            <ul className="readiness-list">
              <li className={activeScene.sourceExcerpt.trim() ? "done" : ""}>
                <span>
                  {activeScene.sourceExcerpt.trim() ? (
                    <Check size={12} />
                  ) : (
                    <Circle size={10} />
                  )}
                </span>
                Source passage
              </li>
              <li className={activeScene.playerGoal.trim() ? "done" : ""}>
                <span>
                  {activeScene.playerGoal.trim() ? (
                    <Check size={12} />
                  ) : (
                    <Circle size={10} />
                  )}
                </span>
                Player goal
              </li>
              <li className="done">
                <span>
                  <Check size={12} />
                </span>
                Presentation selected
              </li>
              <li
                className={
                  activeScene.storyChanges.every(
                    (change) => change.status !== "unreviewed",
                  )
                    ? "done"
                    : ""
                }
              >
                <span>
                  {activeScene.storyChanges.every(
                    (change) => change.status !== "unreviewed",
                  ) ? (
                    <Check size={12} />
                  ) : (
                    <Circle size={10} />
                  )}
                </span>
                Changes reviewed
              </li>
              <li className={stagingReviewed ? "done" : ""}>
                <span>
                  {stagingReviewed ? (
                    <Check size={12} />
                  ) : (
                    <Circle size={10} />
                  )}
                </span>
                Staging reviewed
              </li>
            </ul>
          </section>

          <section className="inspector-section">
            <label className="field-label">
              <span>Author notes</span>
              <textarea
                className="notes-field"
                placeholder="Record intent, open questions, or a staging reminder…"
                value={activeScene.notes}
                onChange={(event) => updateScene({ notes: event.target.value })}
              />
            </label>
          </section>
        </div>
        <div className="inspector-footer">
          <button
            className="button button-full button-primary"
            onClick={() =>
              updateScene({
                status:
                  activeScene.status === "approved"
                    ? "needs_author_review"
                    : "approved",
              })
            }
          >
            <CheckCircle2 size={16} />
            {activeScene.status === "approved"
              ? "Reopen scene"
              : "Approve scene"}
          </button>
          <button className="text-button" onClick={() => setTab("output")}>
            Review output
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
    </main>
  );
}
