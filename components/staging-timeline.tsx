"use client";

import {
  Bell,
  GripVertical,
  MousePointerClick,
  Package,
  Plus,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { DragEvent, MutableRefObject, ReactNode } from "react";
import { useRef, useState } from "react";

import type { BeatAction, SceneBeat, SceneDraft } from "@/lib/editor-types";
import type {
  StagingDragPayload,
  TimelinePlacement,
} from "@/lib/staging-model";
import {
  npcSpan,
  triggerLabels,
} from "@/lib/staging-model";
import type { StagingSelection } from "@/components/staging-editor";

const DRAG_MIME = "application/x-staging";

function TimelineMarker({
  className,
  title,
  ariaLabel,
  dragPayload,
  onStartDrag,
  onEndDrag,
  onSelect,
  onRemove,
  children,
}: {
  className: string;
  title: string;
  ariaLabel: string;
  dragPayload: StagingDragPayload;
  onStartDrag: (
    payload: StagingDragPayload,
    event: DragEvent<HTMLButtonElement>,
  ) => void;
  onEndDrag: () => void;
  onSelect: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="tl-marker-placement">
      <button
        type="button"
        draggable
        className={className}
        title={`${title} · Drag to another beat`}
        aria-label={ariaLabel}
        onDragStart={(event) => onStartDrag(dragPayload, event)}
        onDragEnd={onEndDrag}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            onRemove();
          }
        }}
      >
        {children}
      </button>
      <button
        type="button"
        className="tl-marker-remove"
        aria-label={`Remove ${ariaLabel} from timeline`}
        title="Remove this placement from the timeline"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <X size={9} />
      </button>
    </div>
  );
}

type LaneIcon = typeof Bell;

/**
 * Describes one resource lane on the timeline (HUD, interactables, inventory).
 * `findResource` returns the display label of the target when it still exists —
 * used both to render the marker and to tell a live placement from a broken one
 * (an empty label still counts as present, so blank HUD text is not "broken").
 */
interface ResourceLaneConfig {
  key: "hud" | "interactable" | "item";
  label: string;
  row: number;
  laneIcon: LaneIcon;
  markerIcon: LaneIcon;
  markerClass: string;
  actionMatches: (action: BeatAction) => boolean;
  findResource: (id: string) => { label: string } | undefined;
  actionTitle: (label: string) => string;
  actionAria: (label: string) => string;
  unknownTitle: (id: string) => string;
  unknownAria: (id: string) => string;
  trigger?: {
    matches: (beat: SceneBeat) => boolean;
    title: (label: string) => string;
    aria: (label: string) => string;
    unknownTitle: (id: string) => string;
    unknownAria: (id: string) => string;
  };
}

