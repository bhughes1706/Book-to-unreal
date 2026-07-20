import YAML from "yaml";

import type {
  LayoutCameraMode,
  LayoutEnvironmentPiece,
  LayoutPlacement,
  LayoutPlacementKind,
  LayoutStatus,
  SceneLayoutDraft,
} from "./editor-types";

export interface ImportedLayout {
  chapterId: string;
  sceneId: string;
  layout: SceneLayoutDraft;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function records(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function point(value: unknown) {
  const parts = Array.isArray(value) ? value : [];
  return {
    xM: number(parts[0]),
    yM: number(parts[1]),
    zM: number(parts[2]),
  };
}

function layoutStatus(value: unknown): LayoutStatus {
  if (value === "layout_approved") return "layout_approved";
  if (
    value === "needs_review" ||
    value === "needs_author_review" ||
    value === "approved_concept_pending_graybox" ||
    value === "graybox_in_progress"
  ) {
    return "needs_review";
  }
  return "draft";
}

function cameraMode(value: unknown): LayoutCameraMode {
  if (value === "orthographic" || value === "fixed_cinematic") return value;
  return "side_view_perspective";
}

function placementKind(value: unknown): LayoutPlacementKind {
  const allowed: LayoutPlacementKind[] = [
    "player_start",
    "npc",
    "interactable",
    "item",
    "transition",
    "camera",
    "audio",
    "custom",
  ];
  return allowed.includes(value as LayoutPlacementKind)
    ? (value as LayoutPlacementKind)
    : value === "actor_spawn"
      ? "npc"
      : value === "trigger"
        ? "interactable"
        : "custom";
}

function parseGenericPlacement(
  raw: Record<string, unknown>,
  index: number,
): LayoutPlacement {
  const location = point(raw.location_m);
  const bounds = record(raw.bounds_m);
  return {
    id: text(raw.id, `PLACEMENT_${index + 1}`),
    sourceId: text(raw.source_id),
    label: text(raw.label, text(raw.source_id, `Placement ${index + 1}`)),
    kind: placementKind(raw.kind),
    beatId: text(raw.beat_id),
    ...location,
    radiusM: number(raw.radius_m, 1),
    widthM: number(bounds.width, 1),
    heightM: number(bounds.height, 1),
    assetId: text(raw.asset_id),
    notes: text(raw.notes),
    ...(raw.orphaned === true ? { orphaned: true } : {}),
  };
}

function parseGenericPiece(
  raw: Record<string, unknown>,
  index: number,
): LayoutEnvironmentPiece {
  const dimensions = record(raw.dimensions_m);
  const kind = text(raw.kind);
  return {
    id: text(raw.id, `GEO_${index + 1}`),
    label: text(raw.label, `Environment piece ${index + 1}`),
    kind: (
      ["floor", "wall", "backdrop", "prop", "volume"].includes(kind)
        ? kind
        : "prop"
    ) as LayoutEnvironmentPiece["kind"],
    assetId: text(raw.asset_id),
    ...point(raw.location_m),
    dimensions: {
      lengthM: number(dimensions.length, 1),
      widthM: number(dimensions.width, 1),
      heightM: number(dimensions.height, 1),
    },
    notes: text(raw.notes),
  };
}

function parseGeneric(doc: Record<string, unknown>): SceneLayoutDraft {
  const design = record(doc.design);
  const dimensions = record(design.dimensions_m);
  const camera = record(design.camera);
  const runtime = record(doc.runtime);
  const level = record(runtime.level);
  const environment = record(runtime.environment);
  const resources = record(runtime.resources);
  const sourceAuthoring = record(doc.source_authoring);
  const merge = record(doc.merge);
  return {
    status: layoutStatus(doc.status),
    upstreamAuthoringHash: text(sourceAuthoring.sha256),
    mergeMode: "import",
    sourceManifestPath: text(doc.source_manifest),
    levelName: text(level.name),
    outputPath: text(level.output_path),
    environmentKitIds: strings(level.environment_kit_ids),
    dimensions: {
      lengthM: number(dimensions.length, 40),
      widthM: number(dimensions.width, 12),
      heightM: number(dimensions.height, 10),
    },
    camera: {
      mode: cameraMode(camera.mode),
      horizontalTracking: boolean(camera.horizontal_tracking, true),
      verticalTracking: boolean(camera.vertical_tracking),
      perspectiveFovDegrees: number(camera.perspective_fov_degrees, 24),
      orthographicWidthM: number(camera.orthographic_width_m, 26),
      framingNotes: text(camera.framing_notes),
    },
    placements: records(resources.placements).map(parseGenericPlacement),
    environmentPieces: records(environment.pieces).map(parseGenericPiece),
    paths: records(resources.paths).map((path, index) => ({
      id: text(path.id, `PATH_${index + 1}`),
      sourceId: text(path.source_id),
      beatId: text(path.beat_id),
      speedMps: number(path.speed_mps, 1),
      points: Array.isArray(path.points_m) ? path.points_m.map(point) : [],
      notes: text(path.notes),
    })),
    grayboxAssets: strings(doc.graybox_assets),
    artReplacementAssets: strings(doc.art_replacement_assets),
    acceptanceTests: strings(doc.acceptance_tests),
    mergeConflicts: strings(merge.unresolved),
    notes: text(doc.notes),
  };
}

function parseLegacy(doc: Record<string, unknown>): SceneLayoutDraft {
  const runtime = record(doc.runtime);
  const level = record(runtime.level);
  const camera = record(runtime.camera);
  const environment = record(runtime.environment);
  const resources = record(runtime.resources);
  const geometryEntries = Object.entries(environment).filter(
    ([, value]) =>
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("length_m" in (value as Record<string, unknown>) ||
        "placeholder_asset_id" in (value as Record<string, unknown>)),
  );
  const environmentPieces = geometryEntries.map(([key, value], index) => {
    const geometry = record(value);
    const height = number(geometry.height_m, 1);
    return {
      id: text(geometry.resource_id, `GEO_${index + 1}`),
      label: key.replace(/_/g, " "),
      kind: (height <= 0.5 ? "floor" : "wall") as "floor" | "wall",
      assetId: text(geometry.placeholder_asset_id),
      xM: number(geometry.length_m, 1) / 2,
      yM: 0,
      zM: height <= 0.5 ? -height / 2 : height / 2,
      dimensions: {
        lengthM: number(geometry.length_m, 1),
        widthM: number(geometry.width_m, 1),
        heightM: height,
      },
      notes: "",
    };
  });
  const lengthM = Math.max(
    40,
    ...environmentPieces.map((piece) => piece.dimensions.lengthM),
  );
  const widthM = Math.max(
    number(environment.gameplay_lane_width_m, 12),
    ...environmentPieces.map((piece) => piece.dimensions.widthM),
  );
  const heightM = Math.max(
    10,
    ...environmentPieces.map((piece) => piece.dimensions.heightM),
  );
  const actors = records(resources.actors);
  const actorByMarker = new Map(
    actors.map((actor) => [text(actor.spawn_marker_id), actor]),
  );
  const placements = records(resources.markers).map((marker, index) => {
    const actor = actorByMarker.get(text(marker.id));
    return {
      id: text(marker.id, `MARKER_${index + 1}`),
      sourceId: actor ? text(actor.id) : "",
      label: actor
        ? text(actor.id).replace(/_/g, " ")
        : text(marker.id, `Marker ${index + 1}`).replace(/_/g, " "),
      kind: actor ? ("npc" as const) : placementKind(marker.kind),
      beatId: "",
      ...point(marker.location_m),
      radiusM: number(marker.radius_m, 1),
      widthM: actor ? 0.8 : 1,
      heightM: actor ? 1.8 : 1,
      assetId: actor ? text(actor.placeholder_asset_id) : "",
      notes: "",
    };
  });
  return {
    status: layoutStatus(doc.status),
    upstreamAuthoringHash: "",
    mergeMode: "import",
    sourceManifestPath: text(doc.source_manifest),
    levelName: text(level.name),
    outputPath: text(level.output_path),
    environmentKitIds: strings(level.environment_kit_ids),
    dimensions: { lengthM, widthM, heightM },
    camera: {
      mode: cameraMode(camera.mode),
      horizontalTracking: boolean(camera.horizontal_tracking, true),
      verticalTracking: boolean(camera.vertical_tracking),
      perspectiveFovDegrees: number(camera.perspective_fov_degrees, 24),
      orthographicWidthM: number(camera.orthographic_width_m, 26),
      framingNotes: text(record(doc.design).camera_note),
    },
    placements,
    environmentPieces,
    paths: records(resources.paths).map((path, index) => ({
      id: text(path.id, `PATH_${index + 1}`),
      sourceId: "",
      beatId: "",
      speedMps: 1,
      points: Array.isArray(path.points_m) ? path.points_m.map(point) : [],
      notes: "",
    })),
    grayboxAssets: strings(doc.first_graybox_assets),
    artReplacementAssets: strings(doc.art_replacement_assets),
    acceptanceTests: strings(doc.acceptance_tests),
    mergeConflicts: [
      "Legacy runtime scene imported without an authoring hash; synchronize it after reviewing story bindings.",
    ],
    notes: "",
  };
}

export function parseLayoutManifest(source: string): ImportedLayout {
  let parsed: unknown;
  try {
    parsed = YAML.parse(source);
  } catch (error) {
    throw new Error(
      `not valid YAML (${error instanceof Error ? error.message.split("\n")[0] : "parse error"})`,
    );
  }
  const doc = record(parsed);
  if (doc.kind !== "scene_manifest") {
    throw new Error('not a scene manifest (expected kind: "scene_manifest")');
  }
  const sceneId = text(doc.scene_id);
  if (!sceneId) throw new Error("missing scene_id");
  return {
    chapterId: text(doc.chapter_id, sceneId.split("_S")[0] || "CH00"),
    sceneId,
    layout:
      text(doc.schema_version).startsWith("0.3") || doc.source_authoring
        ? parseGeneric(doc)
        : parseLegacy(doc),
  };
}
