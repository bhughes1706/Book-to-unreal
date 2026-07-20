import YAML from "yaml";

import type {
  LayoutEnvironmentPiece,
  LayoutPlacement,
  LayoutPoint,
  SceneDraft,
  SceneLayoutDraft,
} from "./editor-types";
import { toAuthoringDocument } from "./scene-export";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export async function authoringSha256(scene: SceneDraft) {
  const encoded = new TextEncoder().encode(
    JSON.stringify(canonicalize(toAuthoringDocument(scene))),
  );
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sceneSlug(sceneId: string) {
  return sceneId
    .replace(/^CH(\d+)_S(\d+)_?/, "CH$1_S$2_")
    .replace(/[^A-Z0-9_]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/_$/g, "");
}

function defaultDimensions(scene: SceneDraft) {
  return scene.presentationMode === "scrolling_hd2d"
    ? { lengthM: 100, widthM: 12, heightM: 16 }
    : { lengthM: 24, widthM: 18, heightM: 8 };
}

function defaultPlacement(
  id: string,
  sourceId: string,
  label: string,
  kind: LayoutPlacement["kind"],
  index: number,
  total: number,
  lengthM: number,
  beatId = "",
): LayoutPlacement {
  const spacing = lengthM / Math.max(total + 1, 2);
  return {
    id,
    sourceId,
    label,
    kind,
    beatId,
    xM: Number((spacing * (index + 1)).toFixed(2)),
    yM: 0,
    zM: 0,
    radiusM: kind === "transition" ? 2 : 1,
    widthM: kind === "npc" ? 0.8 : 1.2,
    heightM: kind === "npc" ? 1.8 : 1.2,
    assetId: "",
    notes: "",
  };
}

function sourcePlacements(scene: SceneDraft, lengthM: number) {
  const resources = [
    ...scene.npcs.map((npc) => ({
      id: npc.id,
      label: npc.displayName,
      kind: "npc" as const,
      beatId: npc.entranceBeatId,
    })),
    ...scene.interactables.map((interactable) => ({
      id: interactable.id,
      label: interactable.name,
      kind:
        interactable.kind === "transition"
          ? ("transition" as const)
          : ("interactable" as const),
      beatId:
        scene.beats.find(
          (beat) =>
            beat.triggerType === "interaction" &&
            beat.triggerTarget === interactable.id,
        )?.id || "",
    })),
    ...scene.items
      .filter((item) => item.initialState === "visible")
      .map((item) => ({
        id: item.id,
        label: item.name,
        kind: "item" as const,
        beatId:
          scene.beats.find((beat) =>
            beat.actions.some(
              (action) =>
                (action.type === "give_item" ||
                  action.type === "update_item") &&
                action.targetId === item.id,
            ),
          )?.id || "",
      })),
  ];
  return resources.map((resource, index) =>
    defaultPlacement(
      `PLACEMENT_${resource.id}`,
      resource.id,
      resource.label,
      resource.kind,
      index,
      resources.length,
      lengthM,
      resource.beatId,
    ),
  );
}

export function createStarterLayout(
  scene: SceneDraft,
  upstreamAuthoringHash: string,
): SceneLayoutDraft {
  const dimensions = defaultDimensions(scene);
  const sceneName = sceneSlug(scene.id);
  const floor: LayoutEnvironmentPiece = {
    id: "GEO_PLAYABLE_FLOOR",
    label: "Playable floor",
    kind: "floor",
    assetId: "SM_PLACEHOLDER_FLOOR",
    xM: dimensions.lengthM / 2,
    yM: 0,
    zM: -0.1,
    dimensions: {
      lengthM: dimensions.lengthM,
      widthM: dimensions.widthM,
      heightM: 0.2,
    },
    notes: "Starter graybox floor; refine in Layout.",
  };
  return {
    status: "draft",
    upstreamAuthoringHash,
    mergeMode: "create",
    sourceManifestPath: `../${scene.id.split("_S")[0]}.manifest.yaml`,
    levelName: `L_${sceneName}`,
    outputPath: `/Game/Chapters/${scene.id.split("_S")[0]}/Scenes/${sceneName}`,
    environmentKitIds: [],
    dimensions,
    camera: {
      mode:
        scene.presentationMode === "static_cinematic"
          ? "fixed_cinematic"
          : "side_view_perspective",
      horizontalTracking: scene.presentationMode === "scrolling_hd2d",
      verticalTracking: false,
      perspectiveFovDegrees: 24,
      orthographicWidthM: 26,
      framingNotes: "",
    },
    placements: [
      defaultPlacement(
        "MARKER_PLAYER_START",
        "PLAYER_GRAYSON",
        "Grayson start",
        "player_start",
        0,
        10,
        dimensions.lengthM,
      ),
      ...sourcePlacements(scene, dimensions.lengthM),
    ],
    environmentPieces: [floor],
    paths: [],
    grayboxAssets: [
      "Player capsule or placeholder sprite",
      "Camera rig",
      "Trigger volumes",
    ],
    artReplacementAssets: [],
    acceptanceTests: [
      "Every story resource with spatial presence has a reviewed placement.",
      "The player start and exits are inside the playable bounds.",
      "The scene remains readable at the approved gameplay camera.",
    ],
    mergeConflicts: [],
    notes: "",
  };
}

export function mergeLayoutFromAuthoring(
  scene: SceneDraft,
  upstreamAuthoringHash: string,
): SceneLayoutDraft {
  if (!scene.layout) return createStarterLayout(scene, upstreamAuthoringHash);

  const layout = scene.layout;
  const validSourceIds = new Set([
    "PLAYER_GRAYSON",
    ...scene.npcs.map((item) => item.id),
    ...scene.interactables.map((item) => item.id),
    ...scene.items.map((item) => item.id),
  ]);
  const validBeatIds = new Set(scene.beats.map((beat) => beat.id));
  const existingSourceIds = new Set(
    layout.placements.map((placement) => placement.sourceId),
  );
  const conflicts: string[] = [];
  const preserved = layout.placements.map((placement) => {
    const orphaned =
      placement.sourceId.length > 0 &&
      !validSourceIds.has(placement.sourceId) &&
      placement.kind !== "custom" &&
      placement.kind !== "camera" &&
      placement.kind !== "audio";
    if (orphaned) {
      conflicts.push(
        `${placement.label} references removed story resource ${placement.sourceId}.`,
      );
    }
    if (placement.beatId && !validBeatIds.has(placement.beatId)) {
      conflicts.push(
        `${placement.label} references removed beat ${placement.beatId}.`,
      );
    }
    return { ...placement, orphaned };
  });

  const defaults = sourcePlacements(scene, layout.dimensions.lengthM).filter(
    (placement) => !existingSourceIds.has(placement.sourceId),
  );
  defaults.forEach((placement) => {
    conflicts.push(`${placement.label} is new and needs spatial review.`);
  });
  layout.paths.forEach((path) => {
    if (path.sourceId && !validSourceIds.has(path.sourceId)) {
      conflicts.push(
        `${path.id} references removed story resource ${path.sourceId}.`,
      );
    }
    if (path.beatId && !validBeatIds.has(path.beatId)) {
      conflicts.push(`${path.id} references removed beat ${path.beatId}.`);
    }
  });

  return {
    ...layout,
    status: layout.status === "layout_approved" ? "needs_review" : layout.status,
    upstreamAuthoringHash,
    mergeMode: "merge",
    placements: [...preserved, ...defaults],
    mergeConflicts: [...new Set(conflicts)],
  };
}

function pointDocument(point: LayoutPoint) {
  return [point.xM, point.yM, point.zM];
}

export function toLayoutManifest(scene: SceneDraft, layout: SceneLayoutDraft) {
  const eventThreadIds = [
    ...scene.beats.map((beat) => beat.eventThreadId),
    ...scene.hudEvents.map((event) => event.eventThreadId),
  ].filter((value, index, all): value is string =>
    Boolean(value && all.indexOf(value) === index),
  );

  return {
    schema_version: "0.3.0",
    kind: "scene_manifest",
    chapter_id: scene.id.split("_S")[0],
    scene_id: scene.id,
    source_authoring: {
      path: `imports/${scene.id.split("_S")[0]}/${scene.id}.authoring.yaml`,
      sha256: layout.upstreamAuthoringHash,
    },
    source_manifest: layout.sourceManifestPath,
    status: layout.status,
    merge: {
      mode: layout.mergeMode,
      unresolved: layout.mergeConflicts,
    },
    design: {
      presentation_mode: scene.presentationMode,
      dimensions_m: {
        length: layout.dimensions.lengthM,
        width: layout.dimensions.widthM,
        height: layout.dimensions.heightM,
      },
      camera: {
        mode: layout.camera.mode,
        horizontal_tracking: layout.camera.horizontalTracking,
        vertical_tracking: layout.camera.verticalTracking,
        perspective_fov_degrees: layout.camera.perspectiveFovDegrees,
        orthographic_width_m: layout.camera.orthographicWidthM,
        framing_notes: layout.camera.framingNotes,
      },
    },
    graybox_assets: layout.grayboxAssets,
    art_replacement_assets: layout.artReplacementAssets,
    runtime: {
      level: {
        name: layout.levelName,
        output_path: layout.outputPath,
        environment_kit_ids: layout.environmentKitIds,
      },
      environment: {
        pieces: layout.environmentPieces.map((piece) => ({
          id: piece.id,
          label: piece.label,
          kind: piece.kind,
          asset_id: piece.assetId,
          location_m: pointDocument(piece),
          dimensions_m: {
            length: piece.dimensions.lengthM,
            width: piece.dimensions.widthM,
            height: piece.dimensions.heightM,
          },
          notes: piece.notes,
        })),
      },
      resources: {
        placements: layout.placements.map((placement) => ({
          id: placement.id,
          source_id: placement.sourceId,
          label: placement.label,
          kind: placement.kind,
          beat_id: placement.beatId,
          location_m: pointDocument(placement),
          radius_m: placement.radiusM,
          bounds_m: {
            width: placement.widthM,
            height: placement.heightM,
          },
          asset_id: placement.assetId,
          notes: placement.notes,
          ...(placement.orphaned ? { orphaned: true } : {}),
        })),
        paths: layout.paths.map((path) => ({
          id: path.id,
          source_id: path.sourceId,
          beat_id: path.beatId,
          speed_mps: path.speedMps,
          points_m: path.points.map(pointDocument),
          notes: path.notes,
        })),
      },
      story_bindings: {
        beat_ids: scene.beats.map((beat) => beat.id),
        dialogue_ids: scene.dialogue.map((line) => line.id),
        hud_ids: scene.hudEvents.map((event) => event.id),
        event_thread_ids: eventThreadIds,
      },
    },
    acceptance_tests: layout.acceptanceTests,
    notes: layout.notes,
  };
}

export function layoutToYaml(scene: SceneDraft, layout: SceneLayoutDraft) {
  return YAML.stringify(toLayoutManifest(scene, layout), { lineWidth: 96 });
}