function ResourceLane({
  config,
  beats,
  scrubIndex,
  isSelected,
  onSelect,
  onRemovePlacement,
  onStartPlacementDrag,
  onEndDrag,
}: {
  config: ResourceLaneConfig;
  beats: SceneBeat[];
  scrubIndex: number;
  isSelected: (kind: StagingSelection["kind"], id: string) => boolean;
  onSelect: (selection: StagingSelection) => void;
  onRemovePlacement: (placement: TimelinePlacement) => void;
  onStartPlacementDrag: (
    payload: StagingDragPayload,
    event: DragEvent<HTMLButtonElement>,
  ) => void;
  onEndDrag: () => void;
}) {
  const {
    key,
    label,
    row,
    laneIcon: LaneIcon,
    markerIcon: MarkerIcon,
    markerClass,
    actionMatches,
    findResource,
    trigger,
  } = config;
  return (
    <>
      <div
        className="tl-lane-label is-static"
        style={{ gridRow: row, gridColumn: 1 }}
      >
        <LaneIcon size={13} />
        <span>{label}</span>
      </div>
      {beats.map((beat, index) => {
        const actions = beat.actions.filter(actionMatches);
        const triggerId =
          trigger && trigger.matches(beat) ? beat.triggerTarget : "";
        const triggerResource = triggerId
          ? findResource(triggerId)
          : undefined;
        return (
          <div
            key={`${beat.id}-${key}`}
            className={`tl-cell ${index === scrubIndex ? "is-playhead" : ""}`}
            data-lane={key}
            data-beat-index={index}
            style={{ gridRow: row, gridColumn: index + 2 }}
          >
            {triggerId && trigger && (
              <TimelineMarker
                key={`${beat.id}-trigger-${key}`}
                className={`tl-marker ${markerClass} is-trigger ${
                  triggerResource && isSelected(key, triggerId)
                    ? "is-selected"
                    : ""
                } ${triggerResource ? "" : "is-broken"}`}
                title={
                  triggerResource
                    ? trigger.title(triggerResource.label)
                    : trigger.unknownTitle(triggerId)
                }
                ariaLabel={
                  triggerResource
                    ? trigger.aria(triggerResource.label)
                    : trigger.unknownAria(triggerId)
                }
                dragPayload={{
                  type: "trigger-placement",
                  id: triggerId,
                  sourceBeatId: beat.id,
                }}
                onStartDrag={onStartPlacementDrag}
                onEndDrag={onEndDrag}
                onSelect={() =>
                  triggerResource && onSelect({ kind: key, id: triggerId })
                }
                onRemove={() =>
                  onRemovePlacement({ kind: "trigger", beatId: beat.id })
                }
              >
                <Zap size={11} />
              </TimelineMarker>
            )}
            {actions.map((action) => {
              const resource = findResource(action.targetId);
              return (
                <TimelineMarker
                  key={action.id}
                  className={`tl-marker ${markerClass} ${
                    resource && isSelected(key, action.targetId)
                      ? "is-selected"
                      : ""
                  } ${resource ? "" : "is-broken"}`}
                  title={
                    resource
                      ? config.actionTitle(resource.label)
                      : config.unknownTitle(action.targetId)
                  }
                  ariaLabel={
                    resource
                      ? config.actionAria(resource.label)
                      : config.unknownAria(action.targetId)
                  }
                  dragPayload={{
                    type: "action-placement",
                    id: action.id,
                    sourceBeatId: beat.id,
                  }}
                  onStartDrag={onStartPlacementDrag}
                  onEndDrag={onEndDrag}
                  onSelect={() =>
                    resource && onSelect({ kind: key, id: action.targetId })
                  }
                  onRemove={() =>
                    onRemovePlacement({
                      kind: "action",
                      beatId: beat.id,
                      actionId: action.id,
                    })
                  }
                >
                  <MarkerIcon size={11} />
                </TimelineMarker>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export function StagingTimeline({
  scene,
  scrubIndex,
  selection,
  dragPayloadRef,
  onSelect,
  onReorderBeat,
  onAddBeat,
  onRemoveBeat,
  onMoveNpcPresence,
  onRetargetSpan,
  onDropResource,
  onRemovePlacement,
}: {
  scene: SceneDraft;
  scrubIndex: number;
  selection: StagingSelection | null;
  dragPayloadRef: MutableRefObject<StagingDragPayload | null>;
  onSelect: (selection: StagingSelection) => void;
  onReorderBeat: (fromIndex: number, toIndex: number) => void;
  onAddBeat: () => void;
  onRemoveBeat: (beatId: string) => void;
  onMoveNpcPresence: (npcId: string, beatIndex: number) => void;
  onRetargetSpan: (
    npcId: string,
    edge: "start" | "end",
    beatIndex: number,
  ) => void;
  onDropResource: (payload: StagingDragPayload, beatIndex: number) => void;
  onRemovePlacement: (placement: TimelinePlacement) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dropColumn, setDropColumn] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const beats = scene.beats;
  const columns = beats.length;
  const npcRowsStart = 2;
  const hudRow = npcRowsStart + scene.npcs.length;
  const interactableRow = hudRow + 1;
  const itemRow = interactableRow + 1;
  const totalRows = itemRow;

  const gridStyle = {
    gridTemplateColumns: `168px repeat(${columns}, minmax(128px, 1fr))`,
  };

  const startDrag = (payload: StagingDragPayload) => {
    dragPayloadRef.current = payload;
    setDragging(true);
  };

  const startPlacementDrag = (
    payload: StagingDragPayload,
    event: DragEvent<HTMLButtonElement>,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_MIME, payload.id);
    startDrag(payload);
  };

  const endDrag = () => {
    dragPayloadRef.current = null;
    setDragging(false);
    setDropColumn(null);
  };

  const handleDrop = (beatIndex: number) => {
    const payload = dragPayloadRef.current;
    if (!payload) return;
    if (payload.type === "beat") {
      const fromIndex = beats.findIndex((beat) => beat.id === payload.id);
      if (fromIndex !== -1 && fromIndex !== beatIndex) {
        onReorderBeat(fromIndex, beatIndex);
      }
    } else if (payload.type === "npc-span-start") {
      onRetargetSpan(payload.id, "start", beatIndex);
    } else if (payload.type === "npc-span-end") {
      onRetargetSpan(payload.id, "end", beatIndex);
    } else if (payload.type === "npc-presence") {
      onMoveNpcPresence(payload.id, beatIndex);
    } else {
      onDropResource(payload, beatIndex);
    }
    endDrag();
  };

  const beatIndexAt = (clientX: number) => {
    const headers = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>("[data-beat-column]") ||
        [],
    );
    const match = headers.find((header) => {
      const bounds = header.getBoundingClientRect();
      return clientX >= bounds.left && clientX <= bounds.right;
    });
    if (!match) return null;
    const index = Number(match.dataset.beatColumn);
    return Number.isInteger(index) ? index : null;
  };

  const isMovePayload = (payload: StagingDragPayload) =>
    [
      "beat",
      "npc-presence",
      "npc-span-start",
      "npc-span-end",
      "action-placement",
      "trigger-placement",
    ].includes(payload.type);

  if (columns === 0) {
    return (
      <div className="staging-timeline is-empty">
        <Zap size={18} />
        <p>
          Add a beat to start the timeline. Beats are the columns; NPCs,
          interactables, inventory items, and HUD events land on them.
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={onAddBeat}
        >
          <Plus size={14} />
          Add first beat
        </button>
      </div>
    );
  }

  const isSelected = (kind: StagingSelection["kind"], id: string) =>
    selection?.kind === kind && selection.id === id;

  const resourceLanes: ResourceLaneConfig[] = [
    {
      key: "hud",
      label: "HUD / Lens",
      row: hudRow,
      laneIcon: Bell,
      markerIcon: Bell,
      markerClass: "tl-marker-hud",
      actionMatches: (action) => action.type === "show_hud",
      findResource: (id) => {
        const event = scene.hudEvents.find(
          (candidate) => candidate.id === id,
        );
        return event ? { label: event.text } : undefined;
      },
      actionTitle: (label) => label,
      actionAria: (label) => `${label} HUD placement`,
      unknownTitle: (id) => `Unknown HUD: ${id}`,
      unknownAria: (id) => `Unknown HUD ${id}`,
    },
    {
      key: "interactable",
      label: "Interactables",
      row: interactableRow,
      laneIcon: MousePointerClick,
      markerIcon: MousePointerClick,
      markerClass: "tl-marker-interactable",
      actionMatches: (action) => action.type === "update_interactable",
      findResource: (id) => {
        const interactable = scene.interactables.find(
          (candidate) => candidate.id === id,
        );
        return interactable ? { label: interactable.name } : undefined;
      },
      actionTitle: (label) => label,
      actionAria: (label) => `${label} placement`,
      unknownTitle: (id) => `Unknown interactable: ${id}`,
      unknownAria: (id) => `Unknown interactable ${id}`,
      trigger: {
        matches: (beat) =>
          beat.triggerType === "interaction" && Boolean(beat.triggerTarget),
        title: (label) => `Trigger: player uses ${label}`,
        aria: (label) => `${label} trigger`,
        unknownTitle: (id) => `Unknown interactable trigger: ${id}`,
        unknownAria: (id) => `Unknown interactable trigger ${id}`,
      },
    },
    {
      key: "item",
      label: "Inventory",
      row: itemRow,
      laneIcon: Package,
      markerIcon: Package,
      markerClass: "tl-marker-item",
      actionMatches: (action) =>
        action.type === "give_item" || action.type === "update_item",
      findResource: (id) => {
        const item = scene.items.find((candidate) => candidate.id === id);
        return item ? { label: item.name } : undefined;
      },
      actionTitle: (label) => label,
      actionAria: (label) => `${label} inventory placement`,
      unknownTitle: (id) => `Unknown item: ${id}`,
      unknownAria: (id) => `Unknown item ${id}`,
      trigger: {
        matches: (beat) =>
          beat.triggerType === "item_used" && Boolean(beat.triggerTarget),
        title: (label) => `Trigger: Grayson uses ${label} from inventory`,
        aria: (label) => `${label} inventory trigger`,
        unknownTitle: (id) => `Unknown item trigger: ${id}`,
        unknownAria: (id) => `Unknown item trigger ${id}`,
      },
    },
  ];

  return (
    <div className="staging-timeline">
      <div className="tl-toolbar">
        <div>
          <strong>Scene timeline</strong>
          <small>{beats.length} beat{beats.length === 1 ? "" : "s"}</small>
        </div>
        <button
          type="button"
          className="button button-quiet"
          onClick={onAddBeat}
        >
          <Plus size={14} />
          Add beat
        </button>
      </div>
      <div className="tl-scroll">
        <div
          ref={gridRef}
          className={`tl-grid ${dragging ? "is-dragging" : ""}`}
          style={gridStyle}
          onDragOver={(event) => {
            const payload = dragPayloadRef.current;
            const beatIndex = beatIndexAt(event.clientX);
            if (!payload || beatIndex === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = isMovePayload(payload)
              ? "move"
              : "copy";
            setDropColumn(beatIndex);
          }}
          onDragLeave={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.contains(event.relatedTarget)
            ) {
              return;
            }
            setDropColumn(null);
          }}
          onDrop={(event) => {
            const beatIndex = beatIndexAt(event.clientX);
            if (beatIndex === null) return;
            event.preventDefault();
            handleDrop(beatIndex);
          }}
        >
          <div className="tl-corner" style={{ gridRow: 1, gridColumn: 1 }}>
            Sequence
          </div>

          {beats.map((beat, index) => (
            <div
              key={beat.id}
              draggable
              className="tl-beat-slot"
              data-beat-column={index}
              style={{ gridRow: 1, gridColumn: index + 2 }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(DRAG_MIME, beat.id);
                startDrag({ type: "beat", id: beat.id });
              }}
              onDragEnd={endDrag}
            >
              <button
                type="button"
                className={`tl-beat-head ${
                  isSelected("beat", beat.id) ? "is-selected" : ""
                } ${index === scrubIndex ? "is-playhead" : ""} status-tint-${beat.status}`}
                onClick={() => onSelect({ kind: "beat", id: beat.id })}
                onKeyDown={(event) => {
                  if (event.key === "Delete" || event.key === "Backspace") {
                    event.preventDefault();
                    onRemoveBeat(beat.id);
                  }
                }}
              >
                <span className="tl-beat-order">
                  <GripVertical size={12} />
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{beat.title}</strong>
                <small>
                  {triggerLabels[beat.triggerType]}
                  {beat.optional ? " · optional" : ""}
                </small>
              </button>
              <button
                type="button"
                className="tl-beat-remove"
                aria-label={`Delete beat ${beat.title}`}
                title="Delete this beat"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveBeat(beat.id);
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {scene.npcs.map((npc, npcIndex) => {
            const span = npcSpan(scene, npc);
            const row = npcRowsStart + npcIndex;
            return [
              <button
                key={`${npc.id}-label`}
                type="button"
                draggable
                className={`tl-lane-label ${
                  isSelected("npc", npc.id) ? "is-selected" : ""
                }`}
                style={{ gridRow: row, gridColumn: 1 }}
                onClick={() => onSelect({ kind: "npc", id: npc.id })}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(DRAG_MIME, npc.id);
                  startDrag({ type: "npc", id: npc.id });
                }}
                onDragEnd={endDrag}
                title="Drag onto a beat to stage this NPC there"
              >
                <Users size={13} />
                <span>{npc.displayName}</span>
              </button>,
              <div
                key={`${npc.id}-span`}
                className={`tl-span ${span.conditional ? "is-conditional" : ""} ${
                  span.broken ? "is-broken" : ""
                } ${isSelected("npc", npc.id) ? "is-selected" : ""}`}
                draggable
                title="Drag this presence bar to change the NPC’s entrance beat"
                style={{
                  gridRow: row,
                  gridColumn: `${span.start + 2} / ${span.end + 3}`,
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(DRAG_MIME, npc.id);
                  startDrag({ type: "npc-presence", id: npc.id });
                }}
                onDragEnd={endDrag}
                onClick={() => onSelect({ kind: "npc", id: npc.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "npc", id: npc.id });
                  }
                }}
                aria-label={`${npc.displayName}, beats ${span.start + 1} to ${
                  span.end + 1
                }`}
              >
                <span
                  className={`tl-span-handle ${
                    span.entersDuringScene ? "is-hard" : ""
                  }`}
                  draggable
                  title="Drag to a beat to set the entrance"
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData(DRAG_MIME, npc.id);
                    startDrag({ type: "npc-span-start", id: npc.id });
                  }}
                  onDragEnd={endDrag}
                />
                <em>{span.conditional ? "conditional" : npc.behavior.replace(/_/g, " ")}</em>
                <span
                  className={`tl-span-handle tl-span-end ${
                    span.exitsDuringScene ? "is-hard" : ""
                  }`}
                  draggable
                  title="Drag to a beat to set the exit"
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData(DRAG_MIME, npc.id);
                    startDrag({ type: "npc-span-end", id: npc.id });
                  }}
                  onDragEnd={endDrag}
                />
              </div>,
              ...beats.flatMap((beat, beatIndex) =>
                beat.actions
                  .filter(
                    (action) =>
                      (action.type === "move_npc" ||
                        action.type === "spawn_npc") &&
                      action.targetId === npc.id,
                  )
                  .map((action) => (
                    <div
                      key={`${npc.id}-${beat.id}-${action.id}`}
                      className="tl-npc-marker-cell"
                      data-lane="npc"
                      data-beat-index={beatIndex}
                      style={{ gridRow: row, gridColumn: beatIndex + 2 }}
                    >
                      <TimelineMarker
                        className={`tl-marker tl-marker-npc ${
                          isSelected("npc", npc.id) ? "is-selected" : ""
                        }`}
                        title={`${action.type === "spawn_npc" ? "Entrance" : "Move"}: ${npc.displayName}`}
                        ariaLabel={`${npc.displayName} ${
                          action.type === "spawn_npc"
                            ? "entrance"
                            : "movement"
                        } placement`}
                        dragPayload={{
                          type: "action-placement",
                          id: action.id,
                          sourceBeatId: beat.id,
                        }}
                        onStartDrag={startPlacementDrag}
                        onEndDrag={endDrag}
                        onSelect={() => onSelect({ kind: "npc", id: npc.id })}
                        onRemove={() =>
                          onRemovePlacement({
                            kind: "action",
                            beatId: beat.id,
                            actionId: action.id,
                          })
                        }
                      >
                        <Users size={11} />
                      </TimelineMarker>
                    </div>
                  )),
              ),
            ];
          })}

          {resourceLanes.map((config) => (
            <ResourceLane
              key={config.key}
              config={config}
              beats={beats}
              scrubIndex={scrubIndex}
              isSelected={isSelected}
              onSelect={onSelect}
              onRemovePlacement={onRemovePlacement}
              onStartPlacementDrag={startPlacementDrag}
              onEndDrag={endDrag}
            />
          ))}

          {beats.map((beat, index) => (
            <div
              key={`${beat.id}-dropzone`}
              className={`tl-dropzone ${
                dropColumn === index ? "is-drop-target" : ""
              } ${index === scrubIndex ? "is-playhead-col" : ""}`}
              style={{
                gridRow: `1 / ${totalRows + 1}`,
                gridColumn: index + 2,
              }}
            />
          ))}
        </div>
      </div>
      <p className="tl-hint">
        Drag an NPC’s green presence bar to change when they enter; its end
        handles set entrance and exit precisely. Drag round NPC action markers
        or other timeline markers to move them between beats. Hover a marker
        and use × to unstage it.
      </p>
    </div>
  );
}
