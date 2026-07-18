"use client";

import {
  ArrowUpRight,
  BookOpenText,
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
  MoreHorizontal,
  MoveHorizontal,
  PanelLeftClose,
  PanelTop,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { IdField } from "@/components/id-field";
import { StagingEditor } from "@/components/staging-editor";
import { chapterSeed } from "@/lib/chapter-seed";
import type {
  ChapterDraft,
  ChoiceOption,
  DialogueUnit,
  EffectScope,
  PresentationMode,
  ReviewStatus,
  SceneDraft,
  SceneStatus,
  StoryChange,
} from "@/lib/editor-types";
import { sceneToJson, sceneToYaml } from "@/lib/scene-export";

const STORAGE_KEY = "scenework.chapter.CH01.v1";

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

function migrateChapter(saved: ChapterDraft): ChapterDraft {
  return {
    ...saved,
    scenes: saved.scenes.map((scene) => {
      const seededScene = chapterSeed.scenes.find(
        (candidate) => candidate.id === scene.id,
      );
      return {
        ...scene,
        npcs: scene.npcs ?? seededScene?.npcs ?? [],
        items: scene.items ?? seededScene?.items ?? [],
        hudEvents: scene.hudEvents ?? seededScene?.hudEvents ?? [],
        beats: scene.beats ?? seededScene?.beats ?? [],
      };
    }),
  };
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
  const [chapter, setChapter] = useState<ChapterDraft>(chapterSeed);
  const [activeSceneId, setActiveSceneId] = useState(
    "CH01_S03_WALK_TO_VENUE",
  );
  const [tab, setTab] = useState<WorkspaceTab>("source");
  const [outputMode, setOutputMode] = useState<OutputMode>("yaml");
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [notice, setNotice] = useState(
    "Your edits stay in this browser until you export them.",
  );
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setChapter(migrateChapter(JSON.parse(saved) as ChapterDraft));
        setNotice("Recovered your local edit and updated its staging data.");
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chapter));
  }, [chapter, hydrated]);

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
  const progress = Math.round((approvedCount / chapter.scenes.length) * 100);

  const updateScene = useCallback(
    (updates: Partial<SceneDraft>) => {
      setChapter((current) => ({
        ...current,
        scenes: current.scenes.map((scene) =>
          scene.id === activeSceneId ? { ...scene, ...updates } : scene,
        ),
      }));
    },
    [activeSceneId],
  );

  const openScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setTab("source");
    setNavOpen(false);
    setNotice("Scene loaded. Changes save locally as you work.");
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
    const dialogue: DialogueUnit = {
      id: `DIALOGUE_NEW_${activeScene.dialogue.length + 1}`,
      speaker: "Speaker",
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
    const issues: string[] = [];
    if (!activeScene.sourceExcerpt.trim()) issues.push("source passage");
    if (!activeScene.playerGoal.trim()) issues.push("player goal");
    activeScene.dialogue.forEach((dialogue) => {
      if (!dialogue.speaker.trim()) issues.push(`${dialogue.id} speaker`);
      if (dialogue.playerChoice) {
        if (dialogue.playerChoice.options.length < 2) {
          issues.push(`${dialogue.playerChoice.id} needs two options`);
        }
        dialogue.playerChoice.options.forEach((option) => {
          if (!option.effect.trim() || option.effectScopes.length === 0) {
            issues.push(`${option.id} consequence`);
          }
        });
      }
    });
    if (activeScene.beats.length === 0) issues.push("at least one scene beat");
    const beatIds = new Set(activeScene.beats.map((beat) => beat.id));
    const npcIds = new Set(activeScene.npcs.map((npc) => npc.id));
    const itemIds = new Set(activeScene.items.map((item) => item.id));
    const hudIds = new Set(activeScene.hudEvents.map((event) => event.id));
    const dialogueIds = new Set(
      activeScene.dialogue.map((dialogue) => dialogue.id),
    );
    activeScene.npcs.forEach((npc) => {
      if (!npc.displayName.trim() || !npc.role.trim()) {
        issues.push(`${npc.id} identity`);
      }
      if (npc.presence === "enters_on_beat" && !npc.entranceBeatId) {
        issues.push(`${npc.id} entrance beat`);
      }
      if (
        (npc.entranceBeatId && !beatIds.has(npc.entranceBeatId)) ||
        (npc.exitBeatId && !beatIds.has(npc.exitBeatId))
      ) {
        issues.push(`${npc.id} beat reference`);
      }
    });
    activeScene.items.forEach((item) => {
      if (!item.name.trim() || !item.outcome.trim()) {
        issues.push(`${item.id} interaction outcome`);
      }
    });
    activeScene.hudEvents.forEach((event) => {
      if (!event.text.trim() || !event.trigger.trim()) {
        issues.push(`${event.id} content`);
      }
      if (event.dismissMode === "timed" && event.durationSeconds <= 0) {
        issues.push(`${event.id} duration`);
      }
    });
    activeScene.beats.forEach((beat) => {
      if (!beat.title.trim()) issues.push(`${beat.id} title`);
      if (beat.triggerType !== "begin_play" && !beat.triggerTarget.trim()) {
        issues.push(`${beat.id} trigger`);
      }
      if (
        beat.triggerType === "beat_completed" &&
        !beatIds.has(beat.triggerTarget)
      ) {
        issues.push(`${beat.id} trigger reference`);
      }
      if (beat.actions.length === 0) issues.push(`${beat.id} action`);
      beat.actions.forEach((action) => {
        if (!action.detail.trim()) issues.push(`${action.id} direction`);
        const targetExists =
          action.type === "show_hud"
            ? hudIds.has(action.targetId)
            : action.type === "spawn_npc" || action.type === "move_npc"
              ? npcIds.has(action.targetId)
              : action.type === "give_item" || action.type === "update_item"
                ? itemIds.has(action.targetId)
                : action.type === "play_dialogue"
                  ? dialogueIds.has(action.targetId)
                  : true;
        if (!targetExists) issues.push(`${action.id} target`);
      });
    });
    if (issues.length) {
      setNotice(`Needs attention: ${issues.join(", ")}.`);
      return;
    }
    setNotice(
      `Scene checks passed: ${activeScene.beats.length} beat${activeScene.beats.length === 1 ? "" : "s"}, ${activeScene.npcs.length} NPC${activeScene.npcs.length === 1 ? "" : "s"}, ${activeScene.items.length} item${activeScene.items.length === 1 ? "" : "s"}, and ${activeScene.hudEvents.length} HUD event${activeScene.hudEvents.length === 1 ? "" : "s"}.`,
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
      ...activeScene.items,
      ...activeScene.hudEvents,
    ].every((item) => item.status !== "unreviewed");
  const activeSceneResourceIds = useMemo(
    () => [
      ...activeScene.dialogue.map((item) => item.id),
      ...activeScene.npcs.map((item) => item.id),
      ...activeScene.items.map((item) => item.id),
      ...activeScene.hudEvents.map((item) => item.id),
      ...activeScene.beats.map((item) => item.id),
    ],
    [
      activeScene.beats,
      activeScene.dialogue,
      activeScene.hudEvents,
      activeScene.items,
      activeScene.npcs,
    ],
  );

  return (
    <main className="app-shell">
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
          <span className="crumb-muted">Chapter 01</span>
          <span className="crumb-divider">/</span>
          <span>{activeScene.title}</span>
          <span className={`scene-state state-${activeScene.status}`}>
            {sceneStatusLabel[activeScene.status]}
          </span>
        </div>
        <div className="topbar-actions">
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
          <div className="eyebrow">Current chapter</div>
          <div className="chapter-title-row">
            <div>
              <div className="chapter-number">01</div>
              <h1>{chapter.title}</h1>
            </div>
            <button className="icon-button" aria-label="Chapter actions">
              <MoreHorizontal size={18} />
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
          <button
            className="button button-full button-quiet"
            onClick={() =>
              setNotice("New scene creation will be part of the chapter workflow.")
            }
          >
            <Plus size={16} />
            Add scene
          </button>
          <div className="source-file">
            <FileText size={15} />
            <span>
              <small>Source</small>
              {chapter.sourceFilename}
            </span>
            <Check size={14} />
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
          <div className="save-state">
            <Save size={14} />
            Saved locally
          </div>
        </div>

        <div className="tab-bar" role="tablist" aria-label="Scene workspace">
          {(
            [
              ["source", "Source", FileText],
              ["dialogue", "Dialogue", MessageSquareQuote],
              ["staging", "Staging", Clapperboard],
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
                    <article className="dialogue-card" key={dialogue.id}>
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
                            updateScene({
                              dialogue: activeScene.dialogue.filter(
                                (item) => item.id !== dialogue.id,
                              ),
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
                                          updateDialogue(
                                            dialogue.id,
                                            (item) => ({
                                              ...item,
                                              playerChoice: item.playerChoice
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
                                          )
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
                                updateDialogue(dialogue.id, (item) => ({
                                  ...item,
                                  playerChoice: undefined,
                                }))
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
