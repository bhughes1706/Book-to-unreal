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
  Library,
  Menu,
  Map,
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

import {
  ConfirmationDialog,
  type ConfirmationRequest,
} from "@/components/confirmation-dialog";
import { EventThreadView } from "@/components/event-thread-view";
import { ReviewPill } from "@/components/review-pill";
import {
  ChangesTab,
  DialogueTab,
  OutputTab,
  type OutputMode,
} from "@/components/scene-tabs";
import { LayoutEditor } from "@/components/layout-editor";
import { StagingEditor } from "@/components/staging-editor";
import type { ImportedScene } from "@/lib/authoring-import";
import { parseAuthoringScene } from "@/lib/authoring-import";
import { idSegment } from "@/lib/id-builder";
import type { ImportedLayout } from "@/lib/layout-import";
import { parseLayoutManifest } from "@/lib/layout-import";
import { downloadText } from "@/lib/download";
import { isLayoutStale, layoutToYaml } from "@/lib/layout-model";
import { runSceneChecks, type CheckIssue } from "@/lib/scene-checks";
import { buildStoryEventThreads } from "@/lib/story-events";
import {
  renameBeatReferences,
  type StagingSelection,
} from "@/lib/staging-model";
import type {
  ChapterDraft,
  ChoiceOption,
  DialogueUnit,
  EffectScope,
  EngineTarget,
  PresentationMode,
  SceneDraft,
  SceneStatus,
  StoryChange,
} from "@/lib/editor-types";
import { sceneToJson, sceneToYaml } from "@/lib/scene-export";
import {
  blankScene,
  isTextEditingTarget,
  newProjectId,
  seedProject,
  useWorkspace,
} from "@/components/use-workspace";

const ENGINE_LABELS: Record<EngineTarget, string> = {
  unreal: "Unreal",
  godot: "Godot",
  unity: "Unity",
};

const sceneStatusLabel: Record<SceneStatus, string> = {
  draft: "Draft",
  needs_author_review: "Needs review",
  approved: "Approved",
  locked: "Locked",
};

type WorkspaceTab =
  | "source"
  | "dialogue"
  | "staging"
  | "layout"
  | "events"
  | "changes"
  | "output";

