"use client";

import {
  AlertTriangle,
  Bell,
  ListTree,
  MessageSquareQuote,
  MousePointerClick,
  Package,
  Pencil,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CatalogEntry, ResourceKind } from "@/lib/staging-model";
import { resolveEntry } from "@/lib/staging-model";

export const kindIcons: Record<
  ResourceKind,
  typeof Users
> = {
  npc: Users,
  item: Package,
  interactable: MousePointerClick,
  hud: Bell,
  dialogue: MessageSquareQuote,
  beat: ListTree,
};

export function ResourceRef({
  value,
  onChange,
  catalog,
  expectKind,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  catalog: CatalogEntry[];
  /** Kind the target must resolve to; null/undefined allows freeform text. */
  expectKind?: ResourceKind | null;
  placeholder: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const entry = resolveEntry(catalog, value);
  const needle = draft.trim().toLowerCase();
  const suggestions = catalog
    .filter((candidate) => (expectKind ? candidate.kind === expectKind : true))
    .filter(
      (candidate) =>
        !needle ||
        candidate.id.toLowerCase().includes(needle) ||
        candidate.label.toLowerCase().includes(needle),
    )
    .slice(0, 7);

  const commit = (next: string) => {
    setEditing(false);
    if (next !== value) onChange(next);
  };

  const beginEdit = () => {
    setDraft(value);
    setHighlight(0);
    setEditing(true);
  };

  if (!editing) {
    if (entry) {
      const Icon = kindIcons[entry.kind];
      const mismatch = expectKind ? entry.kind !== expectKind : false;
      return (
        <button
          type="button"
          className={`ref-chip ref-${entry.kind} ${mismatch ? "ref-invalid" : ""}`}
          aria-label={`${ariaLabel}: ${entry.label}`}
          title={entry.id}
          onClick={beginEdit}
        >
          <Icon size={12} />
          <span>{entry.label}</span>
          {mismatch && <AlertTriangle size={12} />}
        </button>
      );
    }
    if (value) {
      const strict = Boolean(expectKind);
      return (
        <button
          type="button"
          className={`ref-chip ref-freeform ${strict ? "ref-invalid" : ""}`}
          aria-label={`${ariaLabel}: ${value}`}
          title={
            strict ? "This ID does not exist in the scene" : "Freeform target"
          }
          onClick={beginEdit}
        >
          {strict ? <AlertTriangle size={12} /> : <Pencil size={11} />}
          <span>{value}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        className="ref-chip ref-empty"
        aria-label={`${ariaLabel}: not set`}
        onClick={beginEdit}
      >
        <span>{placeholder}</span>
      </button>
    );
  }

  return (
    <span className="ref-edit">
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setHighlight(0);
        }}
        onBlur={() => commit(draft.trim())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((current) =>
              Math.min(current + 1, suggestions.length - 1),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const picked = suggestions[highlight];
            commit(picked ? picked.id : draft.trim());
          } else if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
      />
      {suggestions.length > 0 && (
        <span className="ref-pop" role="listbox">
          {suggestions.map((candidate, index) => {
            const Icon = kindIcons[candidate.kind];
            return (
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={index === highlight ? "is-highlighted" : ""}
                key={candidate.id}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(candidate.id);
                }}
              >
                <Icon size={12} />
                <strong>{candidate.label}</strong>
                <small>{candidate.id}</small>
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
