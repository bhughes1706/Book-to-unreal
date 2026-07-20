"use client";

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  GitMerge,
  Map,
  Move,
  Plus,
  RefreshCw,
  Route,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ConfirmationRequest } from "@/components/confirmation-dialog";
import type {
  LayoutEnvironmentPiece,
  LayoutPath,
  LayoutPlacement,
  LayoutPlacementKind,
  LayoutStatus,
  SceneDraft,
  SceneLayoutDraft,
} from "@/lib/editor-types";
import {
  createStarterLayout,
  layoutToYaml,
  mergeLayoutFromAuthoring,
} from "@/lib/layout-model";

const placementLabels: Record<LayoutPlacementKind, string> = {
  player_start: "Player start",
  npc: "NPC",
  interactable: "Interactable",
  item: "Inventory item",
  transition: "Transition",
  camera: "Camera",
  audio: "Audio",
  custom: "Custom marker",
};

const layoutStatusLabels: Record<LayoutStatus, string> = {
  draft: "Draft blockout",
  needs_review: "Needs review",
  layout_approved: "Layout approved",
};

function downloadYaml(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/yaml" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function idSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function placementColor(kind: LayoutPlacementKind) {
  if (kind === "player_start") return "#de6949";
  if (kind === "npc") return "#5f876f";
  if (kind === "interactable") return "#547d89";
  if (kind === "item") return "#b9822e";
  if (kind === "transition") return "#81679b";
  if (kind === "camera") return "#bd5f7e";
  return "#67716c";
}

function nextPlacementId(layout: SceneLayoutDraft) {
  const used = new Set(layout.placements.map((placement) => placement.id));
  let index = layout.placements.length + 1;
  let id = `MARKER_CUSTOM_${index}`;
  while (used.has(id)) {
    index += 1;
    id = `MARKER_CUSTOM_${index}`;
  }
  return id;
}

function nextPieceId(layout: SceneLayoutDraft) {
  const used = new Set(layout.environmentPieces.map((piece) => piece.id));
  let index = layout.environmentPieces.length + 1;
  let id = `GEO_BLOCKOUT_${index}`;
  while (used.has(id)) {
    index += 1;
    id = `GEO_BLOCKOUT_${index}`;
  }
  return id;
}

function nextPathId(layout: SceneLayoutDraft) {
  const used = new Set(layout.paths.map((path) => path.id));
  let index = layout.paths.length + 1;
  let id = `PATH_BLOCKOUT_${index}`;
  while (used.has(id)) {
    index += 1;
    id = `PATH_BLOCKOUT_${index}`;
  }
  return id;
}

