"use client";

import {
  ArrowUpRight,
  Download,
  Gamepad2,
  GitBranch,
  MessageSquareQuote,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import type { ConfirmationRequest } from "@/components/confirmation-dialog";
import { IdField } from "@/components/id-field";
import { ReviewPill } from "@/components/review-pill";
import type {
  ChoiceOption,
  DialogueUnit,
  EffectScope,
  EngineTarget,
  StoryChange,
} from "@/lib/editor-types";
import { dialogueIdSuggestion } from "@/lib/id-builder";
import { truncate } from "@/lib/text";

export type OutputMode = "authoring_yaml" | "layout_yaml" | "json";

const effectScopes: { value: EffectScope; label: string }[] = [
  { value: "relationship", label: "Relationship" },
  { value: "self_definition", label: "Self-definition" },
  { value: "public_perception", label: "Public perception" },
  { value: "resources", label: "Resources" },
  { value: "scene_variation", label: "Scene variation" },
  { value: "later_access", label: "Later access" },
];

export function DialogueTab({
  dialogue,
  reservedIds,
  onAddBlank,
  onGoToSource,
  onUpdateDialogue,
  onRenameDialogueId,
  onAttachChoice,
  onUpdateChoiceOption,
  onAddChoiceOption,
  onToggleScope,
  onRequestConfirmation,
  onDeleteDialogue,
}: {
  dialogue: DialogueUnit[];
  reservedIds: string[];
  onAddBlank: () => void;
  onGoToSource: () => void;
  onUpdateDialogue: (
    id: string,
    updater: (dialogue: DialogueUnit) => DialogueUnit,
  ) => void;
  onRenameDialogueId: (id: string, nextId: string) => void;
  onAttachChoice: (id: string) => void;
  onUpdateChoiceOption: (
    id: string,
    optionId: string,
    updates: Partial<ChoiceOption>,
  ) => void;
  onAddChoiceOption: (id: string) => void;
  onToggleScope: (id: string, option: ChoiceOption, scope: EffectScope) => void;
  onRequestConfirmation: (request: ConfirmationRequest) => void;
  onDeleteDialogue: (id: string) => void;
}) {
  return (
    <section className="editor-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Dialogue map</div>
          <h2>Approve the line, then define what a choice changes.</h2>
        </div>
        <button className="button button-secondary" onClick={onAddBlank}>
          <Plus size={16} />
          Propose line
        </button>
      </div>

      {dialogue.length === 0 ? (
        <div className="empty-state">
          <MessageSquareQuote size={26} />
          <h3>No dialogue selected yet</h3>
          <p>
            Select exact text in Source, or add a proposed line that is
            explicitly separate from canon.
          </p>
          <button className="button button-primary" onClick={onGoToSource}>
            Go to source
          </button>
        </div>
      ) : (
        <div className="dialogue-stack">
          {dialogue.map((unit, dialogueIndex) => (
            <article
              className="dialogue-card"
              id={`entity-${unit.id}`}
              key={unit.id}
            >
              <div className="dialogue-card-head">
                <span className="dialogue-index">
                  D{String(dialogueIndex + 1).padStart(2, "0")}
                </span>
                <span
                  className={`source-chip ${
                    unit.sourceLocked ? "is-canon" : "is-proposed"
                  }`}
                >
                  {unit.sourceLocked ? "Source locked" : "Proposed line"}
                </span>
                <ReviewPill
                  value={unit.status}
                  onChange={(status) =>
                    onUpdateDialogue(unit.id, (item) => ({
                      ...item,
                      status,
                    }))
                  }
                />
                <button
                  className="icon-button danger-hover"
                  aria-label="Remove dialogue line"
                  onClick={() =>
                    onRequestConfirmation({
                      title: `Delete ${unit.speaker || "this"} line?`,
                      description: `This removes “${truncate(unit.text, 90)}” and may leave beat references that need review.`,
                      confirmLabel: "Delete dialogue",
                      onConfirm: () => onDeleteDialogue(unit.id),
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
                  value={unit.id}
                  suggestedId={dialogueIdSuggestion(unit.speaker, unit.text)}
                  suggestionReason="Character dialogue begins with the speaker name, then DIALOGUE, then a short line cadence."
                  reservedIds={reservedIds.filter((id) => id !== unit.id)}
                  onCommit={(nextId) => onRenameDialogueId(unit.id, nextId)}
                />
                <label>
                  <span>Speaker</span>
                  <input
                    value={unit.speaker}
                    onChange={(event) =>
                      onUpdateDialogue(unit.id, (item) => ({
                        ...item,
                        speaker: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="dialogue-line-field">
                  <span>Line</span>
                  <textarea
                    value={unit.text}
                    onChange={(event) =>
                      onUpdateDialogue(unit.id, (item) => ({
                        ...item,
                        text: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              {!unit.playerChoice ? (
                <button
                  className="choice-add"
                  onClick={() => onAttachChoice(unit.id)}
                >
                  <span>
                    <GitBranch size={17} />
                  </span>
                  <span>
                    <strong>Add a player choice</strong>
                    <small>
                      Every option must write relationship, identity, or scene
                      state.
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
                        value={unit.playerChoice.prompt}
                        onChange={(event) =>
                          onUpdateDialogue(unit.id, (item) => ({
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
                      value={unit.playerChoice.status}
                      onChange={(status) =>
                        onUpdateDialogue(unit.id, (item) => ({
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
                      value={unit.playerChoice.canonicalBounds}
                      onChange={(event) =>
                        onUpdateDialogue(unit.id, (item) => ({
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
                    {unit.playerChoice.options.map((option, optionIndex) => (
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
                              onUpdateChoiceOption(unit.id, option.id, {
                                label: event.target.value,
                              })
                            }
                          />
                          <textarea
                            aria-label={`Choice ${optionIndex + 1} effect`}
                            value={option.effect}
                            onChange={(event) =>
                              onUpdateChoiceOption(unit.id, option.id, {
                                effect: event.target.value,
                              })
                            }
                          />
                          <div className="scope-row">
                            {effectScopes.map((scope) => (
                              <button
                                key={scope.value}
                                className={
                                  option.effectScopes.includes(scope.value)
                                    ? "is-selected"
                                    : ""
                                }
                                onClick={() =>
                                  onToggleScope(unit.id, option, scope.value)
                                }
                              >
                                {scope.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {unit.playerChoice &&
                          unit.playerChoice.options.length > 2 && (
                            <button
                              className="icon-button danger-hover"
                              aria-label="Remove choice option"
                              onClick={() =>
                                onRequestConfirmation({
                                  title: `Delete “${option.label}”?`,
                                  description:
                                    "This removes the response and its recorded consequence from the player choice.",
                                  confirmLabel: "Delete response",
                                  onConfirm: () =>
                                    onUpdateDialogue(unit.id, (item) => ({
                                      ...item,
                                      playerChoice: item.playerChoice
                                        ? {
                                            ...item.playerChoice,
                                            options:
                                              item.playerChoice.options.filter(
                                                (candidate) =>
                                                  candidate.id !== option.id,
                                              ),
                                          }
                                        : undefined,
                                    })),
                                })
                              }
                            >
                              <X size={14} />
                            </button>
                          )}
                      </article>
                    ))}
                  </div>
                  <div className="choice-builder-footer">
                    <button
                      className="button button-quiet"
                      onClick={() => onAddChoiceOption(unit.id)}
                    >
                      <Plus size={15} />
                      Add response
                    </button>
                    <button
                      className="text-button danger-text"
                      onClick={() =>
                        onRequestConfirmation({
                          title: "Remove this player choice?",
                          description:
                            "This deletes every response, consequence, and canonical-bound note attached to the dialogue line.",
                          confirmLabel: "Remove choice",
                          onConfirm: () =>
                            onUpdateDialogue(unit.id, (item) => ({
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
  );
}

export function ChangesTab({
  storyChanges,
  onAdd,
  onUpdate,
}: {
  storyChanges: StoryChange[];
  onAdd: () => void;
  onUpdate: (id: string, updater: (change: StoryChange) => StoryChange) => void;
}) {
  return (
    <section className="editor-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Adaptation ledger</div>
          <h2>Nothing changes from the source without a decision.</h2>
        </div>
        <button className="button button-secondary" onClick={onAdd}>
          <Plus size={16} />
          Propose change
        </button>
      </div>
      {storyChanges.length === 0 ? (
        <div className="empty-state compact">
          <GitBranch size={25} />
          <h3>No changes from source</h3>
          <p>
            This scene currently preserves source order, staging, character
            presence, motivation, and outcome.
          </p>
        </div>
      ) : (
        <div className="change-stack">
          {storyChanges.map((change) => (
            <article className="change-card" key={change.id}>
              <div className="change-card-head">
                <span className="change-type">{change.type}</span>
                <ReviewPill
                  value={change.status}
                  onChange={(status) =>
                    onUpdate(change.id, (item) => ({ ...item, status }))
                  }
                />
              </div>
              <div className="change-compare">
                <label>
                  <span>Source canon</span>
                  <textarea
                    value={change.canonical}
                    onChange={(event) =>
                      onUpdate(change.id, (item) => ({
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
                      onUpdate(change.id, (item) => ({
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
                    onUpdate(change.id, (item) => ({
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
  );
}

export function OutputTab({
  outputMode,
  onOutputModeChange,
  output,
  targetEngine,
  engineLabel,
  onTargetEngineChange,
  onDownload,
}: {
  outputMode: OutputMode;
  onOutputModeChange: (mode: OutputMode) => void;
  output: string;
  targetEngine: EngineTarget;
  engineLabel: string;
  onTargetEngineChange: (engine: EngineTarget) => void;
  onDownload: () => void;
}) {
  return (
    <section className="editor-section output-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Portable scene data</div>
          <h2>Review the authoring contract before export.</h2>
        </div>
        <div className="output-actions">
          <div className="segmented-control">
            <button
              className={outputMode === "authoring_yaml" ? "is-active" : ""}
              onClick={() => onOutputModeChange("authoring_yaml")}
            >
              Story YAML
            </button>
            <button
              className={outputMode === "layout_yaml" ? "is-active" : ""}
              onClick={() => onOutputModeChange("layout_yaml")}
            >
              Layout YAML
            </button>
            <button
              className={outputMode === "json" ? "is-active" : ""}
              onClick={() => onOutputModeChange("json")}
            >
              Authoring JSON
            </button>
          </div>
          <label
            className="engine-select"
            title="Engine the compiler targets for units, axes, and naming. Recorded in the Layout YAML's design.engine."
          >
            <Gamepad2 size={15} />
            <span>Engine</span>
            <select
              value={targetEngine}
              onChange={(event) =>
                onTargetEngineChange(event.target.value as EngineTarget)
              }
            >
              <option value="unreal">Unreal (cm, Z-up)</option>
              <option value="godot">Godot (m, Y-up)</option>
              <option value="unity">Unity (m, Y-up)</option>
            </select>
          </label>
          <button className="button button-secondary" onClick={onDownload}>
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
        Story YAML owns narrative intent; Layout YAML owns reviewed dimensions,
        coordinates, paths, cameras, and placeholder assets. The engine target is
        recorded in the Layout YAML so <code>novel-manifest compile</code> emits{" "}
        {engineLabel}-native units and axes. This editor previews and exports
        data; it does not compile engine content.
      </div>
    </section>
  );
}