function makeId(prefix: string, value: string) {
  return `${prefix}_${idSegment(value, 44) || Date.now()}`;
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
      chapter.scenes[index] = {
        ...scene,
        layout: chapter.scenes[index].layout,
      };
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

function mergeLayoutImports(
  chapters: ChapterDraft[],
  imported: ImportedLayout[],
) {
  const next = chapters.map((chapter) => ({
    ...chapter,
    scenes: chapter.scenes.map((scene) => ({ ...scene })),
  }));
  let attached = 0;
  const missing: string[] = [];
  imported.forEach(({ chapterId, sceneId, layout }) => {
    const chapter = next.find((candidate) => candidate.id === chapterId);
    const scene = chapter?.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) {
      missing.push(sceneId);
      return;
    }
    scene.layout = layout;
    attached += 1;
  });
  return { chapters: next, attached, missing };
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

export function SceneEditor() {
  const [confirmation, setConfirmation] =
    useState<ConfirmationRequest | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("source");
  const [outputMode, setOutputMode] =
    useState<OutputMode>("authoring_yaml");
  const [query, setQuery] = useState("");
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

  const {
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
    undo: undoWorkspace,
    authoringHashes,
    hashesPending,
  } = useWorkspace(setNotice);

  const requestConfirmation = useCallback(
    (request: ConfirmationRequest) => setConfirmation(request),
    [],
  );

  const closeConfirmation = useCallback(() => setConfirmation(null), []);

  const undo = useCallback(() => {
    if (undoWorkspace() === "empty") {
      setNotice("Nothing to undo.");
      return;
    }
    setConfirmation(null);
    setIssues(null);
    setNotice("Undid the last workspace change.");
  }, [undoWorkspace]);

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

  const activeProject = useMemo(
    () =>
      projects.find((candidate) => candidate.id === activeProjectId) ??
      projects[0],
    [projects, activeProjectId],
  );
  const chapters = activeProject.chapters;
  const targetEngine = activeProject.targetEngine;

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
  const layoutCount = chapter.scenes.filter((scene) => scene.layout).length;
  const staleLayoutCount = chapter.scenes.filter((scene) =>
    isLayoutStale(scene, authoringHashes),
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

  const openProject = (projectId: string) => {
    const target = projects.find((candidate) => candidate.id === projectId);
    if (!target || projectId === activeProjectId) return;
    const firstChapter = target.chapters[0];
    setActiveProjectId(projectId);
    setActiveChapterId(firstChapter?.id ?? "");
    setActiveSceneId(firstChapter?.scenes[0]?.id ?? "");
    setTab("source");
    setIssues(null);
    setNotice(`Opened ${target.title}.`);
  };

  const addProject = () => {
    const id = newProjectId();
    const project = seedProject(id);
    const firstChapter = project.chapters[0];
    setProjects((current) => [...current, project]);
    setActiveProjectId(id);
    setActiveChapterId(firstChapter.id);
    setActiveSceneId(firstChapter.scenes[0]?.id ?? "");
    setTab("source");
    setIssues(null);
    setNotice("New book created. Rename it, then add chapters and scenes.");
  };

  const deleteProject = () => {
    requestConfirmation({
      title: `Delete ${activeProject.title}?`,
      description: `This removes the entire book — its ${activeProject.chapters.length} chapter${
        activeProject.chapters.length === 1 ? "" : "s"
      } and every scene inside — from the local workspace. Exported files are unaffected.`,
      confirmLabel: "Delete book",
      onConfirm: () => {
        const remaining = projects.filter(
          (candidate) => candidate.id !== activeProject.id,
        );
        const emptied = remaining.length === 0;
        if (emptied) {
          remaining.push(seedProject());
        }
        const nextActive = remaining[0];
        const nextChapter = nextActive.chapters[0];
        setProjects(remaining);
        setActiveProjectId(nextActive.id);
        setActiveChapterId(nextChapter?.id ?? "");
        setActiveSceneId(nextChapter?.scenes[0]?.id ?? "");
        setTab("source");
        setIssues(null);
        setNotice(
          emptied
            ? "Book deleted. A blank book is ready — press ⌘Z or Ctrl+Z to restore the old one."
            : "Book deleted. Press ⌘Z or Ctrl+Z to restore it.",
        );
      },
    });
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
    const importedLayouts: ImportedLayout[] = [];
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      const source = await file.text();
      try {
        imported.push(parseAuthoringScene(source));
      } catch (authoringError) {
        try {
          importedLayouts.push(parseLayoutManifest(source));
        } catch {
          failures.push(
            `${file.name} (${authoringError instanceof Error ? authoringError.message : "unreadable"})`,
          );
        }
      }
    }
    if (imported.length === 0 && importedLayouts.length === 0) {
      setNotice(`Import failed — ${failures.join("; ")}.`);
      return;
    }
    const merged = mergeImports(chapters, imported);
    const layoutMerged = mergeLayoutImports(
      merged.chapters,
      importedLayouts,
    );
    setChapters(layoutMerged.chapters);
    const firstChapterId =
      imported[0]?.chapterId ?? importedLayouts[0]?.chapterId;
    const firstSceneId =
      imported[0]?.scene.id ?? importedLayouts[0]?.sceneId;
    setActiveChapterId(firstChapterId);
    setActiveSceneId(firstSceneId);
    setTab(imported.length > 0 ? "source" : "layout");
    setIssues(null);
    const summary = [
      merged.added > 0 ? `${merged.added} new` : "",
      merged.updated > 0 ? `${merged.updated} updated` : "",
      layoutMerged.attached > 0
        ? `${layoutMerged.attached} layout${layoutMerged.attached === 1 ? "" : "s"}`
        : "",
    ]
      .filter(Boolean)
      .join(", ");
    setNotice(
      `Imported ${imported.length + importedLayouts.length} YAML file${
        imported.length + importedLayouts.length === 1 ? "" : "s"
      } (${summary}).${
        layoutMerged.missing.length > 0
          ? ` Layouts without matching authoring scenes: ${layoutMerged.missing.join(", ")}.`
          : ""
      }${
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
      beats: renameBeatReferences(activeScene.beats, dialogueId, nextId),
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
    const found = runSceneChecks(activeScene, authoringHashes[activeScene.id]);
    setIssues(found);
    setNotice(
      found.length > 0
        ? `${found.length} issue${found.length === 1 ? "" : "s"} found — click one below to jump straight to it.`
        : `Scene checks passed: ${activeScene.beats.length} beat${activeScene.beats.length === 1 ? "" : "s"}, ${activeScene.npcs.length} NPC${activeScene.npcs.length === 1 ? "" : "s"}, ${activeScene.interactables.length} interactable${activeScene.interactables.length === 1 ? "" : "s"}, ${activeScene.items.length} inventory item${activeScene.items.length === 1 ? "" : "s"}, and ${activeScene.hudEvents.length} HUD event${activeScene.hudEvents.length === 1 ? "" : "s"}.`,
    );
  };

  const exportScene = (mode: OutputMode) => {
    const stem = activeScene.id;
    if (mode === "authoring_yaml") {
      downloadText(
        `${stem}.authoring.yaml`,
        sceneToYaml(activeScene),
        "application/yaml",
      );
    } else if (mode === "layout_yaml" && activeScene.layout) {
      downloadText(
        `${stem}.scene.yaml`,
        layoutToYaml(activeScene, activeScene.layout, targetEngine),
        "application/yaml",
      );
    } else if (mode === "layout_yaml") {
      setNotice("Create this scene’s Layout before exporting scene YAML.");
      return;
    } else {
      downloadText(
        `${stem}.normalized.json`,
        sceneToJson(activeScene),
        "application/json",
      );
    }
    setNotice(
      `${
        mode === "authoring_yaml"
          ? "Story YAML"
          : mode === "layout_yaml"
            ? `Layout YAML (${ENGINE_LABELS[targetEngine]} target)`
            : "Authoring JSON"
      } export prepared.`,
    );
  };

  const output =
    outputMode === "authoring_yaml"
      ? sceneToYaml(activeScene)
      : outputMode === "layout_yaml"
        ? activeScene.layout
          ? layoutToYaml(activeScene, activeScene.layout, targetEngine)
          : "# Create a layout for this scene to preview its .scene.yaml."
        : sceneToJson(activeScene);
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
          <span className="crumb-muted">{activeProject.title}</span>
          <span className="crumb-divider">/</span>
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
            onClick={() => exportScene("authoring_yaml")}
          >
            <Download size={16} />
            <span className="desktop-label">Export story YAML</span>
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
        <section className="project-summary">
          <div className="chapter-switch-row">
            <div className="eyebrow">
              <Library size={12} aria-hidden />
              Book
            </div>
            {projects.length > 1 && (
              <label className="chapter-switcher">
                <select
                  aria-label="Switch book"
                  value={activeProject.id}
                  onChange={(event) => openProject(event.target.value)}
                >
                  {projects.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title} · {candidate.chapters.length} ch ·{" "}
                      {ENGINE_LABELS[candidate.targetEngine]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
            )}
          </div>
          <div className="project-title-row">
            <div>
              <input
                className="project-title-edit"
                aria-label="Book title"
                value={activeProject.title}
                onChange={(event) =>
                  setProjects((current) =>
                    current.map((candidate) =>
                      candidate.id === activeProject.id
                        ? { ...candidate, title: event.target.value }
                        : candidate,
                    ),
                  )
                }
              />
              <div className="project-meta">
                {projects.length} book{projects.length === 1 ? "" : "s"} ·{" "}
                {ENGINE_LABELS[activeProject.targetEngine]} target
              </div>
            </div>
            <button
              className="icon-button danger-hover"
              aria-label="Delete book"
              title="Delete this book"
              onClick={deleteProject}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </section>
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
                  {chapters.map((candidate, index) => {
                    const staleCount = candidate.scenes.filter((scene) =>
                      isLayoutStale(scene, authoringHashes),
                    ).length;
                    return (
                      <option key={candidate.id} value={candidate.id}>
                        {String(index + 1).padStart(2, "0")} · {candidate.title}
                        {staleCount > 0 ? ` · ${staleCount} stale` : ""}
                      </option>
                    );
                  })}
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
            <span>{layoutCount} layouts</span>
            {staleLayoutCount > 0 && (
              <span className="chapter-stale-count">
                {staleLayoutCount} stale
              </span>
            )}
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
              {scene.layout && (
                <span
                  className={`scene-layout-state ${
                    isLayoutStale(scene, authoringHashes)
                      ? "is-stale"
                      : "is-current"
                  }`}
                  title={
                    isLayoutStale(scene, authoringHashes)
                      ? "Layout is stale"
                      : "Layout exists"
                  }
                >
                  <Map size={11} />
                </span>
              )}
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
              Import YAML
            </button>
          </div>
          <button
            className="button button-full button-quiet"
            onClick={addProject}
          >
            <Library size={15} />
            New book
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".yaml,.yml"
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
              ["layout", "Layout", Map],
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
              {value === "layout" && activeScene.layout && (
                <span
                  className={`tab-count ${
                    isLayoutStale(activeScene, authoringHashes) ? "is-stale" : ""
                  }`}
                >
                  {isLayoutStale(activeScene, authoringHashes) ? "!" : "1"}
                </span>
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
            <DialogueTab
              dialogue={activeScene.dialogue}
              reservedIds={activeSceneResourceIds}
              onAddBlank={addBlankDialogue}
              onGoToSource={() => setTab("source")}
              onUpdateDialogue={updateDialogue}
              onRenameDialogueId={renameDialogueId}
              onAttachChoice={attachChoice}
              onUpdateChoiceOption={updateChoiceOption}
              onAddChoiceOption={addChoiceOption}
              onToggleScope={toggleScope}
              onRequestConfirmation={requestConfirmation}
              onDeleteDialogue={(id) => {
                updateScene({
                  dialogue: activeScene.dialogue.filter(
                    (item) => item.id !== id,
                  ),
                });
                setNotice(
                  "Dialogue deleted. Press ⌘Z or Ctrl+Z to restore it.",
                );
              }}
            />
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

          {tab === "layout" && (
            <LayoutEditor
              scene={activeScene}
              authoringHash={authoringHashes[activeScene.id] || ""}
              hashPending={
                hashesPending && !authoringHashes[activeScene.id]
              }
              onChange={(layout) => updateScene({ layout })}
              onNotice={setNotice}
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
            <ChangesTab
              storyChanges={activeScene.storyChanges}
              onAdd={addStoryChange}
              onUpdate={updateChange}
            />
          )}

          {tab === "output" && (
            <OutputTab
              outputMode={outputMode}
              onOutputModeChange={setOutputMode}
              output={output}
              targetEngine={targetEngine}
              engineLabel={ENGINE_LABELS[targetEngine]}
              onTargetEngineChange={setTargetEngine}
              onDownload={() => exportScene(outputMode)}
            />
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
