"use client";

import {
  Bell,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Link2,
  ListTree,
  MousePointerClick,
  Package,
  Plus,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { IdField } from "@/components/id-field";
import type { ConfirmationRequest } from "@/components/confirmation-dialog";
import { ResourceRef, kindIcons } from "@/components/resource-ref";
import { StagePreview } from "@/components/stage-preview";
import { StagingTimeline } from "@/components/staging-timeline";
import type {
  BeatAction,
  BeatActionType,
  BeatTriggerType,
  EventThreadRole,
  HudChannel,
  HudDismissMode,
  HudEvent,
  HudResponse,
  NpcBehavior,
  NpcPresence,
  ReviewStatus,
  SceneBeat,
  SceneDraft,
  SceneInteractable,
  SceneInteractableKind,
  SceneItem,
  SceneItemKind,
  SceneItemPersistence,
  SceneItemState,
  SceneNpc,
} from "@/lib/editor-types";
import {
  eventThreadIdSuggestion,
  hudIdSuggestion,
  interactableIdSuggestion,
  itemIdSuggestion,
} from "@/lib/id-builder";
import type {
  StagingDragPayload,
  TimelinePlacement,
} from "@/lib/staging-model";
import {
  actionLabels,
  actionTargetKind,
  actionTargetPlaceholder,
  backReferences,
  behaviorLabels,
  buildCatalog,
  dismissLabels,
  eventThreadRoleLabels,
  hudChannelLabels,
  interactableKindLabels,
  itemKindLabels,
  itemStateLabels,
  npcSpan,
  persistenceLabels,
  presenceLabels,
  triggerLabels,
  triggerSentence,
  triggerTargetKind,
} from "@/lib/staging-model";

type StagingPanel = "beats" | "npcs" | "interactables" | "items" | "hud";

export interface StagingSelection {
  kind: "beat" | "npc" | "interactable" | "item" | "hud";
  id: string;
}

const reviewStatusLabel: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
  needs_discussion: "Discuss",
};

const triggerTargetPlaceholder: Record<BeatTriggerType, string> = {
  begin_play: "",
  interaction: "Interactable",
  item_used: "Inventory item",
  dialogue_complete: "Dialogue line",
  player_enters: "Area name",
  timer: "Duration, e.g. 6s",
  event: "Event name",
  beat_completed: "Beat",
};

