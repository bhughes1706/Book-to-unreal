"use client";

import {
  Bell,
  GripVertical,
  MousePointerClick,
  Package,
  Users,
  Zap,
} from "lucide-react";
import type { MutableRefObject } from "react";
import { useState } from "react";

import type { SceneDraft } from "@/lib/editor-types";
import type { StagingDragPayload } from "@/lib/staging-model";
import {
  npcSpan,
  triggerLabels,
} from "@/lib/staging-model";
import type { StagingSelection } from "@/components/staging-editor";

const DRAG_MIME = "application/x-staging";

export function StagingTimeline({
  scene,
  scrubIndex,
  selection,
  dragPayloadRef,
  onSelect,
  onReorderBeat,
  onRetargetSpan,
  onDropResource,
}: {
  scene: SceneDraft;
  scrubIndex: number;
  selection: StagingSelection | null;
  dragPayloadRef: MutableRefObject<StagingDragPayload | null>;
  onSelect: (selection: StagingSelection) => void;
  onReorderBeat: (fromIndex: number, toIndex: number) => void;
  onRetargetSpan: (
    npcId: string,
    edge: "start" | "end",
    beatIndex: number,
  ) => void;
  onDropResource: (payload: StagingDragPayload, beatIndex: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dropColumn, setDropColumn] = useState<number | null>(null);

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
    } else {
      onDropResource(payload, beatIndex);
    }
    endDrag();
  };

  if (columns === 0) {
    return (
      <div className="staging-timeline is-empty">
        <Zap size={18} />
        <p>
          Add a beat to start the timeline. Beats are the columns; NPCs,
          interactables, inventory items, and HUD events land on them.
        </p>
      </div>
    );
  }

  const isSelected = (kind: StagingSelection["kind"], id: string) =>
    selection?.kind === kind && selection.id === id;

  return (
    <div className="staging-timeline">
      <div className="tl-scroll">
        <div
          className={`tl-grid ${dragging ? "is-dragging" : ""}`}
          style={gridStyle}
        >
          <div className="tl-corner" style={{ gridRow: 1, gridColumn: 1 }}>
            Sequence
          </div>

          {beats.map((beat, index) => (
            <button
              key={beat.id}
              type="button"
              draggable
              className={`tl-beat-head ${
                isSelected("beat", beat.id) ? "is-selected" : ""
              } ${index === scrubIndex ? "is-playhead" : ""} status-tint-${beat.status}`}
              style={{ gridRow: 1, gridColumn: index + 2 }}
              onClick={() => onSelect({ kind: "beat", id: beat.id })}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(DRAG_MIME, beat.id);
                startDrag({ type: "beat", id: beat.id });
              }}
              onDragEnd={endDrag}
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
                style={{
                  gridRow: row,
                  gridColumn: `${span.start + 2} / ${span.end + 3}`,
                }}
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
                style={{ gridRow: hudRow, gridColumn: index + 2 }}
              >
                {shows.map((action) => {
                  const event = scene.hudEvents.find(
                    (candidate) => candidate.id === action.targetId,
                  );
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`tl-marker tl-marker-hud ${
                        event && isSelected("hud", event.id) ? "is-selected" : ""
                      } ${event ? "" : "is-broken"}`}
                      title={event ? event.text : `Unknown HUD: ${action.targetId}`}
                      onClick={() =>
                        event && onSelect({ kind: "hud", id: event.id })
                      }
                    >
                      <Bell size={11} />
                    </button>
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
                style={{ gridRow: interactableRow, gridColumn: index + 2 }}
              >
                {triggered && (
                  <button
                    key={`${beat.id}-trigger-interactable`}
                    type="button"
                    className={`tl-marker tl-marker-interactable is-trigger ${
                      isSelected("interactable", triggered.id)
                        ? "is-selected"
                        : ""
                    }`}
                    title={`Trigger: player uses ${triggered.name}`}
                    onClick={() =>
                      onSelect({ kind: "interactable", id: triggered.id })
                    }
                  >
                    <Zap size={11} />
                  </button>
                )}
                {updated.map((action) => {
                  const interactable = scene.interactables.find(
                    (candidate) => candidate.id === action.targetId,
                  );
                  return (
                    <button
                      key={action.id}
                      type="button"
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
                      onClick={() =>
                        interactable &&
                        onSelect({
                          kind: "interactable",
                          id: interactable.id,
                        })
                      }
                    >
                      <MousePointerClick size={11} />
                    </button>
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
                style={{ gridRow: itemRow, gridColumn: index + 2 }}
              >
                {triggered && (
                  <button
                    key={`${beat.id}-trigger-item`}
                    type="button"
                    className={`tl-marker tl-marker-item is-trigger ${
                      isSelected("item", triggered.id) ? "is-selected" : ""
                    }`}
                    title={`Trigger: Grayson uses ${triggered.name} from inventory`}
                    onClick={() =>
                      onSelect({ kind: "item", id: triggered.id })
                    }
                  >
                    <Zap size={11} />
                  </button>
                )}
                {touches.map((action) => {
                  const item = scene.items.find(
                    (candidate) => candidate.id === action.targetId,
                  );
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`tl-marker tl-marker-item ${
                        item && isSelected("item", item.id) ? "is-selected" : ""
                      } ${item ? "" : "is-broken"}`}
                      title={
                        item ? item.name : `Unknown item: ${action.targetId}`
                      }
                      onClick={() =>
                        item && onSelect({ kind: "item", id: item.id })
                      }
                    >
                      <Package size={11} />
                    </button>
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
              onDragOver={(event) => {
                if (!dragPayloadRef.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect =
                  dragPayloadRef.current.type === "beat" ? "move" : "copy";
                setDropColumn(index);
              }}
              onDragLeave={() =>
                setDropColumn((current) => (current === index ? null : current))
              }
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(index);
              }}
            />
          ))}
        </div>
      </div>
      <p className="tl-hint">
        Drag a beat header to reorder. Drag an NPC name or span edge onto a
        beat to stage entrances and exits. Drag an interactable onto a beat to
        make it the trigger. Click anything to edit it.
      </p>
    </div>
  );
}
