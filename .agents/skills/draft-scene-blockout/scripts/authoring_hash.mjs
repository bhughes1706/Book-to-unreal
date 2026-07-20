#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import YAML from "yaml";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

const path = process.argv[2];
if (!path) {
  console.error("Usage: authoring_hash.mjs <SCENE_ID>.authoring.yaml");
  process.exit(2);
}

try {
  const document = YAML.parse(await readFile(path, "utf8"));
  const canonical = JSON.stringify(canonicalize(document));
  console.log(createHash("sha256").update(canonical, "utf8").digest("hex"));
} catch (error) {
  console.error(`ERROR ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