const panelForKind: Record<StagingSelection["kind"], StagingPanel> = {
  beat: "beats",
  npc: "npcs",
  interactable: "interactables",
  item: "items",
  hud: "hud",
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
    <label
      className={`review-pill review-${value}`}
      onClick={(event) => event.stopPropagation()}
    >
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
  focusRequest,
  eventThreadIds = [],
  onRequestConfirmation,
}: {
  scene: SceneDraft;
  onChange: (updates: Partial<SceneDraft>) => void;
  onNotice: (message: string) => void;
  focusRequest?: { selection: StagingSelection; token: number } | null;
  eventThreadIds?: string[];
  onRequestConfirmation: (request: ConfirmationRequest) => void;
}) {
  const [panel, setPanel] = useState<StagingPanel>("beats");
  const [selection, setSelection] = useState<StagingSelection | null>(
    scene.beats.length > 0 ? { kind: "beat", id: scene.beats[0].id } : null,
  );
  const [scrub, setScrub] = useState(0);
  const [rowDropIndex, setRowDropIndex] = useState<number | null>(null);
  const dragPayloadRef = useRef<StagingDragPayload | null>(null);

  const catalog = useMemo(() => buildCatalog(scene), [scene]);

  useEffect(() => {
    const maxIndex = Math.max(scene.beats.length - 1, 0);
    if (scrub > maxIndex) setScrub(maxIndex);
  }, [scene.beats.length, scrub]);

  const selectionExists = useMemo(() => {
    if (!selection) return false;
    switch (selection.kind) {
      case "beat":
        return scene.beats.some((beat) => beat.id === selection.id);
      case "npc":
        return scene.npcs.some((npc) => npc.id === selection.id);
      case "item":
        return scene.items.some((item) => item.id === selection.id);
      case "interactable":
        return scene.interactables.some(
          (interactable) => interactable.id === selection.id,
        );
      case "hud":
        return scene.hudEvents.some((event) => event.id === selection.id);
    }
  }, [scene, selection]);
  const activeSelection = selectionExists ? selection : null;

  const select = (next: StagingSelection) => {
    setSelection(next);
    setPanel(panelForKind[next.kind]);
    if (next.kind === "beat") {
      const index = scene.beats.findIndex((beat) => beat.id === next.id);
      if (index !== -1) setScrub(index);
    }
  };

  const focusToken = focusRequest?.token;
  useEffect(() => {
    if (focusToken === undefined || !focusRequest) return;
    select(focusRequest.selection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

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

  const updateInteractable = (
    interactableId: string,
    updates: Partial<SceneInteractable>,
  ) => {
    onChange({
      interactables: scene.interactables.map((interactable) =>
        interactable.id === interactableId
          ? { ...interactable, ...updates }
          : interactable,
      ),
    });
  };

  const renameItemId = (itemId: string, replacementId: string) => {
    onChange({
      items: scene.items.map((item) =>
        item.id === itemId ? { ...item, id: replacementId } : item,
      ),
      beats: scene.beats.map((beat) => ({
        ...beat,
        actions: beat.actions.map((action) => ({
          ...action,
          targetId: action.targetId === itemId ? replacementId : action.targetId,
        })),
      })),
    });
    setSelection({ kind: "item", id: replacementId });
    onNotice(`Item ID renamed to ${replacementId}; beat references were updated.`);
  };

  const renameInteractableId = (
    interactableId: string,
    replacementId: string,
  ) => {
    onChange({
      interactables: scene.interactables.map((interactable) =>
        interactable.id === interactableId
          ? { ...interactable, id: replacementId }
          : interactable,
      ),
      beats: scene.beats.map((beat) => ({
        ...beat,
        triggerTarget:
          beat.triggerTarget === interactableId
            ? replacementId
            : beat.triggerTarget,
        actions: beat.actions.map((action) => ({
          ...action,
          targetId:
            action.targetId === interactableId
              ? replacementId
              : action.targetId,
        })),
      })),
    });
    setSelection({ kind: "interactable", id: replacementId });
    onNotice(
      `Interactable ID renamed to ${replacementId}; beat references were updated.`,
    );
  };

  const updateHudEvent = (eventId: string, updates: Partial<HudEvent>) => {
    onChange({
      hudEvents: scene.hudEvents.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event,
      ),
    });
  };

  const renameHudId = (eventId: string, replacementId: string) => {
    onChange({
      hudEvents: scene.hudEvents.map((event) =>
        event.id === eventId ? { ...event, id: replacementId } : event,
      ),
      beats: scene.beats.map((beat) => ({
        ...beat,
        actions: beat.actions.map((action) => ({
          ...action,
          targetId:
            action.targetId === eventId ? replacementId : action.targetId,
        })),
      })),
    });
    setSelection({ kind: "hud", id: replacementId });
    onNotice(
      `HUD ID renamed to ${replacementId}; beat references were updated.`,
    );
  };

  const updateHudResponse = (
    eventId: string,
    responseId: string,
    updates: Partial<HudResponse>,
  ) => {
    const hudEvent = scene.hudEvents.find((event) => event.id === eventId);
    if (!hudEvent) return;
    updateHudEvent(eventId, {
      responses: (hudEvent.responses || []).map((response) =>
        response.id === responseId ? { ...response, ...updates } : response,
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
    setSelection({ kind: "beat", id });
    setPanel("beats");
    setScrub(scene.beats.length);
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
    setSelection({ kind: "npc", id });
    setPanel("npcs");
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
          kind: "personal_item",
          initialState: "visible",
          persistence: "chapter",
          interactionPrompt: "Take",
          outcome: "Describe why Grayson keeps this in inventory.",
          status: "unreviewed",
        },
      ],
    });
    setSelection({ kind: "item", id });
    setPanel("items");
    onNotice("Added an inventory item.");
  };

  const addInteractable = () => {
    const id = nextId(
      "INTERACT_NEW",
      scene.interactables.map((interactable) => interactable.id),
    );
    onChange({
      interactables: [
        ...scene.interactables,
        {
          id,
          name: "New interactable",
          kind: "inspection",
          interactionPrompt: "Inspect",
          outcome: "Describe what happens in the environment.",
          status: "unreviewed",
        },
      ],
    });
    setSelection({ kind: "interactable", id });
    setPanel("interactables");
    onNotice("Added an environmental interactable.");
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
          responses: [],
          status: "unreviewed",
        },
      ],
    });
    setSelection({ kind: "hud", id });
    setPanel("hud");
    onNotice("Added a HUD or Lens event.");
  };

  const addForPanel = () => {
    if (panel === "beats") addBeat();
    if (panel === "npcs") addNpc();
    if (panel === "interactables") addInteractable();
    if (panel === "items") addItem();
    if (panel === "hud") addHudEvent();
  };

  const addLabel: Record<StagingPanel, string> = {
    beats: "Add beat",
    npcs: "Add NPC",
    interactables: "Add interactable",
    items: "Add item",
    hud: "Add HUD event",
  };

  const moveBeat = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= scene.beats.length ||
      toIndex >= scene.beats.length
    ) {
      return;
    }
    const beats = [...scene.beats];
    const [moved] = beats.splice(fromIndex, 1);
    beats.splice(toIndex, 0, moved);
    onChange({ beats });
    setScrub(toIndex);
  };

  const removeBeatNow = (beatId: string) => {
    onChange({
      beats: scene.beats.filter((candidate) => candidate.id !== beatId),
      npcs: scene.npcs.map((npc) => ({
        ...npc,
        entranceBeatId: npc.entranceBeatId === beatId ? "" : npc.entranceBeatId,
        exitBeatId: npc.exitBeatId === beatId ? "" : npc.exitBeatId,
      })),
    });
    setSelection(null);
    onNotice(
      "Beat deleted. Press ⌘Z or Ctrl+Z to restore it; check any references if you keep the deletion.",
    );
  };

  const requestRemoveBeat = (beatId: string) => {
    const beat = scene.beats.find((candidate) => candidate.id === beatId);
    if (!beat) return;
    onRequestConfirmation({
      title: `Delete “${beat.title}”?`,
      description: `This removes the beat and its ${beat.actions.length} action${
        beat.actions.length === 1 ? "" : "s"
      }. NPC entrance or exit placements on this beat will be cleared.`,
      confirmLabel: "Delete beat",
      onConfirm: () => removeBeatNow(beat.id),
    });
  };

  const retargetSpan = (
    npcId: string,
    edge: "start" | "end",
    beatIndex: number,
  ) => {
    const npc = scene.npcs.find((candidate) => candidate.id === npcId);
    const beat = scene.beats[beatIndex];
    if (!npc || !beat) return;
    if (edge === "start") {
      if (beatIndex === 0) {
        updateNpc(npcId, { presence: "present_at_start", entranceBeatId: "" });
        onNotice(`${npc.displayName} is now present when the scene begins.`);
      } else {
        updateNpc(npcId, {
          presence: npc.presence === "conditional" ? "conditional" : "enters_on_beat",
          entranceBeatId: beat.id,
        });
        onNotice(`${npc.displayName} now enters on “${beat.title}”.`);
      }
    } else {
      updateNpc(npcId, { exitBeatId: beat.id });
      onNotice(`${npc.displayName} now exits on “${beat.title}”.`);
    }
  };

  const moveNpcPresence = (npcId: string, beatIndex: number) => {
    const npc = scene.npcs.find((candidate) => candidate.id === npcId);
    const beat = scene.beats[beatIndex];
    if (!npc || !beat) return;
    const span = npcSpan(scene, npc);
    const lastIndex = Math.max(scene.beats.length - 1, 0);
    const duration = Math.max(span.end - span.start, 0);
    const exitIndex = Math.min(beatIndex + duration, lastIndex);
    updateNpc(npc.id, {
      presence:
        beatIndex === 0
          ? "present_at_start"
          : npc.presence === "conditional"
            ? "conditional"
            : "enters_on_beat",
      entranceBeatId: beatIndex === 0 ? "" : beat.id,
      exitBeatId:
        exitIndex >= lastIndex ? "" : scene.beats[exitIndex]?.id || "",
    });
    setScrub(beatIndex);
    select({ kind: "npc", id: npc.id });
    onNotice(
      beatIndex === 0
        ? `${npc.displayName} is now present when the scene begins.`
        : `${npc.displayName} now enters on “${beat.title}”.`,
    );
  };

  const removeTimelinePlacementNow = (placement: TimelinePlacement) => {
    const beat = scene.beats.find(
      (candidate) => candidate.id === placement.beatId,
    );
    if (!beat) return;
    if (placement.kind === "trigger") {
      updateBeat(beat.id, {
        triggerType: "begin_play",
        triggerTarget: "",
      });
      onNotice(
        `Removed the trigger from “${beat.title}”. The beat now starts with the scene; its resource remains available.`,
      );
      return;
    }
    const action = beat.actions.find(
      (candidate) => candidate.id === placement.actionId,
    );
    if (!action) return;
    updateBeat(beat.id, {
      actions: beat.actions.filter(
        (candidate) => candidate.id !== placement.actionId,
      ),
    });
    onNotice(
      `Removed ${actionLabels[action.type].toLowerCase()} from “${beat.title}”. The underlying resource was not deleted.`,
    );
  };

  const requestRemoveTimelinePlacement = (placement: TimelinePlacement) => {
    const beat = scene.beats.find(
      (candidate) => candidate.id === placement.beatId,
    );
    if (!beat) return;
    const action =
      placement.kind === "action"
        ? beat.actions.find(
            (candidate) => candidate.id === placement.actionId,
          )
        : undefined;
    onRequestConfirmation({
      title:
        placement.kind === "trigger"
          ? `Remove the trigger from “${beat.title}”?`
          : `Remove this placement from “${beat.title}”?`,
      description:
        placement.kind === "trigger"
          ? "The beat will start with the scene instead. The item or interactable itself will remain available."
          : `${action ? actionLabels[action.type] : "This action"} will be unstaged. Its HUD, item, or interactable resource will not be deleted.`,
      confirmLabel: "Remove placement",
      onConfirm: () => removeTimelinePlacementNow(placement),
    });
  };

  const dropResource = (payload: StagingDragPayload, beatIndex: number) => {
    const beat = scene.beats[beatIndex];
    if (!beat) return;
    if (payload.type === "action-placement") {
      const sourceBeat = scene.beats.find(
        (candidate) => candidate.id === payload.sourceBeatId,
      );
      const action = sourceBeat?.actions.find(
        (candidate) => candidate.id === payload.id,
      );
      if (!sourceBeat || !action) return;
      if (sourceBeat.id === beat.id) {
        onNotice(`That placement is already on “${beat.title}”.`);
        return;
      }
      onChange({
        beats: scene.beats.map((candidate) => {
          if (candidate.id === sourceBeat.id) {
            return {
              ...candidate,
              actions: candidate.actions.filter(
                (sourceAction) => sourceAction.id !== action.id,
              ),
            };
          }
          if (candidate.id === beat.id) {
            return {
              ...candidate,
              actions: [...candidate.actions, action],
            };
          }
          return candidate;
        }),
      });
      setScrub(beatIndex);
      select({ kind: "beat", id: beat.id });
      onNotice(
        `Moved ${actionLabels[action.type].toLowerCase()} from “${sourceBeat.title}” to “${beat.title}”.`,
      );
      return;
    }
    if (payload.type === "trigger-placement") {
      const sourceBeat = scene.beats.find(
        (candidate) => candidate.id === payload.sourceBeatId,
      );
      if (!sourceBeat) return;
      if (sourceBeat.id === beat.id) {
        onNotice(`That trigger is already on “${beat.title}”.`);
        return;
      }
      const sourceTrigger = {
        triggerType: sourceBeat.triggerType,
        triggerTarget: sourceBeat.triggerTarget,
      };
      const targetTrigger = {
        triggerType: beat.triggerType,
        triggerTarget: beat.triggerTarget,
      };
      onChange({
        beats: scene.beats.map((candidate) => {
          if (candidate.id === sourceBeat.id) {
            return { ...candidate, ...targetTrigger };
          }
          if (candidate.id === beat.id) {
            return { ...candidate, ...sourceTrigger };
          }
          return candidate;
        }),
      });
      setScrub(beatIndex);
      select({ kind: "beat", id: beat.id });
      onNotice(
        `Moved the trigger from “${sourceBeat.title}” to “${beat.title}”${
          beat.triggerType === "begin_play"
            ? "."
            : " and moved the destination trigger back."
        }`,
      );
      return;
    }
    const actionId = nextId(
      `${beat.id}_ACTION`,
      beat.actions.map((action) => action.id),
    );
    if (payload.type === "npc") {
      const npc = scene.npcs.find((candidate) => candidate.id === payload.id);
      if (!npc) return;
      const entersHere =
        npc.presence !== "present_at_start" && !npc.entranceBeatId;
      if (entersHere) {
        onChange({
          npcs: scene.npcs.map((candidate) =>
            candidate.id === npc.id
              ? { ...candidate, entranceBeatId: beat.id }
              : candidate,
          ),
          beats: scene.beats.map((candidate) =>
            candidate.id === beat.id
              ? {
                  ...candidate,
                  actions: [
                    ...candidate.actions,
                    {
                      id: actionId,
                      type: "spawn_npc" as const,
                      targetId: npc.id,
                      detail: `${npc.displayName} enters the scene.`,
                    },
                  ],
                }
              : candidate,
          ),
        });
        onNotice(
          `${npc.displayName} enters on “${beat.title}” with a spawn action.`,
        );
      } else {
        updateBeat(beat.id, {
          actions: [
            ...beat.actions,
            {
              id: actionId,
              type: "move_npc",
              targetId: npc.id,
              detail: "Describe the movement or new position.",
            },
          ],
        });
        onNotice(`Added a move action for ${npc.displayName} on “${beat.title}”.`);
      }
      select({ kind: "beat", id: beat.id });
      return;
    }
    if (payload.type === "item") {
      const item = scene.items.find((candidate) => candidate.id === payload.id);
      if (!item) return;
      updateBeat(beat.id, {
        actions: [
          ...beat.actions,
          {
            id: actionId,
            type: "give_item",
            targetId: item.id,
            detail: `The player receives ${item.name}.`,
          },
        ],
      });
      onNotice(`“${beat.title}” now gives ${item.name}.`);
      select({ kind: "beat", id: beat.id });
      return;
    }
    if (payload.type === "interactable") {
      const interactable = scene.interactables.find(
        (candidate) => candidate.id === payload.id,
      );
      if (!interactable) return;
      updateBeat(beat.id, {
        triggerType: "interaction",
        triggerTarget: interactable.id,
      });
      onNotice(
        `“${beat.title}” now begins when the player uses ${interactable.name}.`,
      );
      select({ kind: "beat", id: beat.id });
      return;
    }
    if (payload.type === "hud") {
      const hudEvent = scene.hudEvents.find(
        (candidate) => candidate.id === payload.id,
      );
      if (!hudEvent) return;
      updateBeat(beat.id, {
        actions: [
          ...beat.actions,
          {
            id: actionId,
            type: "show_hud",
            targetId: hudEvent.id,
            detail: "Show this on-screen text.",
          },
        ],
      });
      onNotice(`“${beat.title}” now shows that HUD event.`);
      select({ kind: "beat", id: beat.id });
    }
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
      id: "interactables",
      label: "Interactables",
      description: "World interaction points",
      count: scene.interactables.length,
      Icon: MousePointerClick,
    },
    {
      id: "items",
      label: "Items",
      description: "Inventory and pickups",
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

  const sceneResourceIds = [
    ...scene.dialogue.map((entry) => entry.id),
    ...scene.npcs.map((entry) => entry.id),
    ...scene.interactables.map((entry) => entry.id),
    ...scene.items.map((entry) => entry.id),
    ...scene.hudEvents.map((entry) => entry.id),
    ...scene.beats.map((entry) => entry.id),
  ];

  const isEmptyPanel =
    (panel === "beats" && scene.beats.length === 0) ||
    (panel === "npcs" && scene.npcs.length === 0) ||
    (panel === "interactables" && scene.interactables.length === 0) ||
    (panel === "items" && scene.items.length === 0) ||
    (panel === "hud" && scene.hudEvents.length === 0);

  const renderBackRefs = (resourceId: string) => {
    const references = backReferences(scene, resourceId);
    return (
      <div className="backrefs">
        <span className="backrefs-title">
          <Link2 size={11} />
          Used by
        </span>
        {references.length === 0 ? (
          <em>Nothing references this yet.</em>
        ) : (
          <div className="preview-chips">
            {references.map((reference, index) => {
              const Icon = kindIcons[reference.kind];
              return (
                <button
                  key={`${reference.id}-${index}`}
                  type="button"
                  className="preview-chip chip-ref"
                  onClick={() =>
                    select({
                      kind: reference.kind as StagingSelection["kind"],
                      id: reference.id,
                    })
                  }
                >
                  <Icon size={10} />
                  {reference.label}
                  <b>{reference.role}</b>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const selectedBeat =
    activeSelection?.kind === "beat"
      ? scene.beats.find((beat) => beat.id === activeSelection.id)
      : undefined;
  const selectedBeatIndex = selectedBeat
    ? scene.beats.findIndex((beat) => beat.id === selectedBeat.id)
    : -1;
  const selectedNpc =
    activeSelection?.kind === "npc"
      ? scene.npcs.find((npc) => npc.id === activeSelection.id)
      : undefined;
  const selectedItem =
    activeSelection?.kind === "item"
      ? scene.items.find((item) => item.id === activeSelection.id)
      : undefined;
  const selectedInteractable =
    activeSelection?.kind === "interactable"
      ? scene.interactables.find(
          (interactable) => interactable.id === activeSelection.id,
        )
      : undefined;
  const selectedHud =
    activeSelection?.kind === "hud"
      ? scene.hudEvents.find((event) => event.id === activeSelection.id)
      : undefined;

  const approvedSummary = [
    { label: "Beats", list: scene.beats },
    { label: "NPCs", list: scene.npcs },
    { label: "Interactables", list: scene.interactables },
    { label: "Items", list: scene.items },
    { label: "HUD", list: scene.hudEvents },
  ].map(({ label, list }) => ({
    label,
    approved: list.filter((entry) => entry.status === "approved").length,
    total: list.length,
  }));

  return (
    <section className="editor-section staging-section">
      <datalist id={`event-thread-options-${scene.id}`}>
        {eventThreadIds.map((eventId) => (
          <option key={eventId} value={eventId} />
        ))}
      </datalist>
      <div className="section-heading">
        <div>
          <div className="eyebrow">Playable staging</div>
          <h2>Turn approved story intent into a sequence the player can feel.</h2>
        </div>
        {panel !== "beats" && (
          <button className="button button-secondary" onClick={addForPanel}>
            <Plus size={16} />
            {addLabel[panel]}
          </button>
        )}
      </div>

      <StagingTimeline
        scene={scene}
        scrubIndex={scrub}
        selection={activeSelection}
        dragPayloadRef={dragPayloadRef}
        onSelect={select}
        onReorderBeat={moveBeat}
        onAddBeat={addBeat}
        onRemoveBeat={requestRemoveBeat}
        onMoveNpcPresence={moveNpcPresence}
        onRetargetSpan={retargetSpan}
        onDropResource={dropResource}
        onRemovePlacement={requestRemoveTimelinePlacement}
      />

      <StagePreview
        scene={scene}
        scrubIndex={scrub}
        onScrub={(index) => {
          setScrub(index);
          const beat = scene.beats[index];
          if (beat) setSelection({ kind: "beat", id: beat.id });
        }}
        onSelect={select}
      />

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

      <div className="staging-workbench">
        <div className="staging-list" aria-label={`${addLabel[panel]} list`}>
          {isEmptyPanel && (
            <div className="empty-state compact staging-empty">
              <Zap size={25} />
              <h3>No {addLabel[panel].replace("Add ", "").toLowerCase()} yet</h3>
              <p>
                Add story-facing direction here. Exact placement, assets, and
                engine implementation stay in the runtime manifest.
              </p>
              <button className="button button-primary" onClick={addForPanel}>
                <Plus size={15} />
                {addLabel[panel]}
              </button>
            </div>
          )}

          {panel === "beats" &&
            scene.beats.map((beat, beatIndex) => (
              <div
                key={beat.id}
                role="button"
                tabIndex={0}
                draggable
                className={`staging-row ${
                  selectedBeat?.id === beat.id ? "is-selected" : ""
                } ${rowDropIndex === beatIndex ? "is-drop-target" : ""}`}
                onClick={() => select({ kind: "beat", id: beat.id })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select({ kind: "beat", id: beat.id });
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/x-staging", beat.id);
                  dragPayloadRef.current = { type: "beat", id: beat.id };
                }}
                onDragEnd={() => {
                  dragPayloadRef.current = null;
                  setRowDropIndex(null);
                }}
                onDragOver={(event) => {
                  if (dragPayloadRef.current?.type !== "beat") return;
                  event.preventDefault();
                  setRowDropIndex(beatIndex);
                }}
                onDragLeave={() =>
                  setRowDropIndex((current) =>
                    current === beatIndex ? null : current,
                  )
                }
                onDrop={(event) => {
                  event.preventDefault();
                  const payload = dragPayloadRef.current;
                  if (payload?.type === "beat") {
                    const fromIndex = scene.beats.findIndex(
                      (candidate) => candidate.id === payload.id,
                    );
                    moveBeat(fromIndex, beatIndex);
                  }
                  dragPayloadRef.current = null;
                  setRowDropIndex(null);
                }}
              >
                <span className="row-grip">
                  <GripVertical size={14} />
                </span>
                <span className="row-order">
                  {String(beatIndex + 1).padStart(2, "0")}
                </span>
                <span className="row-copy">
                  <strong>{beat.title}</strong>
                  <small>
                    {triggerSentence(beat, catalog)} · {beat.actions.length}{" "}
                    action{beat.actions.length === 1 ? "" : "s"}
                    {beat.optional ? " · optional" : ""}
                  </small>
                </span>
                <ReviewControl
                  value={beat.status}
                  onChange={(status) => updateBeat(beat.id, { status })}
                />
                <span className="row-reorder">
                  <button
                    className="icon-button"
                    aria-label="Move beat earlier"
                    disabled={beatIndex === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveBeat(beatIndex, beatIndex - 1);
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Move beat later"
                    disabled={beatIndex === scene.beats.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveBeat(beatIndex, beatIndex + 1);
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>
              </div>
            ))}

          {panel === "npcs" &&
            scene.npcs.map((npc) => (
              <div
                key={npc.id}
                role="button"
                tabIndex={0}
                draggable
                className={`staging-row ${
                  selectedNpc?.id === npc.id ? "is-selected" : ""
                }`}
                onClick={() => select({ kind: "npc", id: npc.id })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select({ kind: "npc", id: npc.id });
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData("application/x-staging", npc.id);
                  dragPayloadRef.current = { type: "npc", id: npc.id };
                }}
                onDragEnd={() => {
                  dragPayloadRef.current = null;
                }}
              >
                <span className="row-avatar resource-avatar">
                  <Users size={15} />
                </span>
                <span className="row-copy">
                  <strong>{npc.displayName}</strong>
                  <small>
                    {presenceLabels[npc.presence]} ·{" "}
                    {behaviorLabels[npc.behavior]}
                  </small>
                </span>
                <ReviewControl
                  value={npc.status}
                  onChange={(status) => updateNpc(npc.id, { status })}
                />
              </div>
            ))}

          {panel === "interactables" &&
            scene.interactables.map((interactable) => (
              <div
                key={interactable.id}
                role="button"
                tabIndex={0}
                draggable
                className={`staging-row ${
                  selectedInteractable?.id === interactable.id
                    ? "is-selected"
                    : ""
                }`}
                onClick={() =>
                  select({ kind: "interactable", id: interactable.id })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select({ kind: "interactable", id: interactable.id });
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(
                    "application/x-staging",
                    interactable.id,
                  );
                  dragPayloadRef.current = {
                    type: "interactable",
                    id: interactable.id,
                  };
                }}
                onDragEnd={() => {
                  dragPayloadRef.current = null;
                }}
              >
                <span className="row-avatar resource-avatar interactable-avatar">
                  <MousePointerClick size={15} />
                </span>
                <span className="row-copy">
                  <strong>{interactable.name}</strong>
                  <small>
                    {interactableKindLabels[interactable.kind]} ·{" "}
                    {interactable.interactionPrompt || "Interact"}
                  </small>
                </span>
                <ReviewControl
                  value={interactable.status}
                  onChange={(status) =>
                    updateInteractable(interactable.id, { status })
                  }
                />
              </div>
            ))}

          {panel === "items" &&
            scene.items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                draggable
                className={`staging-row ${
                  selectedItem?.id === item.id ? "is-selected" : ""
                }`}
                onClick={() => select({ kind: "item", id: item.id })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select({ kind: "item", id: item.id });
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData("application/x-staging", item.id);
                  dragPayloadRef.current = { type: "item", id: item.id };
                }}
                onDragEnd={() => {
                  dragPayloadRef.current = null;
                }}
              >
                <span className="row-avatar resource-avatar item-avatar">
                  <Package size={15} />
                </span>
                <span className="row-copy">
                  <strong>{item.name}</strong>
                  <small>
                    Inventory · {itemKindLabels[item.kind]} ·{" "}
                    {itemStateLabels[item.initialState]}
                  </small>
                </span>
                <ReviewControl
                  value={item.status}
                  onChange={(status) => updateItem(item.id, { status })}
                />
              </div>
            ))}

          {panel === "hud" &&
            scene.hudEvents.map((hudEvent) => (
              <div
                key={hudEvent.id}
                role="button"
                tabIndex={0}
                draggable
                className={`staging-row ${
                  selectedHud?.id === hudEvent.id ? "is-selected" : ""
                }`}
                onClick={() => select({ kind: "hud", id: hudEvent.id })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select({ kind: "hud", id: hudEvent.id });
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(
                    "application/x-staging",
                    hudEvent.id,
                  );
                  dragPayloadRef.current = { type: "hud", id: hudEvent.id };
                }}
                onDragEnd={() => {
                  dragPayloadRef.current = null;
                }}
              >
                <span className="row-avatar resource-avatar hud-avatar">
                  <Bell size={15} />
                </span>
                <span className="row-copy">
                  <strong>{hudChannelLabels[hudEvent.channel]}</strong>
                  <small>
                    {hudEvent.text.slice(0, 64) || "No text yet"}
                    {hudEvent.text.length > 64 ? "…" : ""}
                  </small>
                </span>
                <ReviewControl
                  value={hudEvent.status}
                  onChange={(status) => updateHudEvent(hudEvent.id, { status })}
                />
              </div>
            ))}
        </div>

        <aside className="staging-inspector">
          {!activeSelection && (
            <div className="staging-inspector-empty">
              <MousePointerClick size={20} />
              <h3>Nothing selected</h3>
              <p>
                Click a beat on the timeline, or any row on the left, to edit it
                here.
              </p>
              <div className="inspector-progress">
                {approvedSummary.map(({ label, approved, total }) => (
                  <div key={label}>
                    <small>{label}</small>
                    <strong>
                      {approved}/{total}
                    </strong>
                    <span>approved</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedBeat && (
            <div className="staging-inspector-body">
              <div className="inspector-entity-head">
                <small>
                  BEAT {String(selectedBeatIndex + 1).padStart(2, "0")} ·{" "}
                  {selectedBeat.id}
                </small>
                <input
                  aria-label="Beat title"
                  className="inspector-title-input"
                  value={selectedBeat.title}
                  onChange={(event) =>
                    updateBeat(selectedBeat.id, { title: event.target.value })
                  }
                />
                <div className="inspector-entity-tools">
                  <ReviewControl
                    value={selectedBeat.status}
                    onChange={(status) =>
                      updateBeat(selectedBeat.id, { status })
                    }
                  />
                  <button
                    className="icon-button danger-hover"
                    aria-label="Remove beat"
                    onClick={() => requestRemoveBeat(selectedBeat.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="sentence-block">
                <span className="sentence-kicker">Trigger</span>
                <div className="sentence-row">
                  <span className="sentence-word">When</span>
                  <label className="inline-select">
                    <select
                      aria-label="Trigger type"
                      value={selectedBeat.triggerType}
                      onChange={(event) =>
                        updateBeat(selectedBeat.id, {
                          triggerType: event.target.value as BeatTriggerType,
                          triggerTarget:
                            event.target.value === "begin_play"
                              ? ""
                              : selectedBeat.triggerTarget,
                        })
                      }
                    >
                      {Object.entries(triggerLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label.toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} />
                  </label>
                  {selectedBeat.triggerType !== "begin_play" && (
                    <ResourceRef
                      value={selectedBeat.triggerTarget}
                      onChange={(next) =>
                        updateBeat(selectedBeat.id, { triggerTarget: next })
                      }
                      catalog={catalog}
                      expectKind={triggerTargetKind[selectedBeat.triggerType]}
                      placeholder={
                        triggerTargetPlaceholder[selectedBeat.triggerType]
                      }
                      ariaLabel="Trigger target"
                    />
                  )}
                  <label className="optional-toggle">
                    <input
                      type="checkbox"
                      checked={selectedBeat.optional}
                      onChange={(event) =>
                        updateBeat(selectedBeat.id, {
                          optional: event.target.checked,
                        })
                      }
                    />
                    Optional
                  </label>
                </div>
              </div>

              <div className="event-link-fields">
                <label className="stage-field">
                  <span>Event thread ID</span>
                  <input
                    list={`event-thread-options-${scene.id}`}
                    placeholder={eventThreadIdSuggestion(selectedBeat.title)}
                    value={selectedBeat.eventThreadId || ""}
                    onChange={(event) =>
                      updateBeat(selectedBeat.id, {
                        eventThreadId: event.target.value
                          .toUpperCase()
                          .replace(/[\s-]+/g, "_")
                          .replace(/[^A-Z0-9_]/g, ""),
                      })
                    }
                  />
                  <small>
                    Reuse one ID in later scenes to build a continuity thread.
                  </small>
                </label>
                {selectedBeat.eventThreadId && (
                  <>
                    <label className="stage-field">
                      <span>Thread role</span>
                      <select
                        value={selectedBeat.eventThreadRole || "reference"}
                        onChange={(event) =>
                          updateBeat(selectedBeat.id, {
                            eventThreadRole: event.target
                              .value as EventThreadRole,
                          })
                        }
                      >
                        {Object.entries(eventThreadRoleLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="stage-field event-link-note">
                      <span>Continuity note</span>
                      <input
                        placeholder="What changes or carries forward here?"
                        value={selectedBeat.eventThreadNote || ""}
                        onChange={(event) =>
                          updateBeat(selectedBeat.id, {
                            eventThreadNote: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="sentence-block">
                <div className="sentence-block-head">
                  <span className="sentence-kicker">Then, in order</span>
                  <button
                    className="text-button"
                    onClick={() => {
                      const actionId = nextId(
                        `${selectedBeat.id}_ACTION`,
                        selectedBeat.actions.map((action) => action.id),
                      );
                      updateBeat(selectedBeat.id, {
                        actions: [
                          ...selectedBeat.actions,
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
                    <Plus size={13} />
                    Add action
                  </button>
                </div>
                {selectedBeat.actions.map((action, actionIndex) => (
                  <div className="sentence-row action-sentence" key={action.id}>
                    <span className="action-index">{actionIndex + 1}</span>
                    <label className="inline-select">
                      <select
                        aria-label={`Action ${actionIndex + 1} type`}
                        value={action.type}
                        onChange={(event) =>
                          updateAction(selectedBeat.id, action.id, {
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
                      <ChevronDown size={12} />
                    </label>
                    <ResourceRef
                      value={action.targetId}
                      onChange={(next) =>
                        updateAction(selectedBeat.id, action.id, {
                          targetId: next,
                        })
                      }
                      catalog={catalog}
                      expectKind={actionTargetKind[action.type]}
                      placeholder={actionTargetPlaceholder[action.type]}
                      ariaLabel={`Action ${actionIndex + 1} target`}
                    />
                    <input
                      className="sentence-detail"
                      aria-label={`Action ${actionIndex + 1} direction`}
                      placeholder="Direction or intended result"
                      value={action.detail}
                      onChange={(event) =>
                        updateAction(selectedBeat.id, action.id, {
                          detail: event.target.value,
                        })
                      }
                    />
                    <button
                      className="icon-button danger-hover"
                      aria-label="Remove action"
                      disabled={selectedBeat.actions.length === 1}
                      onClick={() =>
                        onRequestConfirmation({
                          title: `Delete action ${actionIndex + 1}?`,
                          description: `${actionLabels[action.type]} will be removed from “${selectedBeat.title}”. The underlying resource, if any, will remain available.`,
                          confirmLabel: "Delete action",
                          onConfirm: () =>
                            updateBeat(selectedBeat.id, {
                              actions: selectedBeat.actions.filter(
                                (candidate) => candidate.id !== action.id,
                              ),
                            }),
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {renderBackRefs(selectedBeat.id)}
            </div>
          )}

          {selectedNpc && (
            <div className="staging-inspector-body">
              <div className="inspector-entity-head">
                <small>NPC · {selectedNpc.id}</small>
                <input
                  aria-label="NPC name"
                  className="inspector-title-input"
                  value={selectedNpc.displayName}
                  onChange={(event) =>
                    updateNpc(selectedNpc.id, {
                      displayName: event.target.value,
                    })
                  }
                />
                <div className="inspector-entity-tools">
                  <ReviewControl
                    value={selectedNpc.status}
                    onChange={(status) => updateNpc(selectedNpc.id, { status })}
                  />
                  <button
                    className="icon-button danger-hover"
                    aria-label="Remove NPC"
                    onClick={() =>
                      onRequestConfirmation({
                        title: `Delete ${selectedNpc.displayName}?`,
                        description:
                          "This removes the NPC and its timeline presence. Beat actions targeting it may need review.",
                        confirmLabel: "Delete NPC",
                        onConfirm: () => {
                          onChange({
                            npcs: scene.npcs.filter(
                              (candidate) =>
                                candidate.id !== selectedNpc.id,
                            ),
                          });
                          setSelection(null);
                          onNotice(
                            "NPC deleted. Press ⌘Z or Ctrl+Z to restore it.",
                          );
                        },
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="stage-fields inspector-fields">
                <label className="stage-field">
                  <span>Story role</span>
                  <input
                    value={selectedNpc.role}
                    onChange={(event) =>
                      updateNpc(selectedNpc.id, { role: event.target.value })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>Presence</span>
                  <select
                    value={selectedNpc.presence}
                    onChange={(event) =>
                      updateNpc(selectedNpc.id, {
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
                    value={selectedNpc.behavior}
                    onChange={(event) =>
                      updateNpc(selectedNpc.id, {
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
                    value={selectedNpc.entranceBeatId}
                    onChange={(event) =>
                      updateNpc(selectedNpc.id, {
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
                    value={selectedNpc.exitBeatId}
                    onChange={(event) =>
                      updateNpc(selectedNpc.id, {
                        exitBeatId: event.target.value,
                      })
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
                <label className="stage-field">
                  <span>Performance and staging notes</span>
                  <textarea
                    placeholder="Entrance direction, emotional tone, movement, or silhouette…"
                    value={selectedNpc.stagingNotes}
                    onChange={(event) =>
                      updateNpc(selectedNpc.id, {
                        stagingNotes: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {renderBackRefs(selectedNpc.id)}
            </div>
          )}

          {selectedInteractable && (
            <div className="staging-inspector-body">
              <div className="inspector-entity-head">
                <small>INTERACTABLE · {selectedInteractable.id}</small>
                <input
                  aria-label="Interactable name"
                  className="inspector-title-input"
                  value={selectedInteractable.name}
                  onChange={(event) =>
                    updateInteractable(selectedInteractable.id, {
                      name: event.target.value,
                    })
                  }
                />
                <div className="inspector-entity-tools">
                  <ReviewControl
                    value={selectedInteractable.status}
                    onChange={(status) =>
                      updateInteractable(selectedInteractable.id, { status })
                    }
                  />
                  <button
                    className="icon-button danger-hover"
                    aria-label="Remove interactable"
                    onClick={() =>
                      onRequestConfirmation({
                        title: `Delete ${selectedInteractable.name}?`,
                        description:
                          "This removes the world interactable. Beat triggers and actions targeting it may need review.",
                        confirmLabel: "Delete interactable",
                        onConfirm: () => {
                          onChange({
                            interactables: scene.interactables.filter(
                              (candidate) =>
                                candidate.id !== selectedInteractable.id,
                            ),
                          });
                          setSelection(null);
                          onNotice(
                            "Interactable deleted. Press ⌘Z or Ctrl+Z to restore it.",
                          );
                        },
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="stage-fields inspector-fields">
                <IdField
                  className="stage-field"
                  label="Interactable ID"
                  ariaLabel="Interactable ID"
                  value={selectedInteractable.id}
                  suggestedId={interactableIdSuggestion(
                    selectedInteractable.name,
                  )}
                  suggestionReason="World interactables use WORLD_INTERACT followed by a short content cadence."
                  reservedIds={sceneResourceIds.filter(
                    (id) => id !== selectedInteractable.id,
                  )}
                  onCommit={(next) =>
                    renameInteractableId(selectedInteractable.id, next)
                  }
                />
                <label className="stage-field">
                  <span>Interaction type</span>
                  <select
                    value={selectedInteractable.kind}
                    onChange={(event) =>
                      updateInteractable(selectedInteractable.id, {
                        kind: event.target.value as SceneInteractableKind,
                      })
                    }
                  >
                    {Object.entries(interactableKindLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="stage-field">
                  <span>Player prompt</span>
                  <input
                    placeholder="Inspect, Open, Enter, Climb…"
                    value={selectedInteractable.interactionPrompt}
                    onChange={(event) =>
                      updateInteractable(selectedInteractable.id, {
                        interactionPrompt: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>Environmental outcome</span>
                  <textarea
                    value={selectedInteractable.outcome}
                    onChange={(event) =>
                      updateInteractable(selectedInteractable.id, {
                        outcome: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {renderBackRefs(selectedInteractable.id)}
            </div>
          )}

          {selectedItem && (
            <div className="staging-inspector-body">
              <div className="inspector-entity-head">
                <small>INVENTORY ITEM · {selectedItem.id}</small>
                <input
                  aria-label="Item name"
                  className="inspector-title-input"
                  value={selectedItem.name}
                  onChange={(event) =>
                    updateItem(selectedItem.id, { name: event.target.value })
                  }
                />
                <div className="inspector-entity-tools">
                  <ReviewControl
                    value={selectedItem.status}
                    onChange={(status) =>
                      updateItem(selectedItem.id, { status })
                    }
                  />
                  <button
                    className="icon-button danger-hover"
                    aria-label="Remove item"
                    onClick={() =>
                      onRequestConfirmation({
                        title: `Delete ${selectedItem.name}?`,
                        description:
                          "This removes the inventory item from the scene. Beat actions targeting it may need review.",
                        confirmLabel: "Delete item",
                        onConfirm: () => {
                          onChange({
                            items: scene.items.filter(
                              (candidate) =>
                                candidate.id !== selectedItem.id,
                            ),
                          });
                          setSelection(null);
                          onNotice(
                            "Item deleted. Press ⌘Z or Ctrl+Z to restore it.",
                          );
                        },
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="stage-fields inspector-fields">
                <IdField
                  className="stage-field"
                  label="Item ID"
                  ariaLabel="Item ID"
                  value={selectedItem.id}
                  suggestedId={itemIdSuggestion(selectedItem.name)}
                  suggestionReason="Inventory IDs begin with the owner, then ITEM, then a short name cadence."
                  reservedIds={sceneResourceIds.filter(
                    (id) => id !== selectedItem.id,
                  )}
                  onCommit={(next) => renameItemId(selectedItem.id, next)}
                />
                <label className="stage-field">
                  <span>Type</span>
                  <select
                    value={selectedItem.kind}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
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
                  <span>Inventory state</span>
                  <select
                    value={selectedItem.initialState}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
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
                    value={selectedItem.persistence}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        persistence: event.target.value as SceneItemPersistence,
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
                  <span>Pickup prompt</span>
                  <input
                    placeholder="Take, Keep, Read…"
                    value={selectedItem.interactionPrompt}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        interactionPrompt: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>Inventory purpose or effect</span>
                  <textarea
                    value={selectedItem.outcome}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        outcome: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {renderBackRefs(selectedItem.id)}
            </div>
          )}

          {selectedHud && (
            <div className="staging-inspector-body">
              <div className="inspector-entity-head">
                <small>HUD · {selectedHud.id}</small>
                <strong className="inspector-title-static">
                  {hudChannelLabels[selectedHud.channel]}
                </strong>
                <div className="inspector-entity-tools">
                  <ReviewControl
                    value={selectedHud.status}
                    onChange={(status) =>
                      updateHudEvent(selectedHud.id, { status })
                    }
                  />
                  <button
                    className="icon-button danger-hover"
                    aria-label="Remove HUD event"
                    onClick={() =>
                      onRequestConfirmation({
                        title: "Delete this HUD event?",
                        description: `This removes “${selectedHud.text.slice(
                          0,
                          110,
                        )}” and its player responses. Beat actions targeting it may need review.`,
                        confirmLabel: "Delete HUD event",
                        onConfirm: () => {
                          onChange({
                            hudEvents: scene.hudEvents.filter(
                              (candidate) =>
                                candidate.id !== selectedHud.id,
                            ),
                          });
                          setSelection(null);
                          onNotice(
                            "HUD event deleted. Press ⌘Z or Ctrl+Z to restore it.",
                          );
                        },
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className={`hud-preview hud-${selectedHud.channel}`}>
                <span>{hudChannelLabels[selectedHud.channel]}</span>
                <p>{selectedHud.text || "On-screen text preview"}</p>
                {(selectedHud.responses || []).length > 0 && (
                  <div className="hud-preview-responses">
                    {(selectedHud.responses || []).map((response) => (
                      <button type="button" key={response.id}>
                        {response.label}
                      </button>
                    ))}
                  </div>
                )}
                <small>{dismissLabels[selectedHud.dismissMode]}</small>
              </div>

              {backReferences(scene, selectedHud.id).length === 0 &&
                scene.beats.length > 0 && (
                  <button
                    className="button button-secondary button-full stage-hud-button"
                    onClick={() => {
                      const beat = scene.beats[scrub];
                      const actionId = nextId(
                        `${beat.id}_ACTION`,
                        beat.actions.map((action) => action.id),
                      );
                      updateBeat(beat.id, {
                        actions: [
                          ...beat.actions,
                          {
                            id: actionId,
                            type: "show_hud",
                            targetId: selectedHud.id,
                            detail: "Show this on-screen text.",
                          },
                        ],
                      });
                      onNotice(`“${beat.title}” now shows this HUD event.`);
                    }}
                  >
                    <Zap size={14} />
                    Not staged yet — show it on beat {scrub + 1}
                  </button>
                )}

              <div className="stage-fields inspector-fields">
                <IdField
                  className="stage-field"
                  label="HUD event ID"
                  ariaLabel="HUD event ID"
                  value={selectedHud.id}
                  suggestedId={hudIdSuggestion(
                    selectedHud.channel,
                    selectedHud.text,
                  )}
                  suggestionReason={
                    selectedHud.channel === "internal_observation"
                      ? "Internal observations use GRAYSON_MONOLOGUE followed by a short content cadence."
                      : "Lens UI uses LENS, the channel, and a short content cadence."
                  }
                  reservedIds={sceneResourceIds.filter(
                    (id) => id !== selectedHud.id,
                  )}
                  onCommit={(next) => renameHudId(selectedHud.id, next)}
                />
                <label className="stage-field">
                  <span>Channel</span>
                  <select
                    value={selectedHud.channel}
                    onChange={(event) =>
                      updateHudEvent(selectedHud.id, {
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
                    value={selectedHud.dismissMode}
                    onChange={(event) =>
                      updateHudEvent(selectedHud.id, {
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
                    disabled={selectedHud.dismissMode !== "timed"}
                    value={selectedHud.durationSeconds}
                    onChange={(event) =>
                      updateHudEvent(selectedHud.id, {
                        durationSeconds: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>Author-facing trigger</span>
                  <input
                    value={selectedHud.trigger}
                    onChange={(event) =>
                      updateHudEvent(selectedHud.id, {
                        trigger: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>On-screen text</span>
                  <textarea
                    value={selectedHud.text}
                    onChange={(event) =>
                      updateHudEvent(selectedHud.id, {
                        text: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="stage-field">
                  <span>Event thread ID</span>
                  <input
                    list={`event-thread-options-${scene.id}`}
                    placeholder={eventThreadIdSuggestion(selectedHud.text)}
                    value={selectedHud.eventThreadId || ""}
                    onChange={(event) =>
                      updateHudEvent(selectedHud.id, {
                        eventThreadId: event.target.value
                          .toUpperCase()
                          .replace(/[\s-]+/g, "_")
                          .replace(/[^A-Z0-9_]/g, ""),
                      })
                    }
                  />
                  <small>
                    Reuse this ID on beats or HUD events in other scenes.
                  </small>
                </label>
                {selectedHud.eventThreadId && (
                  <>
                    <label className="stage-field">
                      <span>Thread role</span>
                      <select
                        value={selectedHud.eventThreadRole || "reference"}
                        onChange={(event) =>
                          updateHudEvent(selectedHud.id, {
                            eventThreadRole: event.target
                              .value as EventThreadRole,
                          })
                        }
                      >
                        {Object.entries(eventThreadRoleLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="stage-field">
                      <span>Continuity note</span>
                      <input
                        placeholder="What does this recall or change?"
                        value={selectedHud.eventThreadNote || ""}
                        onChange={(event) =>
                          updateHudEvent(selectedHud.id, {
                            eventThreadNote: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="hud-response-builder">
                <div className="sentence-block-head">
                  <span className="sentence-kicker">Player responses</span>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      const responses = selectedHud.responses || [];
                      const index = responses.length + 1;
                      updateHudEvent(selectedHud.id, {
                        responses: [
                          ...responses,
                          {
                            id: `${selectedHud.id}_RESPONSE_${index}`,
                            label: "New response",
                            outcome: "Describe what this response changes.",
                            setFlag: "",
                          },
                        ],
                      });
                    }}
                  >
                    <Plus size={13} />
                    Add response
                  </button>
                </div>
                {(selectedHud.responses || []).length === 0 ? (
                  <p className="hud-response-empty">
                    Leave empty for informational HUD. Add responses when the
                    Lens asks the player to decide.
                  </p>
                ) : (
                  <div className="hud-response-list">
                    {(selectedHud.responses || []).map((response, index) => (
                      <div className="hud-response-row" key={response.id}>
                        <span>{index + 1}</span>
                        <input
                          aria-label={`HUD response ${index + 1} label`}
                          value={response.label}
                          onChange={(event) =>
                            updateHudResponse(
                              selectedHud.id,
                              response.id,
                              { label: event.target.value },
                            )
                          }
                        />
                        <input
                          aria-label={`HUD response ${index + 1} outcome`}
                          placeholder="Outcome"
                          value={response.outcome}
                          onChange={(event) =>
                            updateHudResponse(
                              selectedHud.id,
                              response.id,
                              { outcome: event.target.value },
                            )
                          }
                        />
                        <input
                          aria-label={`HUD response ${index + 1} flag`}
                          placeholder="Optional flag"
                          value={response.setFlag}
                          onChange={(event) =>
                            updateHudResponse(selectedHud.id, response.id, {
                              setFlag: event.target.value
                                .toUpperCase()
                                .replace(/[\s-]+/g, "_")
                                .replace(/[^A-Z0-9_]/g, ""),
                            })
                          }
                        />
                        <button
                          className="icon-button danger-hover"
                          type="button"
                          aria-label={`Remove HUD response ${index + 1}`}
                          onClick={() =>
                            onRequestConfirmation({
                              title: `Delete “${response.label}”?`,
                              description:
                                "This removes the HUD response, its outcome, and its state flag.",
                              confirmLabel: "Delete response",
                              onConfirm: () =>
                                updateHudEvent(selectedHud.id, {
                                  responses: (
                                    selectedHud.responses || []
                                  ).filter(
                                    (candidate) =>
                                      candidate.id !== response.id,
                                  ),
                                }),
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {renderBackRefs(selectedHud.id)}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
