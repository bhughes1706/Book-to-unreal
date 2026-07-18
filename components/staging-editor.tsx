"use client";

import {
  Bell,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListTree,
  Package,
  Plus,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { IdField } from "@/components/id-field";
import type {
  BeatAction,
  BeatActionType,
  BeatTriggerType,
  HudChannel,
  HudDismissMode,
  HudEvent,
  NpcBehavior,
  NpcPresence,
  ReviewStatus,
  SceneBeat,
  SceneDraft,
  SceneItem,
  SceneItemKind,
  SceneItemPersistence,
  SceneItemState,
  SceneNpc,
} from "@/lib/editor-types";

type StagingPanel = "beats" | "npcs" | "items" | "hud";

const reviewStatusLabel: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
  needs_discussion: "Discuss",
};

const triggerLabels: Record<BeatTriggerType, string> = {
  begin_play: "Scene begins",
  interaction: "Player interacts",
  dialogue_complete: "Dialogue completes",
  player_enters: "Player enters area",
  timer: "Timer elapses",
  event: "Event fires",
  beat_completed: "Beat completes",
};

const actionLabels: Record<BeatActionType, string> = {
  show_hud: "Show HUD / Lens",
  spawn_npc: "Spawn NPC",
  move_npc: "Move NPC",
  give_item: "Give item",
  update_item: "Update item",
  play_dialogue: "Play dialogue",
  play_audio: "Play audio",
  camera: "Camera direction",
  unlock_exit: "Unlock exit",
  set_flag: "Set story flag",
  custom: "Custom direction",
};

const presenceLabels: Record<NpcPresence, string> = {
  present_at_start: "Present at start",
  enters_on_beat: "Enters on beat",
  conditional: "Conditional",
};

const behaviorLabels: Record<NpcBehavior, string> = {
  stationary: "Stationary",
  idle: "Ambient idle",
  follow_player: "Follow player",
  follow_path: "Follow path",
  scripted: "Scripted sequence",
};

const itemKindLabels: Record<SceneItemKind, string> = {
  environmental_interactable: "Environmental interactable",
  scene_prop: "Scene prop",
  narrative_item: "Narrative item",
};

const itemStateLabels: Record<SceneItemState, string> = {
  visible: "Visible",
  hidden: "Hidden",
  held: "Already held",
};

const persistenceLabels: Record<SceneItemPersistence, string> = {
  scene: "This scene",
  chapter: "Across chapter",
};

const hudChannelLabels: Record<HudChannel, string> = {
  internal_observation: "Internal observation",
  message: "Message",
  news: "News",
  translation: "Translation",
  system_notification: "System notification",
  objective: "Objective",
  item_reveal: "Item reveal",
  choice_consequence: "Choice consequence",
};

const dismissLabels: Record<HudDismissMode, string> = {
  timed: "Timed",
  player_dismiss: "Player dismisses",
  beat_advance: "Until next beat",
  persistent: "Persistent",
};

function nextId(prefix: string, ids: string[]) {
  let index = ids.length + 1;
  let candidate = `${prefix}_${index}`;
  while (ids.includes(candidate)) {
    index += 1;
    candidate = `${prefix}_${index}`;
  }
  return candidate;
}

