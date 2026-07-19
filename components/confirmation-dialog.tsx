"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

export interface ConfirmationRequest {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmationDialog({
  request,
  onCancel,
}: {
  request: ConfirmationRequest | null;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, request]);

  if (!request) return null;

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <button
          className="icon-button confirm-close"
          type="button"
          aria-label="Close confirmation"
          onClick={onCancel}
        >
          <X size={16} />
        </button>
        <span className="confirm-icon">
          <AlertTriangle size={20} />
        </span>
        <div>
          <div className="eyebrow">Confirm deletion</div>
          <h2 id="confirm-dialog-title">{request.title}</h2>
          <p id="confirm-dialog-description">{request.description}</p>
        </div>
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              onCancel();
              request.onConfirm();
            }}
          >
            {request.confirmLabel}
          </button>
        </div>
        <small>You can undo this afterward with ⌘Z or Ctrl+Z.</small>
      </section>
    </div>
  );
}
