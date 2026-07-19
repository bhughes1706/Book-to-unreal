"use client";

import { Bell, GitBranch, ListTree } from "lucide-react";

import type { StagingSelection } from "@/components/staging-editor";
import type { ChapterDraft } from "@/lib/editor-types";
import { eventThreadRoleLabels } from "@/lib/staging-model";
import { buildStoryEventThreads } from "@/lib/story-events";

export function EventThreadView({
  chapter,
  onOpenOccurrence,
}: {
  chapter: ChapterDraft;
  onOpenOccurrence: (
    sceneId: string,
    selection: StagingSelection,
  ) => void;
}) {
  const threads = buildStoryEventThreads(chapter);

  return (
    <section className="editor-section event-thread-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Chapter continuity</div>
          <h2>Follow setups, callbacks, choices, and consequences across scenes.</h2>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="empty-state">
          <GitBranch size={26} />
          <h3>No event threads yet</h3>
          <p>
            Open a beat or HUD event in Staging and assign an Event thread ID.
            Reuse that ID in later scenes to build its chapter timeline.
          </p>
        </div>
      ) : (
        <div className="event-thread-stack">
          {threads.map((thread) => (
            <article className="event-thread-card" key={thread.id}>
              <header>
                <span className="event-thread-icon">
                  <GitBranch size={16} />
                </span>
                <span>
                  <strong>{thread.label}</strong>
                  <small>{thread.id}</small>
                </span>
                <b>
                  {thread.occurrences.length} occurrence
                  {thread.occurrences.length === 1 ? "" : "s"}
                </b>
              </header>
              <div className="event-thread-timeline">
                {thread.occurrences.map((occurrence, index) => {
                  const Icon = occurrence.kind === "hud" ? Bell : ListTree;
                  return (
                    <button
                      key={`${occurrence.sceneId}-${occurrence.resourceId}`}
                      type="button"
                      onClick={() =>
                        onOpenOccurrence(occurrence.sceneId, {
                          kind: occurrence.kind,
                          id: occurrence.resourceId,
                        })
                      }
                    >
                      <span className="event-thread-node">
                        <Icon size={13} />
                      </span>
                      <span className="event-thread-scene">
                        <small>
                          Scene {String(occurrence.sceneOrder).padStart(2, "0")} ·{" "}
                          {eventThreadRoleLabels[occurrence.role]}
                        </small>
                        <strong>{occurrence.sceneTitle}</strong>
                      </span>
                      <span className="event-thread-detail">
                        <strong>{occurrence.label}</strong>
                        <small>{occurrence.detail}</small>
                      </span>
                      <span className="event-thread-order">
                        {index + 1}/{thread.occurrences.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