function ReviewControl({
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

export function StagingEditor({
  scene,
  onChange,
  onNotice,
}: {
  scene: SceneDraft;
  onChange: (updates: Partial<SceneDraft>) => void;
  onNotice: (message: string) => void;
}) {
  const [panel, setPanel] = useState<StagingPanel>("beats");

  const resourceOptions = useMemo(
    () => [
      ...scene.npcs.map((npc) => ({
        id: npc.id,
        label: `${npc.displayName} · NPC`,
      })),
      ...scene.items.map((item) => ({
        id: item.id,
        label: `${item.name} · Item`,
      })),
      ...scene.hudEvents.map((event) => ({
        id: event.id,
        label: `${hudChannelLabels[event.channel]} · HUD`,
      })),
      ...scene.dialogue.map((dialogue) => ({
        id: dialogue.id,
        label: `${dialogue.speaker} · Dialogue`,
      })),
      ...scene.beats.map((beat) => ({
        id: beat.id,
        label: `${beat.title} · Beat`,
      })),
    ],
    [scene.beats, scene.dialogue, scene.hudEvents, scene.items, scene.npcs],
  );

  const updateNpc = (npcId: string, updates: Partial<SceneNpc>) => {
    onChange({
      npcs: scene.npcs.map((npc) =>
        npc.id === npcId ? { ...npc, ...updates } : npc,
      ),
    });
  };

  const updateItem = (itemId: string, updates: Partial<SceneItem>) => {
    onChange({
      items: scene.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    });
  };

  const renameItemId = (itemId: string, nextId: string) => {
    onChange({
      items: scene.items.map((item) =>
        item.id === itemId ? { ...item, id: nextId } : item,
      ),
      beats: scene.beats.map((beat) => ({
        ...beat,
        triggerTarget:
          beat.triggerTarget === itemId ? nextId : beat.triggerTarget,
        actions: beat.actions.map((action) => ({
          ...action,
          targetId: action.targetId === itemId ? nextId : action.targetId,
        })),
      })),
    });
    onNotice(`Item ID renamed to ${nextId}; beat references were updated.`);
  };

  const updateHudEvent = (eventId: string, updates: Partial<HudEvent>) => {
    onChange({
      hudEvents: scene.hudEvents.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event,
      ),
    });
  };

  const updateBeat = (beatId: string, updates: Partial<SceneBeat>) => {
    onChange({
      beats: scene.beats.map((beat) =>
        beat.id === beatId ? { ...beat, ...updates } : beat,
      ),
    });
  };

  const updateAction = (
    beatId: string,
    actionId: string,
    updates: Partial<BeatAction>,
  ) => {
    const beat = scene.beats.find((candidate) => candidate.id === beatId);
    if (!beat) return;
    updateBeat(beatId, {
      actions: beat.actions.map((action) =>
        action.id === actionId ? { ...action, ...updates } : action,
      ),
    });
  };

  const addBeat = () => {
    const id = nextId(
      "BEAT_NEW",
      scene.beats.map((beat) => beat.id),
    );
    onChange({
      beats: [
        ...scene.beats,
        {
          id,
          title: "New scene beat",
          triggerType: "begin_play",
          triggerTarget: "",
          optional: false,
          actions: [
            {
              id: `${id}_ACTION_1`,
              type: "custom",
              targetId: "",
              detail: "Describe what the player sees or what state changes.",
            },
          ],
          status: "unreviewed",
        },
      ],
    });
    onNotice("Added a beat to the end of the playable sequence.");
  };

  const addNpc = () => {
    const id = nextId(
      "ACTOR_NEW",
      scene.npcs.map((npc) => npc.id),
    );
    onChange({
      npcs: [
        ...scene.npcs,
        {
          id,
          displayName: "New character",
          role: "Describe this character's purpose in the scene.",
          presence: "present_at_start",
          behavior: "idle",
          entranceBeatId: "",
          exitBeatId: "",
          stagingNotes: "",
          status: "unreviewed",
        },
      ],
    });
    onNotice("Added an NPC to the scene cast.");
  };

  const addItem = () => {
    const id = nextId(
      "ITEM_NEW",
      scene.items.map((item) => item.id),
    );
    onChange({
      items: [
        ...scene.items,
        {
          id,
          name: "New item",
          kind: "scene_prop",
          initialState: "visible",
          persistence: "scene",
          interactionPrompt: "Inspect",
          outcome: "Describe what changes when the player interacts.",
          status: "unreviewed",
        },
      ],
    });
    onNotice("Added an item or interactable.");
  };

  const addHudEvent = () => {
    const id = nextId(
      "HUD_NEW",
      scene.hudEvents.map((event) => event.id),
    );
    onChange({
      hudEvents: [
        ...scene.hudEvents,
        {
          id,
          channel: "internal_observation",
          text: "New on-screen text",
          trigger: "Describe when this appears.",
          dismissMode: "player_dismiss",
          durationSeconds: 0,
          status: "unreviewed",
        },
      ],
    });
    onNotice("Added a HUD or Lens event.");
  };

  const addForPanel = () => {
    if (panel === "beats") addBeat();
    if (panel === "npcs") addNpc();
    if (panel === "items") addItem();
    if (panel === "hud") addHudEvent();
  };

  const addLabel: Record<StagingPanel, string> = {
    beats: "Add beat",
    npcs: "Add NPC",
    items: "Add item",
    hud: "Add HUD event",
  };

  const moveBeat = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= scene.beats.length) return;
    const beats = [...scene.beats];
    [beats[index], beats[destination]] = [beats[destination], beats[index]];
    onChange({ beats });
  };

  const panels: {
    id: StagingPanel;
    label: string;
    description: string;
    count: number;
    Icon: typeof ListTree;
  }[] = [
    {
      id: "beats",
      label: "Beats",
      description: "Playable sequence",
      count: scene.beats.length,
      Icon: ListTree,
    },
    {
      id: "npcs",
      label: "NPCs",
      description: "Cast and entrances",
      count: scene.npcs.length,
      Icon: Users,
    },
    {
      id: "items",
      label: "Items",
      description: "Props and interactions",
      count: scene.items.length,
      Icon: Package,
    },
    {
      id: "hud",
      label: "HUD events",
      description: "Lens and objectives",
      count: scene.hudEvents.length,
      Icon: Bell,
    },
  ];

  const isEmpty =
    (panel === "beats" && scene.beats.length === 0) ||
    (panel === "npcs" && scene.npcs.length === 0) ||
    (panel === "items" && scene.items.length === 0) ||
    (panel === "hud" && scene.hudEvents.length === 0);
  const sceneResourceIds = [
    ...scene.dialogue.map((item) => item.id),
    ...scene.npcs.map((item) => item.id),
    ...scene.items.map((item) => item.id),
    ...scene.hudEvents.map((item) => item.id),
    ...scene.beats.map((item) => item.id),
  ];

  return (
    <section className="editor-section staging-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Playable staging</div>
          <h2>Turn approved story intent into a sequence the player can feel.</h2>
        </div>
        <button className="button button-secondary" onClick={addForPanel}>
          <Plus size={16} />
          {addLabel[panel]}
        </button>
      </div>

      <div className="staging-nav" aria-label="Staging resources">
        {panels.map(({ id, label, description, count, Icon }) => (
          <button
            className={panel === id ? "is-active" : ""}
            key={id}
            onClick={() => setPanel(id)}
          >
            <span className="staging-nav-icon">
              <Icon size={17} />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <b>{count}</b>
          </button>
        ))}
      </div>

      {isEmpty && (
        <div className="empty-state compact staging-empty">
          <Zap size={25} />
          <h3>No {addLabel[panel].replace("Add ", "").toLowerCase()} yet</h3>
          <p>
            Add story-facing direction here. Exact placement, assets, and engine
            implementation stay in the runtime manifest.
          </p>
          <button className="button button-primary" onClick={addForPanel}>
            <Plus size={15} />
            {addLabel[panel]}
          </button>
        </div>
      )}

      <datalist id="staging-resource-options">
        {resourceOptions.map((option) => (
          <option key={`${option.id}-${option.label}`} value={option.id}>
            {option.label}
          </option>
        ))}
      </datalist>

      {panel === "items" && scene.items.length > 0 && (
        <div className="resource-panel-toolbar">
          <div>
            <strong>Scene items</strong>
            <small>
              Create props and interactables, then target their IDs from beats.
            </small>
          </div>
          <button className="button button-primary" onClick={addItem}>
            <Plus size={15} />
            Create item
          </button>
        </div>
      )}

      {panel === "beats" && scene.beats.length > 0 && (
        <div className="beat-timeline">
          {scene.beats.map((beat, beatIndex) => (
            <article className="stage-card beat-card" key={beat.id}>
              <div className="beat-rail">
                <span>{String(beatIndex + 1).padStart(2, "0")}</span>
              </div>
              <div className="stage-card-body">
                <div className="stage-card-head">
                  <GripVertical aria-hidden size={16} />
                  <div className="stage-title">
                    <small>{beat.id}</small>
                    <input
                      aria-label={`Beat ${beatIndex + 1} title`}
                      value={beat.title}
                      onChange={(event) =>
                        updateBeat(beat.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <ReviewControl
                    value={beat.status}
                    onChange={(status) => updateBeat(beat.id, { status })}
                  />
                  <div className="beat-order-actions">
                    <button
                      className="icon-button"
                      aria-label="Move beat earlier"
                      disabled={beatIndex === 0}
                      onClick={() => moveBeat(beatIndex, -1)}
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move beat later"
                      disabled={beatIndex === scene.beats.length - 1}
                      onClick={() => moveBeat(beatIndex, 1)}
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      className="icon-button danger-hover"
                      aria-label="Remove beat"
                      onClick={() => {
                        onChange({
                          beats: scene.beats.filter(
                            (candidate) => candidate.id !== beat.id,
                          ),
                          npcs: scene.npcs.map((npc) => ({
                            ...npc,
                            entranceBeatId:
                              npc.entranceBeatId === beat.id
                                ? ""
                                : npc.entranceBeatId,
                            exitBeatId:
                              npc.exitBeatId === beat.id ? "" : npc.exitBeatId,
                          })),
                        });
                        onNotice(
                          "Beat removed. Check actions that may have referenced it.",
                        );
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="stage-fields beat-trigger-fields">
                  <label className="stage-field">
                    <span>Trigger</span>
                    <select
                      value={beat.triggerType}
                      onChange={(event) =>
                        updateBeat(beat.id, {
                          triggerType: event.target.value as BeatTriggerType,
                          triggerTarget:
                            event.target.value === "begin_play"
                              ? ""
                              : beat.triggerTarget,
                        })
                      }
                    >
                      {Object.entries(triggerLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stage-field stage-field-grow">
                    <span>Trigger target or timing</span>
                    <input
                      disabled={beat.triggerType === "begin_play"}
                      list="staging-resource-options"
                      placeholder={
                        beat.triggerType === "begin_play"
                          ? "No target needed"
                          : "Resource ID, area, event, or duration"
                      }
                      value={beat.triggerTarget}
                      onChange={(event) =>
                        updateBeat(beat.id, {
                          triggerTarget: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="optional-toggle">
                    <input
                      type="checkbox"
                      checked={beat.optional}
                      onChange={(event) =>
                        updateBeat(beat.id, { optional: event.target.checked })
                      }
                    />
                    Optional beat
                  </label>
                </div>

                <div className="beat-actions">
                  <div className="beat-actions-heading">
                    <span>Actions</span>
                    <button
                      className="text-button"
                      onClick={() => {
                        const actionId = nextId(
                          `${beat.id}_ACTION`,
                          beat.actions.map((action) => action.id),
                        );
                        updateBeat(beat.id, {
                          actions: [
                            ...beat.actions,
                            {
                              id: actionId,
                              type: "custom",
                              targetId: "",
                              detail: "Describe what happens.",
                            },
                          ],
                        });
                      }}
                    >
                      <Plus size={14} />
                      Add action
                    </button>
                  </div>
                  {beat.actions.map((action, actionIndex) => (
                    <div className="beat-action-row" key={action.id}>
                      <span className="action-index">{actionIndex + 1}</span>
                      <select
                        aria-label={`Action ${actionIndex + 1} type`}
                        value={action.type}
                        onChange={(event) =>
                          updateAction(beat.id, action.id, {
                            type: event.target.value as BeatActionType,
                          })
                        }
                      >
                        {Object.entries(actionLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`Action ${actionIndex + 1} target`}
                        list="staging-resource-options"
                        placeholder="Target ID (optional)"
                        value={action.targetId}
                        onChange={(event) =>
                          updateAction(beat.id, action.id, {
                            targetId: event.target.value,
                          })
                        }
                      />
                      <input
                        aria-label={`Action ${actionIndex + 1} direction`}
                        placeholder="Direction or intended result"
                        value={action.detail}
                        onChange={(event) =>
                          updateAction(beat.id, action.id, {
                            detail: event.target.value,
                          })
                        }
                      />
                      <button
                        className="icon-button danger-hover"
                        aria-label="Remove action"
                        disabled={beat.actions.length === 1}
                        onClick={() =>
                          updateBeat(beat.id, {
                            actions: beat.actions.filter(
                              (candidate) => candidate.id !== action.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {panel === "npcs" && scene.npcs.length > 0 && (
        <div className="stage-card-stack">
          {scene.npcs.map((npc, npcIndex) => (
            <article className="stage-card resource-card" key={npc.id}>
              <div className="stage-card-head">
                <span className="resource-avatar">
                  <Users size={16} />
                </span>
                <div className="resource-heading">
                  <small>
                    NPC {String(npcIndex + 1).padStart(2, "0")} · {npc.id}
                  </small>
                  <input
                    aria-label={`NPC ${npcIndex + 1} name`}
                    value={npc.displayName}
                    onChange={(event) =>
                      updateNpc(npc.id, { displayName: event.target.value })
                    }
                  />
                </div>
                <ReviewControl
                  value={npc.status}
                  onChange={(status) => updateNpc(npc.id, { status })}
                />
                <button
                  className="icon-button danger-hover"
                  aria-label="Remove NPC"
                  onClick={() => {
                    onChange({
                      npcs: scene.npcs.filter(
                        (candidate) => candidate.id !== npc.id,
                      ),
                    });
                    onNotice(
                      "NPC removed. Any beat actions targeting it now need review.",
                    );
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="stage-fields resource-fields">
                <label className="stage-field stage-field-wide">
                  <span>Story role</span>
                  <input
                    value={npc.role}
                    onChange={(event) =>
                      updateNpc(npc.id, { role: event.target.value })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>Presence</span>
                  <select
                    value={npc.presence}
                    onChange={(event) =>
                      updateNpc(npc.id, {
                        presence: event.target.value as NpcPresence,
                      })
                    }
                  >
                    {Object.entries(presenceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Default behavior</span>
                  <select
                    value={npc.behavior}
                    onChange={(event) =>
                      updateNpc(npc.id, {
                        behavior: event.target.value as NpcBehavior,
                      })
                    }
                  >
                    {Object.entries(behaviorLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Entrance beat</span>
                  <select
                    value={npc.entranceBeatId}
                    onChange={(event) =>
                      updateNpc(npc.id, {
                        entranceBeatId: event.target.value,
                      })
                    }
                  >
                    <option value="">None / already present</option>
                    {scene.beats.map((beat) => (
                      <option key={beat.id} value={beat.id}>
                        {beat.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Exit beat</span>
                  <select
                    value={npc.exitBeatId}
                    onChange={(event) =>
                      updateNpc(npc.id, { exitBeatId: event.target.value })
                    }
                  >
                    <option value="">Remains in scene</option>
                    {scene.beats.map((beat) => (
                      <option key={beat.id} value={beat.id}>
                        {beat.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field stage-field-full">
                  <span>Performance and staging notes</span>
                  <textarea
                    placeholder="Entrance direction, emotional tone, movement, or silhouette…"
                    value={npc.stagingNotes}
                    onChange={(event) =>
                      updateNpc(npc.id, { stagingNotes: event.target.value })
                    }
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}

      {panel === "items" && scene.items.length > 0 && (
        <div className="stage-card-stack">
          {scene.items.map((item, itemIndex) => (
            <article className="stage-card resource-card" key={item.id}>
              <div className="stage-card-head">
                <span className="resource-avatar item-avatar">
                  <Package size={16} />
                </span>
                <div className="resource-heading">
                  <small>
                    ITEM {String(itemIndex + 1).padStart(2, "0")} · {item.id}
                  </small>
                  <input
                    aria-label={`Item ${itemIndex + 1} name`}
                    value={item.name}
                    onChange={(event) =>
                      updateItem(item.id, { name: event.target.value })
                    }
                  />
                </div>
                <ReviewControl
                  value={item.status}
                  onChange={(status) => updateItem(item.id, { status })}
                />
                <button
                  className="icon-button danger-hover"
                  aria-label="Remove item"
                  onClick={() => {
                    onChange({
                      items: scene.items.filter(
                        (candidate) => candidate.id !== item.id,
                      ),
                    });
                    onNotice(
                      "Item removed. Any beat actions targeting it now need review.",
                    );
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="stage-fields resource-fields item-fields">
                <IdField
                  className="stage-field stage-field-wide"
                  label="Item ID"
                  ariaLabel={`Item ${itemIndex + 1} ID`}
                  value={item.id}
                  reservedIds={sceneResourceIds.filter((id) => id !== item.id)}
                  onCommit={(nextId) => renameItemId(item.id, nextId)}
                />
                <label className="stage-field">
                  <span>Type</span>
                  <select
                    value={item.kind}
                    onChange={(event) =>
                      updateItem(item.id, {
                        kind: event.target.value as SceneItemKind,
                      })
                    }
                  >
                    {Object.entries(itemKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Initial state</span>
                  <select
                    value={item.initialState}
                    onChange={(event) =>
                      updateItem(item.id, {
                        initialState: event.target.value as SceneItemState,
                      })
                    }
                  >
                    {Object.entries(itemStateLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Persistence</span>
                  <select
                    value={item.persistence}
                    onChange={(event) =>
                      updateItem(item.id, {
                        persistence: event.target
                          .value as SceneItemPersistence,
                      })
                    }
                  >
                    {Object.entries(persistenceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Interaction prompt</span>
                  <input
                    placeholder="Inspect, Take, Enter…"
                    value={item.interactionPrompt}
                    onChange={(event) =>
                      updateItem(item.id, {
                        interactionPrompt: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="stage-field stage-field-full">
                  <span>Interaction outcome</span>
                  <textarea
                    value={item.outcome}
                    onChange={(event) =>
                      updateItem(item.id, { outcome: event.target.value })
                    }
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}

      {panel === "hud" && scene.hudEvents.length > 0 && (
        <div className="stage-card-stack">
          {scene.hudEvents.map((hudEvent, eventIndex) => (
            <article className="stage-card resource-card" key={hudEvent.id}>
              <div className="stage-card-head">
                <span className="resource-avatar hud-avatar">
                  <Bell size={16} />
                </span>
                <div className="resource-heading">
                  <small>
                    HUD {String(eventIndex + 1).padStart(2, "0")} ·{" "}
                    {hudEvent.id}
                  </small>
                  <strong>{hudChannelLabels[hudEvent.channel]}</strong>
                </div>
                <ReviewControl
                  value={hudEvent.status}
                  onChange={(status) =>
                    updateHudEvent(hudEvent.id, { status })
                  }
                />
                <button
                  className="icon-button danger-hover"
                  aria-label="Remove HUD event"
                  onClick={() => {
                    onChange({
                      hudEvents: scene.hudEvents.filter(
                        (candidate) => candidate.id !== hudEvent.id,
                      ),
                    });
                    onNotice(
                      "HUD event removed. Any beat actions targeting it now need review.",
                    );
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="hud-editor-grid">
                <div className="stage-fields resource-fields hud-fields">
                  <label className="stage-field">
                    <span>Channel</span>
                    <select
                      value={hudEvent.channel}
                      onChange={(event) =>
                        updateHudEvent(hudEvent.id, {
                          channel: event.target.value as HudChannel,
                        })
                      }
                    >
                      {Object.entries(hudChannelLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stage-field">
                    <span>Dismiss behavior</span>
                    <select
                      value={hudEvent.dismissMode}
                      onChange={(event) =>
                        updateHudEvent(hudEvent.id, {
                          dismissMode: event.target.value as HudDismissMode,
                        })
                      }
                    >
                      {Object.entries(dismissLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stage-field">
                    <span>Duration in seconds</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={hudEvent.dismissMode !== "timed"}
                      value={hudEvent.durationSeconds}
                      onChange={(event) =>
                        updateHudEvent(hudEvent.id, {
                          durationSeconds: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="stage-field stage-field-wide">
                    <span>Author-facing trigger</span>
                    <input
                      value={hudEvent.trigger}
                      onChange={(event) =>
                        updateHudEvent(hudEvent.id, {
                          trigger: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="stage-field stage-field-full">
                    <span>On-screen text</span>
                    <textarea
                      value={hudEvent.text}
                      onChange={(event) =>
                        updateHudEvent(hudEvent.id, {
                          text: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className={`hud-preview hud-${hudEvent.channel}`}>
                  <span>{hudChannelLabels[hudEvent.channel]}</span>
                  <p>{hudEvent.text || "On-screen text preview"}</p>
                  <small>{dismissLabels[hudEvent.dismissMode]}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
