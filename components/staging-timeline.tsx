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

import type { SceneDraft } from "@/lib/editor-types";
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

          <div className="tl-lane-label is-static" style={{ gridRow: hudRow, gridColumn: 1 }}>
            <Bell size={13} />
            <span>HUD / Lens</span>
          </div>
          {beats.map((beat, index) => {
            const shows = beat.actions.filter(
              (action) => action.type === "show_hud",
            );
            return (
              <div
                key={`${beat.id}-hud`}
                className={`tl-cell ${index === scrubIndex ? "is-playhead" : ""}`}
                data-lane="hud"
                data-beat-index={index}
                style={{ gridRow: hudRow, gridColumn: index + 2 }}
              >
                {shows.map((action) => {
                  const event = scene.hudEvents.find(
                    (candidate) => candidate.id === action.targetId,
                  );
                  return (
                    <TimelineMarker
                      key={action.id}
                      className={`tl-marker tl-marker-hud ${
                        event && isSelected("hud", event.id) ? "is-selected" : ""
                      } ${event ? "" : "is-broken"}`}
                      title={event ? event.text : `Unknown HUD: ${action.targetId}`}
                      ariaLabel={
                        event
                          ? `${event.text} HUD placement`
                          : `Unknown HUD ${action.targetId}`
                      }
                      dragPayload={{
                        type: "action-placement",
                        id: action.id,
                        sourceBeatId: beat.id,
                      }}
                      onStartDrag={startPlacementDrag}
                      onEndDrag={endDrag}
                      onSelect={() =>
                        event && onSelect({ kind: "hud", id: event.id })
                      }
                      onRemove={() =>
                        onRemovePlacement({
                          kind: "action",
                          beatId: beat.id,
                          actionId: action.id,
                        })
                      }
                    >
                      <Bell size={11} />
                    </TimelineMarker>
                  );
                })}
              </div>
            );
          })}

          <div
            className="tl-lane-label is-static"
            style={{ gridRow: interactableRow, gridColumn: 1 }}
          >
            <MousePointerClick size={13} />
            <span>Interactables</span>
          </div>
          {beats.map((beat, index) => {
            const updated = beat.actions.filter(
              (action) => action.type === "update_interactable",
            );
            const triggered =
              beat.triggerType === "interaction"
                ? scene.interactables.find(
                    (interactable) =>
                      interactable.id === beat.triggerTarget,
                  )
                : undefined;
            return (
              <div
                key={`${beat.id}-interactables`}
                className={`tl-cell ${index === scrubIndex ? "is-playhead" : ""}`}
                data-lane="interactable"
                data-beat-index={index}
                style={{ gridRow: interactableRow, gridColumn: index + 2 }}
              >
                {triggered && (
                  <TimelineMarker
                    key={`${beat.id}-trigger-interactable`}
                    className={`tl-marker tl-marker-interactable is-trigger ${
                      isSelected("interactable", triggered.id)
                        ? "is-selected"
                        : ""
                    }`}
                    title={`Trigger: player uses ${triggered.name}`}
                    ariaLabel={`${triggered.name} trigger`}
                    dragPayload={{
                      type: "trigger-placement",
                      id: triggered.id,
                      sourceBeatId: beat.id,
                    }}
                    onStartDrag={startPlacementDrag}
                    onEndDrag={endDrag}
                    onSelect={() =>
                      onSelect({ kind: "interactable", id: triggered.id })
                    }
                    onRemove={() =>
                      onRemovePlacement({
                        kind: "trigger",
                        beatId: beat.id,
                      })
                    }
                  >
                    <Zap size={11} />
                  </TimelineMarker>
                )}
                {updated.map((action) => {
                  const interactable = scene.interactables.find(
                    (candidate) => candidate.id === action.targetId,
                  );
                  return (
                    <TimelineMarker
                      key={action.id}
                      className={`tl-marker tl-marker-interactable ${
                        interactable &&
                        isSelected("interactable", interactable.id)
                          ? "is-selected"
                          : ""
                      } ${interactable ? "" : "is-broken"}`}
                      title={
                        interactable
                          ? interactable.name
                          : `Unknown interactable: ${action.targetId}`
                      }
                      ariaLabel={
                        interactable
                          ? `${interactable.name} placement`
                          : `Unknown interactable ${action.targetId}`
                      }
                      dragPayload={{
                        type: "action-placement",
                        id: action.id,
                        sourceBeatId: beat.id,
                      }}
                      onStartDrag={startPlacementDrag}
                      onEndDrag={endDrag}
                      onSelect={() =>
                        interactable &&
                        onSelect({
                          kind: "interactable",
                          id: interactable.id,
                        })
                      }
                      onRemove={() =>
                        onRemovePlacement({
                          kind: "action",
                          beatId: beat.id,
                          actionId: action.id,
                        })
                      }
                    >
                      <MousePointerClick size={11} />
                    </TimelineMarker>
                  );
                })}
              </div>
            );
          })}

          <div className="tl-lane-label is-static" style={{ gridRow: itemRow, gridColumn: 1 }}>
            <Package size={13} />
            <span>Inventory</span>
          </div>
          {beats.map((beat, index) => {
            const touches = beat.actions.filter(
              (action) =>
                action.type === "give_item" || action.type === "update_item",
            );
            const triggered =
              beat.triggerType === "item_used"
                ? scene.items.find((item) => item.id === beat.triggerTarget)
                : undefined;
            return (
              <div
                key={`${beat.id}-items`}
                className={`tl-cell ${index === scrubIndex ? "is-playhead" : ""}`}
                data-lane="item"
                data-beat-index={index}
                style={{ gridRow: itemRow, gridColumn: index + 2 }}
              >
                {triggered && (
                  <TimelineMarker
                    key={`${beat.id}-trigger-item`}
                    className={`tl-marker tl-marker-item is-trigger ${
                      isSelected("item", triggered.id) ? "is-selected" : ""
                    }`}
                    title={`Trigger: Grayson uses ${triggered.name} from inventory`}
                    ariaLabel={`${triggered.name} inventory trigger`}
                    dragPayload={{
                      type: "trigger-placement",
                      id: triggered.id,
                      sourceBeatId: beat.id,
                    }}
                    onStartDrag={startPlacementDrag}
                    onEndDrag={endDrag}
                    onSelect={() =>
                      onSelect({ kind: "item", id: triggered.id })
                    }
                    onRemove={() =>
                      onRemovePlacement({
                        kind: "trigger",
                        beatId: beat.id,
                      })
                    }
                  >
                    <Zap size={11} />
                  </TimelineMarker>
                )}
                {touches.map((action) => {
                  const item = scene.items.find(
                    (candidate) => candidate.id === action.targetId,
                  );
                  return (
                    <TimelineMarker
                      key={action.id}
                      className={`tl-marker tl-marker-item ${
                        item && isSelected("item", item.id) ? "is-selected" : ""
                      } ${item ? "" : "is-broken"}`}
                      title={
                        item ? item.name : `Unknown item: ${action.targetId}`
                      }
                      ariaLabel={
                        item
                          ? `${item.name} inventory placement`
                          : `Unknown item ${action.targetId}`
                      }
                      dragPayload={{
                        type: "action-placement",
                        id: action.id,
                        sourceBeatId: beat.id,
                      }}
                      onStartDrag={startPlacementDrag}
                      onEndDrag={endDrag}
                      onSelect={() =>
                        item && onSelect({ kind: "item", id: item.id })
                      }
                      onRemove={() =>
                        onRemovePlacement({
                          kind: "action",
                          beatId: beat.id,
                          actionId: action.id,
                        })
                      }
                    >
                      <Package size={11} />
                    </TimelineMarker>
                  );
                })}
              </div>
            );
          })}

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
