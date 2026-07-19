import type { HudChannel } from "./editor-types";

export function idSegment(value: string, maxLength = 40) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .toUpperCase()
    .slice(0, maxLength)
    .replace(/_+$/g, "");
}

function contentCadence(value: string) {
  const words = idSegment(value, 54)
    .split("_")
    .filter(Boolean)
    .filter(
      (word) =>
        ![
          "A",
          "AN",
          "AND",
          "ARE",
          "AS",
          "AT",
          "BE",
          "BUT",
          "BY",
          "FOR",
          "FROM",
          "I",
          "IN",
          "IS",
          "IT",
          "OF",
          "ON",
          "OR",
          "THE",
          "THIS",
          "TO",
          "WE",
          "WITH",
          "YOU",
        ].includes(word),
    );
  return words.slice(0, 5).join("_") || "UNTITLED";
}

export function dialogueIdSuggestion(speaker: string, line: string) {
  const actor = idSegment(speaker, 24) || "UNKNOWN";
  return `${actor}_DIALOGUE_${contentCadence(line)}`;
}

export function hudIdSuggestion(
  channel: HudChannel,
  text: string,
  actor = "Grayson",
) {
  const cadence = contentCadence(text);
  if (channel === "internal_observation") {
    return `${idSegment(actor, 24) || "GRAYSON"}_MONOLOGUE_${cadence}`;
  }
  return `LENS_${idSegment(channel, 24)}_${cadence}`;
}

export function itemIdSuggestion(name: string, owner = "Grayson") {
  return `${idSegment(owner, 24) || "GRAYSON"}_ITEM_${contentCadence(name)}`;
}

export function interactableIdSuggestion(name: string) {
  return `WORLD_INTERACT_${contentCadence(name)}`;
}

export function eventThreadIdSuggestion(label: string) {
  return `EVENT_${contentCadence(label)}`;
}