export function LayoutEditor({
  scene,
  authoringHash,
  hashPending,
  onChange,
  onNotice,
  onRequestConfirmation,
}: {
  scene: SceneDraft;
  authoringHash: string;
  hashPending: boolean;
  onChange: (layout: SceneLayoutDraft) => void;
  onNotice: (message: string) => void;
  onRequestConfirmation: (request: ConfirmationRequest) => void;
}) {
  const layout = scene.layout;
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [selectedPieceId, setSelectedPieceId] = useState("");
  const [selectedPathId, setSelectedPathId] = useState("");
  const [beatFilter, setBeatFilter] = useState("all");
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    xM: number;
    axisM: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (
      selectedPlacementId &&
      !layout?.placements.some(
        (placement) => placement.id === selectedPlacementId,
      )
    ) {
      setSelectedPlacementId("");
    }
  }, [layout?.placements, selectedPlacementId]);

  useEffect(() => {
    if (
      selectedPathId &&
      !layout?.paths.some((path) => path.id === selectedPathId)
    ) {
      setSelectedPathId("");
    }
  }, [layout?.paths, selectedPathId]);

  const manifestYaml = useMemo(
    () => (layout ? layoutToYaml(scene, layout) : ""),
    [layout, scene],
  );

  if (!layout) {
    return (
      <section className="editor-section layout-empty">
        <div className="layout-empty-icon">
          <Map size={29} />
        </div>
        <div>
          <div className="eyebrow">Visual blockout</div>
          <h2>Create the spatial YAML for this story scene.</h2>
          <p>
            Scenework will carry the scene’s stable NPC, item, interactable, and
            beat IDs into a starter layout. This creates a separate{" "}
            <code>.scene.yaml</code>; it does not alter the authoring document.
          </p>
          {scene.status !== "approved" && scene.status !== "locked" && (
            <div className="layout-warning">
              <AlertTriangle size={15} />
              The story is still {scene.status.replace(/_/g, " ")}. You can
              block it out now, but later story edits will mark the layout stale.
            </div>
          )}
          <button
            className="button button-primary"
            disabled={hashPending || !authoringHash}
            onClick={() => {
              onChange(createStarterLayout(scene, authoringHash));
              onNotice(
                "Starter blockout created from the current story YAML.",
              );
            }}
          >
            <Plus size={16} />
            {hashPending ? "Hashing authoring YAML…" : "Create starter blockout"}
          </button>
        </div>
      </section>
    );
  }

  const stale =
    Boolean(authoringHash) &&
    layout.upstreamAuthoringHash !== authoringHash;
  const axisMax =
    scene.presentationMode === "static_cinematic"
      ? layout.dimensions.widthM
      : layout.dimensions.heightM;
  const selectedPlacement = layout.placements.find(
    (placement) => placement.id === selectedPlacementId,
  );
  const selectedPiece = layout.environmentPieces.find(
    (piece) => piece.id === selectedPieceId,
  );
  const selectedPath = layout.paths.find((path) => path.id === selectedPathId);
  const storyResources = [
    {
      id: "PLAYER_GRAYSON",
      label: "Grayson",
      kind: "player_start" as const,
    },
    ...scene.npcs.map((npc) => ({
      id: npc.id,
      label: npc.displayName || npc.id,
      kind: "npc" as const,
    })),
    ...scene.interactables.map((interactable) => ({
      id: interactable.id,
      label: interactable.name || interactable.id,
      kind:
        interactable.kind === "transition"
          ? ("transition" as const)
          : ("interactable" as const),
    })),
    ...scene.items.map((item) => ({
      id: item.id,
      label: item.name || item.id,
      kind: "item" as const,
    })),
  ];
  const visiblePlacements = layout.placements.filter(
    (placement) =>
      beatFilter === "all" ||
      !placement.beatId ||
      placement.beatId === beatFilter,
  );

  const updateLayout = (updates: Partial<SceneLayoutDraft>) =>
    onChange({ ...layout, ...updates });

  const updatePlacement = (
    placementId: string,
    updates: Partial<LayoutPlacement>,
  ) =>
    updateLayout({
      placements: layout.placements.map((placement) =>
        placement.id === placementId
          ? { ...placement, ...updates }
          : placement,
      ),
    });

  const updatePiece = (
    pieceId: string,
    updates: Partial<LayoutEnvironmentPiece>,
  ) =>
    updateLayout({
      environmentPieces: layout.environmentPieces.map((piece) =>
        piece.id === pieceId ? { ...piece, ...updates } : piece,
      ),
    });

  const updatePath = (pathId: string, updates: Partial<LayoutPath>) =>
    updateLayout({
      paths: layout.paths.map((path) =>
        path.id === pathId ? { ...path, ...updates } : path,
      ),
    });

  const coordinatesFromPointer = (clientX: number, clientY: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return { xM: 0, axisM: 0 };
    const xM = Math.max(
      0,
      Math.min(
        layout.dimensions.lengthM,
        ((clientX - bounds.left - 48) /
          Math.max(bounds.width - 76, 1)) *
          layout.dimensions.lengthM,
      ),
    );
    const axisM = Math.max(
      0,
      Math.min(
        axisMax,
        ((bounds.bottom - clientY - 42) /
          Math.max(bounds.height - 76, 1)) *
          axisMax,
      ),
    );
    return {
      xM: Number(xM.toFixed(2)),
      axisM: Number(axisM.toFixed(2)),
    };
  };

  const axisValue = (placement: LayoutPlacement) =>
    scene.presentationMode === "static_cinematic"
      ? placement.yM
      : placement.zM;

  const displayCoordinates = (placement: LayoutPlacement) =>
    dragPreview?.id === placement.id
      ? { xM: dragPreview.xM, axisM: dragPreview.axisM }
      : { xM: placement.xM, axisM: axisValue(placement) };

  return (
    <section className="editor-section layout-section">
      <div className="section-heading layout-heading">
        <div>
          <div className="eyebrow">Visual blockout</div>
          <h2>Place the approved story inside its runtime scene YAML.</h2>
        </div>
        <div className="layout-heading-actions">
          <span
            className={`layout-sync-state ${
              stale ? "is-stale" : "is-current"
            }`}
          >
            {stale ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            {hashPending
              ? "Checking story hash"
              : stale
                ? "Story changed · layout stale"
                : "Story bindings current"}
          </span>
          {stale && (
            <button
              className="button button-secondary"
              disabled={hashPending}
              onClick={() => {
                updateLayout(mergeLayoutFromAuthoring(scene, authoringHash));
                onNotice(
                  "Story changes merged into Layout. Hand-placed coordinates were preserved.",
                );
              }}
            >
              <GitMerge size={15} />
              Merge story changes
            </button>
          )}
          <button
            className="button button-primary"
            onClick={() => {
              downloadYaml(`${scene.id}.scene.yaml`, manifestYaml);
              onNotice("Runtime scene YAML export prepared.");
            }}
          >
            <Download size={15} />
            Export scene YAML
          </button>
        </div>
      </div>

      {layout.mergeConflicts.length > 0 && (
        <div className="layout-conflicts">
          <div>
            <AlertTriangle size={16} />
            <strong>
              {layout.mergeConflicts.length} merge review item
              {layout.mergeConflicts.length === 1 ? "" : "s"}
            </strong>
            <button
              className="text-button"
              onClick={() => {
                updateLayout({ mergeConflicts: [] });
                onNotice(
                  "Merge review items cleared. Run scene checks before approval.",
                );
              }}
            >
              Mark reviewed
            </button>
          </div>
          <ul>
            {layout.mergeConflicts.map((conflict) => (
              <li key={conflict}>{conflict}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="layout-toolbar">
        <label>
          <span>Preview beat</span>
          <select
            value={beatFilter}
            onChange={(event) => setBeatFilter(event.target.value)}
          >
            <option value="all">All placements</option>
            {scene.beats.map((beat, index) => (
              <option key={beat.id} value={beat.id}>
                {String(index + 1).padStart(2, "0")} · {beat.title}
              </option>
            ))}
          </select>
        </label>
        <span className="layout-mode">
          {scene.presentationMode === "static_cinematic"
            ? "Top-down room plan"
            : "Side-view gameplay strip"}
        </span>
        <button
          className="button button-quiet"
          onClick={() => {
            const id = nextPlacementId(layout);
            updateLayout({
              placements: [
                ...layout.placements,
                {
                  id,
                  sourceId: "",
                  label: "Custom marker",
                  kind: "custom",
                  beatId: beatFilter === "all" ? "" : beatFilter,
                  xM: layout.dimensions.lengthM / 2,
                  yM: 0,
                  zM: 0,
                  radiusM: 1,
                  widthM: 1,
                  heightM: 1,
                  assetId: "",
                  notes: "",
                },
              ],
            });
            setSelectedPlacementId(id);
            setSelectedPathId("");
          }}
        >
          <Plus size={14} />
          Add marker
        </button>
        <button
          className="button button-quiet"
          onClick={() => {
            const id = nextPathId(layout);
            updateLayout({
              paths: [
                ...layout.paths,
                {
                  id,
                  sourceId: "",
                  beatId: beatFilter === "all" ? "" : beatFilter,
                  speedMps: 1.5,
                  points: [
                    {
                      xM: layout.dimensions.lengthM * 0.25,
                      yM: 0,
                      zM: 0,
                    },
                    {
                      xM: layout.dimensions.lengthM * 0.75,
                      yM: 0,
                      zM: 0,
                    },
                  ],
                  notes: "",
                },
              ],
            });
            setSelectedPathId(id);
            setSelectedPlacementId("");
            setSelectedPieceId("");
          }}
        >
          <Route size={14} />
          Add path
        </button>
      </div>

      <div className="layout-workbench">
        <div className="layout-canvas-wrap">
          <svg
            ref={svgRef}
            className="layout-canvas"
            viewBox="0 0 1000 440"
            role="img"
            aria-label="Scene blockout canvas"
          >
            <defs>
              <pattern
                id={`layout-grid-${scene.id}`}
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#dfe4de"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              x="48"
              y="28"
              width="924"
              height="370"
              rx="8"
              fill={`url(#layout-grid-${scene.id})`}
              stroke="#bfc8c1"
            />
            {layout.environmentPieces.map((piece) => {
              const x =
                48 + (piece.xM / layout.dimensions.lengthM) * 924;
              const width = Math.max(
                8,
                (piece.dimensions.lengthM / layout.dimensions.lengthM) * 924,
              );
              const pieceAxis =
                scene.presentationMode === "static_cinematic"
                  ? piece.yM
                  : piece.zM;
              const y = 398 - (pieceAxis / Math.max(axisMax, 1)) * 370;
              const height = Math.max(
                5,
                (piece.dimensions.heightM / Math.max(axisMax, 1)) * 370,
              );
              return (
                <rect
                  key={piece.id}
                  x={x - width / 2}
                  y={y - height}
                  width={width}
                  height={height}
                  rx="3"
                  className={
                    selectedPieceId === piece.id
                      ? "layout-geometry is-selected"
                      : "layout-geometry"
                  }
                  onClick={() => {
                    setSelectedPieceId(piece.id);
                    setSelectedPlacementId("");
                    setSelectedPathId("");
                  }}
                />
              );
            })}
            {layout.paths.map((path) => {
              const points = path.points
                .map((point) => {
                  const pointAxis =
                    scene.presentationMode === "static_cinematic"
                      ? point.yM
                      : point.zM;
                  const x =
                    48 + (point.xM / layout.dimensions.lengthM) * 924;
                  const y =
                    398 - (pointAxis / Math.max(axisMax, 1)) * 370;
                  return `${x},${y}`;
                })
                .join(" ");
              return (
                <polyline
                  key={path.id}
                  points={points}
                  className={
                    selectedPathId === path.id
                      ? "layout-path is-selected"
                      : "layout-path"
                  }
                  onClick={() => {
                    setSelectedPathId(path.id);
                    setSelectedPlacementId("");
                    setSelectedPieceId("");
                  }}
                />
              );
            })}
            {visiblePlacements.map((placement) => {
              const coords = displayCoordinates(placement);
              const x =
                48 + (coords.xM / layout.dimensions.lengthM) * 924;
              const y =
                398 - (coords.axisM / Math.max(axisMax, 1)) * 370;
              return (
                <g
                  key={placement.id}
                  className={`layout-marker ${
                    selectedPlacementId === placement.id ? "is-selected" : ""
                  } ${placement.orphaned ? "is-orphaned" : ""}`}
                  transform={`translate(${x} ${y})`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setSelectedPlacementId(placement.id);
                    setSelectedPieceId("");
                    setSelectedPathId("");
                    const coordinates = coordinatesFromPointer(
                      event.clientX,
                      event.clientY,
                    );
                    setDragPreview({ id: placement.id, ...coordinates });
                  }}
                  onPointerMove={(event) => {
                    if (dragPreview?.id !== placement.id) return;
                    const coordinates = coordinatesFromPointer(
                      event.clientX,
                      event.clientY,
                    );
                    setDragPreview({ id: placement.id, ...coordinates });
                  }}
                  onPointerUp={(event) => {
                    if (dragPreview?.id !== placement.id) return;
                    const coordinates = coordinatesFromPointer(
                      event.clientX,
                      event.clientY,
                    );
                    updatePlacement(placement.id, {
                      xM: coordinates.xM,
                      ...(scene.presentationMode === "static_cinematic"
                        ? { yM: coordinates.axisM }
                        : { zM: coordinates.axisM }),
                    });
                    setDragPreview(null);
                  }}
                >
                  <circle
                    r={selectedPlacementId === placement.id ? 13 : 10}
                    fill={placementColor(placement.kind)}
                  />
                  <circle r="4" fill="#fff" opacity="0.9" />
                  <text x="16" y="4">
                    {placement.label}
                  </text>
                </g>
              );
            })}
            <text x="48" y="425" className="layout-axis-label">
              0 m
            </text>
            <text x="972" y="425" textAnchor="end" className="layout-axis-label">
              {layout.dimensions.lengthM} m
            </text>
          </svg>
          <p className="layout-canvas-hint">
            Drag round markers to place story resources. Coordinates are stored
            in meters in the scene YAML.
          </p>
        </div>

        <aside className="layout-inspector">
          {selectedPlacement ? (
            <>
              <div className="layout-inspector-head">
                <div>
                  <span>{placementLabels[selectedPlacement.kind]}</span>
                  <strong>{selectedPlacement.label}</strong>
                </div>
                <button
                  className="icon-button danger-hover"
                  aria-label="Delete layout marker"
                  onClick={() =>
                    onRequestConfirmation({
                      title: `Delete “${selectedPlacement.label}” placement?`,
                      description:
                        "This removes only the spatial placement. Its story resource remains in Staging.",
                      confirmLabel: "Delete placement",
                      onConfirm: () => {
                        updateLayout({
                          placements: layout.placements.filter(
                            (placement) =>
                              placement.id !== selectedPlacement.id,
                          ),
                        });
                        setSelectedPlacementId("");
                      },
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <label className="stage-field">
                <span>Story resource</span>
                <select
                  value={selectedPlacement.sourceId}
                  onChange={(event) => {
                    const resource = storyResources.find(
                      (item) => item.id === event.target.value,
                    );
                    updatePlacement(selectedPlacement.id, {
                      sourceId: event.target.value,
                      ...(resource
                        ? {
                            kind: resource.kind,
                            label:
                              selectedPlacement.orphaned ||
                              !selectedPlacement.label.trim()
                                ? resource.label
                                : selectedPlacement.label,
                            orphaned: false,
                          }
                        : {}),
                    });
                  }}
                >
                  <option value="">No story binding</option>
                  {storyResources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.label} · {resource.id}
                    </option>
                  ))}
                  {selectedPlacement.sourceId &&
                    !storyResources.some(
                      (resource) =>
                        resource.id === selectedPlacement.sourceId,
                    ) && (
                      <option value={selectedPlacement.sourceId}>
                        Missing · {selectedPlacement.sourceId}
                      </option>
                    )}
                </select>
              </label>
              <label className="stage-field">
                <span>Label</span>
                <input
                  value={selectedPlacement.label}
                  onChange={(event) =>
                    updatePlacement(selectedPlacement.id, {
                      label: event.target.value,
                    })
                  }
                />
              </label>
              <div className="layout-field-grid">
                {(["xM", "yM", "zM"] as const).map((field) => (
                  <label className="stage-field" key={field}>
                    <span>{field.replace("M", "").toUpperCase()} · m</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedPlacement[field]}
                      onChange={(event) =>
                        updatePlacement(selectedPlacement.id, {
                          [field]: numberValue(event.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="stage-field">
                <span>Beat binding</span>
                <select
                  value={selectedPlacement.beatId}
                  onChange={(event) =>
                    updatePlacement(selectedPlacement.id, {
                      beatId: event.target.value,
                    })
                  }
                >
                  <option value="">Scene-wide</option>
                  {scene.beats.map((beat) => (
                    <option key={beat.id} value={beat.id}>
                      {beat.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stage-field">
                <span>Placeholder asset ID</span>
                <input
                  value={selectedPlacement.assetId}
                  placeholder="BP_…, SM_…, SPR_…"
                  onChange={(event) =>
                    updatePlacement(selectedPlacement.id, {
                      assetId: idSegment(event.target.value),
                    })
                  }
                />
              </label>
              <label className="stage-field">
                <span>Placement notes</span>
                <textarea
                  value={selectedPlacement.notes}
                  onChange={(event) =>
                    updatePlacement(selectedPlacement.id, {
                      notes: event.target.value,
                    })
                  }
                />
              </label>
              {selectedPlacement.orphaned && (
                <div className="layout-orphan-note">
                  This source ID no longer exists in Story. Rebind it or delete
                  this placement.
                </div>
              )}
            </>
          ) : selectedPiece ? (
            <>
              <div className="layout-inspector-head">
                <div>
                  <span>Environment geometry</span>
                  <strong>{selectedPiece.label}</strong>
                </div>
                <button
                  className="icon-button danger-hover"
                  aria-label="Delete graybox piece"
                  onClick={() =>
                    onRequestConfirmation({
                      title: `Delete “${selectedPiece.label}” geometry?`,
                      description:
                        "This removes the graybox piece from scene YAML.",
                      confirmLabel: "Delete geometry",
                      onConfirm: () => {
                        updateLayout({
                          environmentPieces:
                            layout.environmentPieces.filter(
                              (piece) => piece.id !== selectedPiece.id,
                            ),
                        });
                        setSelectedPieceId("");
                      },
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <label className="stage-field">
                <span>Label</span>
                <input
                  value={selectedPiece.label}
                  onChange={(event) =>
                    updatePiece(selectedPiece.id, {
                      label: event.target.value,
                    })
                  }
                />
              </label>
              <label className="stage-field">
                <span>Geometry kind</span>
                <select
                  value={selectedPiece.kind}
                  onChange={(event) =>
                    updatePiece(selectedPiece.id, {
                      kind: event.target
                        .value as LayoutEnvironmentPiece["kind"],
                    })
                  }
                >
                  <option value="floor">Floor</option>
                  <option value="wall">Wall</option>
                  <option value="backdrop">Backdrop</option>
                  <option value="prop">Prop</option>
                  <option value="volume">Volume</option>
                </select>
              </label>
              <div className="layout-field-grid">
                {(["xM", "yM", "zM"] as const).map((field) => (
                  <label className="stage-field" key={field}>
                    <span>{field.replace("M", "").toUpperCase()} · m</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedPiece[field]}
                      onChange={(event) =>
                        updatePiece(selectedPiece.id, {
                          [field]: numberValue(event.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="layout-field-grid">
                {(["lengthM", "widthM", "heightM"] as const).map((field) => (
                  <label className="stage-field" key={field}>
                    <span>{field.replace("M", "")} · m</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={selectedPiece.dimensions[field]}
                      onChange={(event) =>
                        updatePiece(selectedPiece.id, {
                          dimensions: {
                            ...selectedPiece.dimensions,
                            [field]: numberValue(event.target.value, 0.1),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="stage-field">
                <span>Placeholder asset ID</span>
                <input
                  value={selectedPiece.assetId}
                  onChange={(event) =>
                    updatePiece(selectedPiece.id, {
                      assetId: idSegment(event.target.value),
                    })
                  }
                />
              </label>
              <label className="stage-field">
                <span>Geometry notes</span>
                <textarea
                  value={selectedPiece.notes}
                  onChange={(event) =>
                    updatePiece(selectedPiece.id, {
                      notes: event.target.value,
                    })
                  }
                />
              </label>
            </>
          ) : selectedPath ? (
            <>
              <div className="layout-inspector-head">
                <div>
                  <span>Movement route</span>
                  <strong>{selectedPath.id}</strong>
                </div>
                <button
                  className="icon-button danger-hover"
                  aria-label="Delete movement path"
                  onClick={() =>
                    onRequestConfirmation({
                      title: `Delete “${selectedPath.id}” path?`,
                      description:
                        "This removes the movement route from scene YAML.",
                      confirmLabel: "Delete path",
                      onConfirm: () => {
                        updateLayout({
                          paths: layout.paths.filter(
                            (path) => path.id !== selectedPath.id,
                          ),
                        });
                        setSelectedPathId("");
                      },
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <label className="stage-field">
                <span>NPC binding</span>
                <select
                  value={selectedPath.sourceId}
                  onChange={(event) =>
                    updatePath(selectedPath.id, {
                      sourceId: event.target.value,
                    })
                  }
                >
                  <option value="">Unbound route</option>
                  {scene.npcs.map((npc) => (
                    <option key={npc.id} value={npc.id}>
                      {npc.displayName || npc.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stage-field">
                <span>Beat binding</span>
                <select
                  value={selectedPath.beatId}
                  onChange={(event) =>
                    updatePath(selectedPath.id, {
                      beatId: event.target.value,
                    })
                  }
                >
                  <option value="">Scene-wide</option>
                  {scene.beats.map((beat) => (
                    <option key={beat.id} value={beat.id}>
                      {beat.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stage-field">
                <span>Speed · m/s</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={selectedPath.speedMps}
                  onChange={(event) =>
                    updatePath(selectedPath.id, {
                      speedMps: numberValue(event.target.value),
                    })
                  }
                />
              </label>
              <label className="stage-field">
                <span>Points · x, y, z per line</span>
                <textarea
                  value={selectedPath.points
                    .map((point) => `${point.xM}, ${point.yM}, ${point.zM}`)
                    .join("\n")}
                  onChange={(event) =>
                    updatePath(selectedPath.id, {
                      points: event.target.value
                        .split("\n")
                        .map((line) => line.split(",").map(Number))
                        .filter(
                          (values) =>
                            values.length >= 3 &&
                            values.every(Number.isFinite),
                        )
                        .map(([xM, yM, zM]) => ({ xM, yM, zM })),
                    })
                  }
                />
              </label>
              <label className="stage-field">
                <span>Route notes</span>
                <textarea
                  value={selectedPath.notes}
                  onChange={(event) =>
                    updatePath(selectedPath.id, {
                      notes: event.target.value,
                    })
                  }
                />
              </label>
            </>
          ) : (
            <div className="layout-inspector-empty">
              <Move size={22} />
              <strong>Select a layout element</strong>
              <p>
                Select a story placement, route, or graybox piece to edit its
                exact YAML values.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="layout-settings-grid">
        <section className="layout-settings-card">
          <div className="layout-card-head">
            <Box size={15} />
            <strong>Level and dimensions</strong>
          </div>
          <label className="stage-field">
            <span>Level name</span>
            <input
              value={layout.levelName}
              onChange={(event) =>
                updateLayout({ levelName: event.target.value })
              }
            />
          </label>
          <label className="stage-field">
            <span>Unreal output path</span>
            <input
              value={layout.outputPath}
              onChange={(event) =>
                updateLayout({ outputPath: event.target.value })
              }
            />
          </label>
          <div className="layout-field-grid">
            {(["lengthM", "widthM", "heightM"] as const).map((field) => (
              <label className="stage-field" key={field}>
                <span>{field.replace("M", "")} · m</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={layout.dimensions[field]}
                  onChange={(event) =>
                    updateLayout({
                      dimensions: {
                        ...layout.dimensions,
                        [field]: numberValue(event.target.value, 1),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="stage-field">
            <span>Environment kit IDs · one per line</span>
            <textarea
              value={layout.environmentKitIds.join("\n")}
              onChange={(event) =>
                updateLayout({
                  environmentKitIds: event.target.value
                    .split("\n")
                    .map((value) => idSegment(value))
                    .filter(Boolean),
                })
              }
            />
          </label>
        </section>

        <section className="layout-settings-card">
          <div className="layout-card-head">
            <RefreshCw size={15} />
            <strong>Camera and review</strong>
          </div>
          <label className="stage-field">
            <span>Camera mode</span>
            <select
              value={layout.camera.mode}
              onChange={(event) =>
                updateLayout({
                  camera: {
                    ...layout.camera,
                    mode: event.target.value as SceneLayoutDraft["camera"]["mode"],
                  },
                })
              }
            >
              <option value="side_view_perspective">
                Side-view perspective
              </option>
              <option value="orthographic">Orthographic</option>
              <option value="fixed_cinematic">Fixed cinematic</option>
            </select>
          </label>
          <div className="layout-field-grid">
            <label className="stage-field">
              <span>Perspective FOV</span>
              <input
                type="number"
                value={layout.camera.perspectiveFovDegrees}
                onChange={(event) =>
                  updateLayout({
                    camera: {
                      ...layout.camera,
                      perspectiveFovDegrees: numberValue(event.target.value, 24),
                    },
                  })
                }
              />
            </label>
            <label className="stage-field">
              <span>Ortho width · m</span>
              <input
                type="number"
                value={layout.camera.orthographicWidthM}
                onChange={(event) =>
                  updateLayout({
                    camera: {
                      ...layout.camera,
                      orthographicWidthM: numberValue(event.target.value, 26),
                    },
                  })
                }
              />
            </label>
          </div>
          <label className="stage-field">
            <span>Layout status</span>
            <select
              value={layout.status}
              onChange={(event) =>
                updateLayout({
                  status: event.target.value as LayoutStatus,
                })
              }
            >
              {Object.entries(layoutStatusLabels).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  disabled={
                    value === "layout_approved" &&
                    (stale || layout.mergeConflicts.length > 0)
                  }
                >
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="layout-camera-toggles">
            <label>
              <input
                type="checkbox"
                checked={layout.camera.horizontalTracking}
                onChange={(event) =>
                  updateLayout({
                    camera: {
                      ...layout.camera,
                      horizontalTracking: event.target.checked,
                    },
                  })
                }
              />
              Horizontal tracking
            </label>
            <label>
              <input
                type="checkbox"
                checked={layout.camera.verticalTracking}
                onChange={(event) =>
                  updateLayout({
                    camera: {
                      ...layout.camera,
                      verticalTracking: event.target.checked,
                    },
                  })
                }
              />
              Vertical tracking
            </label>
          </div>
          <label className="stage-field">
            <span>Framing notes</span>
            <textarea
              value={layout.camera.framingNotes}
              onChange={(event) =>
                updateLayout({
                  camera: {
                    ...layout.camera,
                    framingNotes: event.target.value,
                  },
                })
              }
            />
          </label>
        </section>

        <section className="layout-settings-card">
          <div className="layout-card-head">
            <Box size={15} />
            <strong>Graybox geometry</strong>
            <button
              className="text-button"
              onClick={() => {
                const id = nextPieceId(layout);
                updateLayout({
                  environmentPieces: [
                    ...layout.environmentPieces,
                    {
                      id,
                      label: "New graybox piece",
                      kind: "prop",
                      assetId: "SM_PLACEHOLDER_CUBE",
                      xM: layout.dimensions.lengthM / 2,
                      yM: 0,
                      zM: 0.5,
                      dimensions: { lengthM: 2, widthM: 2, heightM: 1 },
                      notes: "",
                    },
                  ],
                });
                setSelectedPieceId(id);
                setSelectedPlacementId("");
                setSelectedPathId("");
              }}
            >
              <Plus size={13} />
              Add piece
            </button>
          </div>
          <div className="layout-piece-list">
            {layout.environmentPieces.map((piece) => (
              <button
                key={piece.id}
                className={selectedPieceId === piece.id ? "is-selected" : ""}
                onClick={() => {
                  setSelectedPieceId(piece.id);
                  setSelectedPlacementId("");
                  setSelectedPathId("");
                }}
              >
                <span>{piece.kind}</span>
                <strong>{piece.label}</strong>
                <small>
                  {piece.dimensions.lengthM} × {piece.dimensions.widthM} ×{" "}
                  {piece.dimensions.heightM} m
                </small>
              </button>
            ))}
          </div>
        </section>

        <section className="layout-settings-card">
          <div className="layout-card-head">
            <CheckCircle2 size={15} />
            <strong>Handoff contract</strong>
          </div>
          <label className="stage-field">
            <span>Chapter manifest path</span>
            <input
              value={layout.sourceManifestPath}
              onChange={(event) =>
                updateLayout({ sourceManifestPath: event.target.value })
              }
            />
          </label>
          <label className="stage-field">
            <span>Graybox assets · one per line</span>
            <textarea
              value={layout.grayboxAssets.join("\n")}
              onChange={(event) =>
                updateLayout({
                  grayboxAssets: event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="stage-field">
            <span>Art replacements · one per line</span>
            <textarea
              value={layout.artReplacementAssets.join("\n")}
              onChange={(event) =>
                updateLayout({
                  artReplacementAssets: event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="stage-field">
            <span>Acceptance tests · one per line</span>
            <textarea
              value={layout.acceptanceTests.join("\n")}
              onChange={(event) =>
                updateLayout({
                  acceptanceTests: event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="stage-field">
            <span>Layout notes</span>
            <textarea
              value={layout.notes}
              onChange={(event) =>
                updateLayout({ notes: event.target.value })
              }
            />
          </label>
        </section>
      </div>

      <details className="layout-yaml-preview">
        <summary>Inspect generated scene YAML</summary>
        <pre>
          <code>{manifestYaml}</code>
        </pre>
      </details>
    </section>
  );
}
