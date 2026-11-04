import type { CatalogEdition, CatalogMap } from "./catalog";

export type ObservationConfidence = "low" | "medium" | "high";

export interface MapCalibration {
  widthMeters: number;
  depthMeters: number;
  originDescription: string;
}

interface ObservationBase {
  id: string;
  label: string;
  xMeters: number;
  zMeters: number;
  confidence: ObservationConfidence;
  notes: string;
}

export interface LandmarkObservation extends ObservationBase {
  kind: "building" | "tree" | "rock" | "structure" | "other";
  elevationMeters: number;
  widthMeters: number;
  depthMeters: number;
  heightMeters: number;
  rotationDegrees: number;
}

export interface TerrainObservation extends ObservationBase {
  terrainType:
    | "plain"
    | "hill"
    | "ridge"
    | "valley"
    | "cliff"
    | "river"
    | "lake"
    | "coast"
    | "road"
    | "other";
  biome: string;
  widthMeters: number;
  depthMeters: number;
  elevationMeters: number;
}

export interface MaterialObservation extends ObservationBase {
  materialType: "ground" | "rock" | "wood" | "water" | "metal" | "other";
  appearance: string;
  usedOn: "terrain" | "building" | "vegetation" | "rock" | "water" | "other";
  approximateColor: string;
  widthMeters: number;
  depthMeters: number;
}

export interface MapStudy {
  schemaVersion: 1;
  editionId: string;
  editionTitle: string;
  mapId: string;
  mapName: string;
  sourceUrl: string;
  observedAt: string;
  coordinateSystem: {
    units: "meters";
    xAxis: "east";
    zAxis: "south";
  };
  calibration: MapCalibration | null;
  landmarks: LandmarkObservation[];
  terrain: TerrainObservation[];
  materials: MaterialObservation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validBase(value: unknown): value is ObservationBase {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.xMeters === "number" &&
    Number.isFinite(value.xMeters) &&
    typeof value.zMeters === "number" &&
    Number.isFinite(value.zMeters) &&
    ["low", "medium", "high"].includes(String(value.confidence)) &&
    typeof value.notes === "string"
  );
}

function hasFiniteNumbers(
  value: Record<string, unknown>,
  fields: string[],
): boolean {
  return fields.every(
    (field) =>
      typeof value[field] === "number" && Number.isFinite(value[field]),
  );
}

function hasPositiveNumbers(
  value: Record<string, unknown>,
  fields: string[],
): boolean {
  return (
    hasFiniteNumbers(value, fields) &&
    fields.every((field) => {
      const number = value[field];
      return typeof number === "number" && number > 0;
    })
  );
}

function isCalibration(value: unknown): value is MapCalibration {
  return (
    isRecord(value) &&
    typeof value.widthMeters === "number" &&
    Number.isFinite(value.widthMeters) &&
    value.widthMeters > 0 &&
    typeof value.depthMeters === "number" &&
    Number.isFinite(value.depthMeters) &&
    value.depthMeters > 0 &&
    typeof value.originDescription === "string"
  );
}

function isLandmark(value: unknown): value is LandmarkObservation {
  return (
    validBase(value) &&
    isRecord(value) &&
    ["building", "tree", "rock", "structure", "other"].includes(
      String(value.kind),
    ) &&
    hasFiniteNumbers(value, ["elevationMeters", "rotationDegrees"]) &&
    hasPositiveNumbers(value, [
      "widthMeters",
      "depthMeters",
      "heightMeters",
    ])
  );
}

function isTerrainObservation(value: unknown): value is TerrainObservation {
  return (
    validBase(value) &&
    isRecord(value) &&
    [
      "plain",
      "hill",
      "ridge",
      "valley",
      "cliff",
      "river",
      "lake",
      "coast",
      "road",
      "other",
    ].includes(String(value.terrainType)) &&
    typeof value.biome === "string" &&
    hasFiniteNumbers(value, ["elevationMeters"]) &&
    hasPositiveNumbers(value, ["widthMeters", "depthMeters"])
  );
}

