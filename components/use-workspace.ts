"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";

import type {
  ChapterDraft,
  EngineTarget,
  ProjectDraft,
  SceneDraft,
} from "@/lib/editor-types";
import { authoringSha256 } from "@/lib/layout-model";
import { toAuthoringDocument } from "@/lib/scene-export";
import { migrateChapter } from "@/lib/workspace-migrations";

// v2 introduces the project (book) layer above chapters. v1 workspaces are not
// migrated — the app starts clean at the project level.
const WORKSPACE_KEY = "scenework.workspace.v2";
const SEED_DATA_VERSION = 4;
const SEED_PROJECT_ID = "BOOK_1";

interface UndoSnapshot {
  projects: ProjectDraft[];
  activeProjectId: string;
  activeChapterId: string;
  activeSceneId: string;
}

export function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function blankScene(id: string, order: number): SceneDraft {
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

function blankChapter(): ChapterDraft {
  return {
    id: "CH01",
    title: "Chapter 1",
    sourceFilename: "",
    scenes: [blankScene("CH01_S01_NEW", 1)],
  };
}

// A brand-new, empty book. Used for the initial seed and whenever the last
// book is deleted, so the workspace is never stranded with zero projects.
export function seedProject(id: string = SEED_PROJECT_ID): ProjectDraft {
  return {
    id,
    title: "Untitled Book",
    targetEngine: "unreal",
    chapters: [blankChapter()],
  };
}

export function newProjectId() {
  return `BOOK_${Date.now().toString(36).toUpperCase()}`;
}

export interface Workspace {
  projects: ProjectDraft[];
  setProjects: (update: SetStateAction<ProjectDraft[]>) => void;
  setChapters: (update: SetStateAction<ChapterDraft[]>) => void;
  setTargetEngine: (engine: EngineTarget) => void;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  activeChapterId: string;
  setActiveChapterId: (id: string) => void;
  activeSceneId: string;
  setActiveSceneId: (id: string) => void;
  canUndo: boolean;
  /** Restore the previous workspace snapshot; "empty" when nothing to undo. */
  undo: () => "empty" | "undone";
  authoringHashes: Record<string, string>;
  hashesPending: boolean;
}

/**
 * Owns the persisted book/chapter/scene workspace: undo history with typing
 * coalescing, localStorage hydration and persistence, and the per-scene
 * authoring SHA-256 hashes used for layout-staleness checks. UI concerns
 * (notices beyond hydration recovery, the checks panel, confirmations) stay in
 * the caller; `undo` reports its result so the caller can update those.
 */
export function useWorkspace(onNotice: (message: string) => void): Workspace {
  const [projects, setProjectsRaw] = useState<ProjectDraft[]>(() => [
    seedProject(),
  ]);
  const [activeProjectId, setActiveProjectId] = useState(SEED_PROJECT_ID);
  const [activeChapterId, setActiveChapterId] = useState("CH01");
  const [activeSceneId, setActiveSceneId] = useState("CH01_S01_NEW");
  const [canUndo, setCanUndo] = useState(false);
  const [authoringHashes, setAuthoringHashes] = useState<
    Record<string, string>
  >({});
  const [hashesPending, setHashesPending] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const projectsRef = useRef<ProjectDraft[]>(projects);
  const activeProjectIdRef = useRef(activeProjectId);
  const activeChapterIdRef = useRef(activeChapterId);
  const activeSceneIdRef = useRef(activeSceneId);
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const lastHistoryInputRef = useRef<{
    element: Element | null;
    at: number;
  } | null>(null);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    activeChapterIdRef.current = activeChapterId;
  }, [activeChapterId]);

  useEffect(() => {
    activeSceneIdRef.current = activeSceneId;
  }, [activeSceneId]);

  // Low-level writer: drives undo history + persistence for the whole book set.
  const setProjects = useCallback(
    (update: SetStateAction<ProjectDraft[]>) => {
      const current = projectsRef.current;
      const next =
        typeof update === "function"
          ? (update as (value: ProjectDraft[]) => ProjectDraft[])(current)
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
          projects: current,
          activeProjectId: activeProjectIdRef.current,
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
      projectsRef.current = next;
      setProjectsRaw(next);
      setCanUndo(undoStackRef.current.length > 0);
    },
    [],
  );

  // Edits target the active book's chapters. Every existing `setChapters(...)`
  // call site keeps working — the write is funneled into the active project.
  const setChapters = useCallback(
    (update: SetStateAction<ChapterDraft[]>) => {
      const activeId = activeProjectIdRef.current;
      setProjects((current) => {
        let changed = false;
        const next = current.map((project) => {
          if (project.id !== activeId) return project;
          const nextChapters =
            typeof update === "function"
              ? (update as (value: ChapterDraft[]) => ChapterDraft[])(
                  project.chapters,
                )
              : update;
          if (nextChapters === project.chapters) return project;
          changed = true;
          return { ...project, chapters: nextChapters };
        });
        return changed ? next : current;
      });
    },
    [setProjects],
  );

  const setTargetEngine = useCallback(
    (engine: EngineTarget) => {
      const activeId = activeProjectIdRef.current;
      setProjects((current) =>
        current.map((project) =>
          project.id === activeId && project.targetEngine !== engine
            ? { ...project, targetEngine: engine }
            : project,
        ),
      );
    },
    [setProjects],
  );

  const undo = useCallback((): "empty" | "undone" => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return "empty";
    lastHistoryInputRef.current = null;
    projectsRef.current = snapshot.projects;
    setProjectsRaw(snapshot.projects);
    activeProjectIdRef.current = snapshot.activeProjectId;
    activeChapterIdRef.current = snapshot.activeChapterId;
    activeSceneIdRef.current = snapshot.activeSceneId;
    setActiveProjectId(snapshot.activeProjectId);
    setActiveChapterId(snapshot.activeChapterId);
    setActiveSceneId(snapshot.activeSceneId);
    setCanUndo(undoStackRef.current.length > 0);
    return "undone";
  }, []);

  useEffect(() => {
    try {
      const savedWorkspace = window.localStorage.getItem(WORKSPACE_KEY);
      if (savedWorkspace) {
        const parsed = JSON.parse(savedWorkspace) as {
          projects?: ProjectDraft[];
          activeProjectId?: string;
          activeChapterId?: string;
          dataVersion?: number;
        };
        if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          const enrichSeedDetails =
            (parsed.dataVersion ?? 1) < SEED_DATA_VERSION;
          const restored = parsed.projects.map((project) => ({
            ...project,
            targetEngine: project.targetEngine ?? "unreal",
            chapters: (project.chapters ?? []).map((chapter) =>
              migrateChapter(chapter, enrichSeedDetails),
            ),
          }));
          projectsRef.current = restored;
          setProjectsRaw(restored);
          undoStackRef.current = [];
          setCanUndo(false);
          const restoredProject =
            restored.find(
              (project) => project.id === parsed.activeProjectId,
            ) ?? restored[0];
          const restoredChapter =
            restoredProject.chapters.find(
              (chapter) => chapter.id === parsed.activeChapterId,
            ) ?? restoredProject.chapters[0];
          activeProjectIdRef.current = restoredProject.id;
          setActiveProjectId(restoredProject.id);
          if (restoredChapter) {
            activeChapterIdRef.current = restoredChapter.id;
            setActiveChapterId(restoredChapter.id);
            setActiveSceneId(restoredChapter.scenes[0]?.id ?? "");
          }
          onNotice("Recovered your local books.");
        }
      }
    } catch {
      // Corrupt workspace: fall through to the clean seed already in state.
    }
    setHydrated(true);
    // Runs once on mount; onNotice is stable (a state setter).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({
        dataVersion: SEED_DATA_VERSION,
        projects,
        activeProjectId,
        activeChapterId,
      }),
    );
  }, [projects, activeProjectId, activeChapterId, hydrated]);

  const activeProject = useMemo(
    () =>
      projects.find((candidate) => candidate.id === activeProjectId) ??
      projects[0],
    [projects, activeProjectId],
  );

  const authoringHashInput = useMemo(
    () =>
      activeProject.chapters
        .flatMap((candidate) =>
          candidate.scenes.map((scene) => [
            scene.id,
            JSON.stringify(toAuthoringDocument(scene)),
          ]),
        )
        .map(([sceneId, document]) => `${sceneId}:${document}`)
        .join("\n"),
    [activeProject.chapters],
  );

  useEffect(() => {
    let cancelled = false;
    setHashesPending(true);
    void Promise.all(
      activeProject.chapters.flatMap((candidate) =>
        candidate.scenes.map(async (scene) => [
          scene.id,
          await authoringSha256(scene),
        ] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setAuthoringHashes(Object.fromEntries(entries));
      setHashesPending(false);
    });
    return () => {
      cancelled = true;
    };
    // authoringHashInput excludes layout-only changes by construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authoringHashInput]);

  return {
    projects,
    setProjects,
    setChapters,
    setTargetEngine,
    activeProjectId,
    setActiveProjectId,
    activeChapterId,
    setActiveChapterId,
    activeSceneId,
    setActiveSceneId,
    canUndo,
    undo,
    authoringHashes,
    hashesPending,
  };
}
