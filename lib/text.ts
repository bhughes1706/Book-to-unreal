/** Trim to `length` characters, appending an ellipsis when it was longer. */
export function truncate(value: string, length: number) {
  const trimmed = value.trim();
  return trimmed.length > length ? `${trimmed.slice(0, length)}…` : trimmed;
}