function isMaterialObservation(value: unknown): value is MaterialObservation {
  return (
    validBase(value) &&
    isRecord(value) &&
    ["ground", "rock", "wood", "water", "metal", "other"].includes(
      String(value.materialType),
    ) &&
    ["terrain", "building", "vegetation", "rock", "water", "other"].includes(
      String(value.usedOn),
    ) &&
    typeof value.appearance === "string" &&
    typeof value.approximateColor === "string" &&
    hasPositiveNumbers(value, ["widthMeters", "depthMeters"])
  );
}

export function isMapStudy(value: unknown): value is MapStudy {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (
    typeof value.editionId !== "string" ||
    typeof value.editionTitle !== "string" ||
    typeof value.mapId !== "string" ||
    typeof value.mapName !== "string" ||
    typeof value.sourceUrl !== "string" ||
    typeof value.observedAt !== "string" ||
    !isRecord(value.coordinateSystem) ||
    value.coordinateSystem.units !== "meters" ||
    value.coordinateSystem.xAxis !== "east" ||
    value.coordinateSystem.zAxis !== "south" ||
    !Array.isArray(value.landmarks) ||
    !Array.isArray(value.terrain) ||
    !Array.isArray(value.materials)
  ) {
    return false;
  }

  const calibration = value.calibration;
  if (calibration !== null && !isCalibration(calibration)) return false;

  const hasObservations =
    value.landmarks.length + value.terrain.length + value.materials.length > 0;
  if (calibration === null && hasObservations) return false;

  const inBounds = (observation: unknown): boolean => {
    if (!isRecord(observation)) return false;
    return (
      typeof observation.xMeters === "number" &&
      typeof observation.zMeters === "number" &&
      calibration !== null &&
      observation.xMeters >= 0 &&
      observation.xMeters <= calibration.widthMeters &&
      observation.zMeters >= 0 &&
      observation.zMeters <= calibration.depthMeters
    );
  };

  return (
    value.landmarks.every(
      (observation) => isLandmark(observation) && inBounds(observation),
    ) &&
    value.terrain.every(
      (observation) =>
        isTerrainObservation(observation) && inBounds(observation),
    ) &&
    value.materials.every(
      (observation) =>
        isMaterialObservation(observation) && inBounds(observation),
    )
  );
}

export function createMapStudy(
  edition: CatalogEdition,
  map: CatalogMap,
): MapStudy {
  return {
    schemaVersion: 1,
    editionId: edition.id,
    editionTitle: edition.title,
    mapId: map.id,
    mapName: map.name,
    sourceUrl: "https://noclip.website/",
    observedAt: new Date().toISOString(),
    coordinateSystem: {
      units: "meters",
      xAxis: "east",
      zAxis: "south",
    },
    calibration: null,
    landmarks: [],
    terrain: [],
    materials: [],
  };
}

export function loadMapStudy(
  edition: CatalogEdition,
  map: CatalogMap,
): MapStudy {
  const storageKey = `map-study-v1:${edition.id}:${map.id}`;
  const serialized = localStorage.getItem(storageKey);
  if (!serialized) return createMapStudy(edition, map);

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new Error(
      `Saved study for "${map.name}" is invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!isMapStudy(parsed)) {
    throw new Error(`Saved study for "${map.name}" has an unsupported format.`);
  }
  if (parsed.editionId !== edition.id || parsed.mapId !== map.id) {
    throw new Error("Saved study does not match the selected map.");
  }
  return parsed;
}

export function saveMapStudy(study: MapStudy): void {
  localStorage.setItem(
    `map-study-v1:${study.editionId}:${study.mapId}`,
    JSON.stringify(study),
  );
}

export function updateObservedAt(study: MapStudy): void {
  study.observedAt = new Date().toISOString();
}

export function parseStudyFile(serialized: string): MapStudy {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new Error(
      `The study file is invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (!isMapStudy(parsed)) {
    throw new Error("The file is not a supported map study.");
  }
  return parsed;
}
