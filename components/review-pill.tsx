"use client";

import { ChevronDown } from "lucide-react";

import type { ReviewStatus } from "@/lib/editor-types";

export const reviewStatusLabel: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
  needs_discussion: "Discuss",
};

/**
 * Inline review-status dropdown. Clicks are kept from bubbling so the pill can
 * live inside a clickable row (staging list) without also selecting the row;
 * this is harmless where there is no such row (dialogue and change cards).
 */
export function ReviewPill({
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
