"use client";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Flag,
  MousePointerClick,
  Package,
  Users,
} from "lucide-react";

import type { SceneDraft } from "@/lib/editor-types";
import {
  actionSentence,
  buildCatalog,
  computeStageState,
  dismissLabels,
  hudChannelLabels,
  itemStateLabels,
  triggerSentence,
} from "@/lib/staging-model";
import type { StagingSelection } from "@/components/staging-editor";

export function StagePreview({
  scene,
  scrubIndex,
  onScrub,
  onSelect,
}: {
  scene: SceneDraft;
  scrubIndex: number;
  onScrub: (index: number) => void;
  onSelect: (selection: StagingSelection) => void;
}) {
  const beats = scene.beats;
  if (beats.length === 0) return null;

  const index = Math.min(scrubIndex, beats.length - 1);
  const beat = beats[index];
  const catalog = buildCatalog(scene);
  const state = computeStageState(scene, index);

  return (
    <section className="stage-preview" aria-label="Scene state preview">
      <div className="stage-preview-head">
        <div className="stage-preview-step">
          <button
            className="icon-button"
            aria-label="Previous beat"
            disabled={index === 0}
            onClick={() => onScrub(index - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="stage-preview-counter">
            <small>
              Beat {index + 1} of {beats.length}
            </small>
            <strong>{beat.title}</strong>
            <span>{triggerSentence(beat, catalog)}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Next beat"
            disabled={index === beats.length - 1}
            onClick={() => onScrub(index + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <ol className="stage-preview-script">
          {beat.actions.map((action) => (
            <li key={action.id}>
              <strong>{actionSentence(action.type, action.targetId, catalog)}</strong>
              {action.detail && <span>{action.detail}</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="stage-preview-groups">
        <div className="preview-group">
          <span className="preview-group-title">
            <Users size={12} />
            On stage
          </span>
          {state.npcs.length === 0 ? (
            <em>No one yet — the player is alone.</em>
          ) : (
            <div className="preview-chips">
              {state.npcs.map(({ npc, entering, leaving, conditional }) => (
                <button
                  key={npc.id}
                  type="button"
                  className={`preview-chip chip-npc ${
                    conditional ? "is-conditional" : ""
                  }`}
                  onClick={() => onSelect({ kind: "npc", id: npc.id })}
                >
                  {npc.displayName}
                  {entering && <b>enters</b>}
                  {leaving && <b className="is-exit">exits</b>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="preview-group">
          <span className="preview-group-title">
            <Bell size={12} />
            On screen
          </span>
          {state.huds.length === 0 ? (
            <em>Clean frame — no HUD or Lens text.</em>
          ) : (
            <div className="preview-hud-stack">
              {state.huds.map(({ event, sinceBeat }) => (
                <button
                  key={event.id}
                  type="button"
                  className={`preview-hud hud-${event.channel}`}
                  onClick={() => onSelect({ kind: "hud", id: event.id })}
                >
                  <span>{hudChannelLabels[event.channel]}</span>
                  <p>{event.text || "On-screen text"}</p>
                  <small>
                    {dismissLabels[event.dismissMode]}
                    {sinceBeat < index ? ` · since beat ${sinceBeat + 1}` : ""}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="preview-group">
          <span className="preview-group-title">
            <MousePointerClick size={12} />
            Environment
          </span>
          {state.interactables.length === 0 ? (
            <em>No environmental interaction on this beat.</em>
          ) : (
            <div className="preview-chips">
              {state.interactables.map(({ interactable }) => (
                <button
                  key={interactable.id}
                  type="button"
                  className="preview-chip chip-interactable"
                  onClick={() =>
                    onSelect({
                      kind: "interactable",
                      id: interactable.id,
                    })
                  }
                >
                  {interactable.name}
                  <b>{interactable.interactionPrompt || "interact"}</b>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="preview-group">
          <span className="preview-group-title">
            <Package size={12} />
            Inventory
          </span>
          {state.items.length === 0 ? (
            <em>No inventory items defined for this scene.</em>
          ) : (
            <div className="preview-chips">
              {state.items.map(({ item, state: itemState, changedAtBeat }) => (
                <button
                  key={item.id}
                  type="button"
                  className={`preview-chip chip-item state-${itemState}`}
                  onClick={() => onSelect({ kind: "item", id: item.id })}
                >
                  {item.name}
                  <b>{itemStateLabels[itemState].toLowerCase()}</b>
                  {changedAtBeat !== null && changedAtBeat === index && (
                    <b className="is-change">this beat</b>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {(state.flags.length > 0 || state.exits.length > 0) && (
          <div className="preview-group">
            <span className="preview-group-title">
              <Flag size={12} />
              State so far
            </span>
            <div className="preview-chips">
              {state.flags.map((flag, flagIndex) => (
                <span className="preview-chip chip-flag" key={`${flag}-${flagIndex}`}>
                  <Flag size={10} />
                  {flag}
                </span>
              ))}
              {state.exits.map((exit, exitIndex) => (
                <span className="preview-chip chip-flag" key={`${exit}-${exitIndex}`}>
                  <DoorOpen size={10} />
                  {exit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
