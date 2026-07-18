"use client";

import { useEffect, useState } from "react";

const ID_PATTERN = /^[A-Z][A-Z0-9_]*$/;

function normalizeId(value: string) {
  return value
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_{2,}/g, "_");
}

export function IdField({
  value,
  label,
  ariaLabel,
  reservedIds,
  onCommit,
  className = "",
}: {
  value: string;
  label: string;
  ariaLabel: string;
  reservedIds: string[];
  onCommit: (id: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(value);
    setError("");
  }, [value]);

  const commit = () => {
    const nextValue = draft.trim();
    if (!ID_PATTERN.test(nextValue)) {
      setError("Start with A–Z; use only letters, numbers, and underscores.");
      return;
    }
    if (reservedIds.includes(nextValue)) {
      setError("That ID is already used in this scene.");
      return;
    }
    setError("");
    if (nextValue !== value) onCommit(nextValue);
  };

  return (
    <label className={`id-field ${className}`.trim()}>
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onBlur={commit}
        onChange={(event) => {
          setDraft(normalizeId(event.target.value));
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      <small className={error ? "id-field-error" : ""}>
        {error || "Referenced by beats and included in exports."}
      </small>
    </label>
  );
}
