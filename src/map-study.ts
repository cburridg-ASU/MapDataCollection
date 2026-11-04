import type { CatalogEdition, CatalogMap } from "./catalog";

export type ObservationConfidence = "low" | "medium" | "high";

export interface MapCalibration {
  widthMeters: number;
  depthMeters: number;
  originDescription: string;
}

interface ObservationMetadata {
  id: string;
  label: string;
  confidence: ObservationConfidence;
  notes: string;
}

interface MeterPosition extends ObservationMetadata {
  xMeters: number;
  zMeters: number;
}

export interface LandmarkObservation extends MeterPosition {
  kind: "building" | "tree" | "rock" | "structure" | "other";
  elevationMeters: number;
  widthMeters: number;
  depthMeters: number;
  heightMeters: number;
  rotationDegrees: number;
}

export interface MapRelativePoint {
  x: number;
  z: number;
}

export function isMapPointInsideRegion(
  boundary: readonly MapRelativePoint[],
  x: number,
  z: number,
): boolean {
  let isInside = false;
  for (
    let index = 0, previousIndex = boundary.length - 1;
    index < boundary.length;
    previousIndex = index, index += 1
  ) {
    const point = boundary[index]!;
    const previous = boundary[previousIndex]!;
    const crossesRay =
      (point.z > z) !== (previous.z > z) &&
      x <
        ((previous.x - point.x) * (z - point.z)) /
          (previous.z - point.z) +
          point.x;
    if (crossesRay) isInside = !isInside;
  }
  return isInside;
}

export interface TerrainRegionObservation extends ObservationMetadata {
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
  boundary: MapRelativePoint[];
  relativeElevation: number;
}

export interface MaterialObservation extends MeterPosition {
  materialType: "ground" | "rock" | "wood" | "water" | "metal" | "other";
  appearance: string;
  usedOn: "terrain" | "building" | "vegetation" | "rock" | "water" | "other";
  approximateColor: string;
  widthMeters: number;
  depthMeters: number;
}

export interface MapStudy {
  schemaVersion: 2;
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
    terrainRegions: "normalized-map-relative";
  };
  calibration: MapCalibration | null;
  landmarks: LandmarkObservation[];
  terrain: TerrainRegionObservation[];
  materials: MaterialObservation[];
}

interface LegacyTerrainObservation extends MeterPosition {
  terrainType: TerrainRegionObservation["terrainType"];
  biome: string;
  widthMeters: number;
  depthMeters: number;
  elevationMeters: number;
}

interface LegacyMapStudy
  extends Omit<
    MapStudy,
    "schemaVersion" | "terrain" | "coordinateSystem"
  > {
  schemaVersion: 1;
  coordinateSystem: {
    units: "meters";
    xAxis: "east";
    zAxis: "south";
  };
  terrain: LegacyTerrainObservation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validMetadata(value: unknown): value is ObservationMetadata {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    ["low", "medium", "high"].includes(String(value.confidence)) &&
    typeof value.notes === "string"
  );
}

function validMeterPosition(value: unknown): value is MeterPosition {
  return (
    validMetadata(value) &&
    isRecord(value) &&
    typeof value.xMeters === "number" &&
    Number.isFinite(value.xMeters) &&
    typeof value.zMeters === "number" &&
    Number.isFinite(value.zMeters)
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

function isMapRelativePoint(value: unknown): value is MapRelativePoint {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    value.x >= 0 &&
    value.x <= 1 &&
    typeof value.z === "number" &&
    Number.isFinite(value.z) &&
    value.z >= 0 &&
    value.z <= 1
  );
}

function validRegionBoundary(boundary: unknown[]): boolean {
  if (boundary.length < 3 || !boundary.every(isMapRelativePoint)) return false;
  const points = boundary.filter(isMapRelativePoint);
  if (
    points.some((point, index) =>
      points.slice(index + 1).some(
        (other) => point.x === other.x && point.z === other.z,
      ),
    )
  ) {
    return false;
  }
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!;
    return sum + point.x * next.z - next.x * point.z;
  }, 0);
  if (Math.abs(area) <= 1e-8) return false;

  const orientation = (
    a: MapRelativePoint,
    b: MapRelativePoint,
    c: MapRelativePoint,
  ): number =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const intersects = (
    a: MapRelativePoint,
    b: MapRelativePoint,
    c: MapRelativePoint,
    d: MapRelativePoint,
  ): boolean => {
    const abC = orientation(a, b, c);
    const abD = orientation(a, b, d);
    const cdA = orientation(c, d, a);
    const cdB = orientation(c, d, b);
    const onSegment = (
      start: MapRelativePoint,
      point: MapRelativePoint,
      end: MapRelativePoint,
    ): boolean =>
      Math.abs(orientation(start, end, point)) <= 1e-10 &&
      point.x >= Math.min(start.x, end.x) - 1e-10 &&
      point.x <= Math.max(start.x, end.x) + 1e-10 &&
      point.z >= Math.min(start.z, end.z) - 1e-10 &&
      point.z <= Math.max(start.z, end.z) + 1e-10;
    if (abC * abD < 0 && cdA * cdB < 0) return true;
    return (
      onSegment(a, c, b) ||
      onSegment(a, d, b) ||
      onSegment(c, a, d) ||
      onSegment(c, b, d)
    );
  };
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (
        first === second ||
        firstNext === second ||
        secondNext === first
      ) {
        continue;
      }
      if (
        intersects(
          points[first]!,
          points[firstNext]!,
          points[second]!,
          points[secondNext]!,
        )
      ) {
        return false;
      }
    }
  }
  return true;
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
    validMeterPosition(value) &&
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

function isTerrainRegion(value: unknown): value is TerrainRegionObservation {
  return (
    validMetadata(value) &&
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
    typeof value.relativeElevation === "number" &&
    Number.isFinite(value.relativeElevation) &&
    value.relativeElevation >= -1 &&
    value.relativeElevation <= 1 &&
    Array.isArray(value.boundary) &&
    validRegionBoundary(value.boundary)
  );
}

function isMaterialObservation(value: unknown): value is MaterialObservation {
  return (
    validMeterPosition(value) &&
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

function isLegacyTerrainObservation(
  value: unknown,
): value is LegacyTerrainObservation {
  return (
    validMeterPosition(value) &&
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

function isLegacyMapStudy(value: unknown): value is LegacyMapStudy {
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
  if (
    calibration === null &&
    value.landmarks.length + value.materials.length > 0
  ) {
    return false;
  }
  const inBounds = (observation: unknown): boolean => {
    if (!isRecord(observation) || !isCalibration(calibration)) return false;
    return (
      typeof observation.xMeters === "number" &&
      typeof observation.zMeters === "number" &&
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
        isLegacyTerrainObservation(observation) && inBounds(observation),
    ) &&
    value.materials.every(
      (observation) =>
        isMaterialObservation(observation) && inBounds(observation),
    )
  );
}

function clampNormalized(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function migrateMapStudy(value: unknown): MapStudy | null {
  if (isMapStudy(value)) return value;
  if (!isLegacyMapStudy(value)) return null;
  const widthMeters = value.calibration?.widthMeters ?? 1;
  const depthMeters = value.calibration?.depthMeters ?? 1;
  return {
    ...value,
    schemaVersion: 2,
    coordinateSystem: {
      ...value.coordinateSystem,
      terrainRegions: "normalized-map-relative",
    },
    terrain: value.terrain.map((region) => {
      const left = clampNormalized(
        (region.xMeters - region.widthMeters / 2) / widthMeters,
      );
      const right = clampNormalized(
        (region.xMeters + region.widthMeters / 2) / widthMeters,
      );
      const top = clampNormalized(
        (region.zMeters - region.depthMeters / 2) / depthMeters,
      );
      const bottom = clampNormalized(
        (region.zMeters + region.depthMeters / 2) / depthMeters,
      );
      return {
        id: region.id,
        label: region.label,
        confidence: region.confidence,
        notes: region.notes,
        terrainType: region.terrainType,
        biome: region.biome,
        boundary: [
          { x: left, z: top },
          { x: right, z: top },
          { x: right, z: bottom },
          { x: left, z: bottom },
        ],
        relativeElevation: Math.min(
          1,
          Math.max(
            -1,
            region.elevationMeters / Math.max(widthMeters, depthMeters),
          ),
        ),
      };
    }),
  };
}

export function isMapStudy(value: unknown): value is MapStudy {
  if (!isRecord(value) || value.schemaVersion !== 2) return false;
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
    value.coordinateSystem.terrainRegions !== "normalized-map-relative" ||
    !Array.isArray(value.landmarks) ||
    !Array.isArray(value.terrain) ||
    !Array.isArray(value.materials)
  ) {
    return false;
  }

  const calibration = value.calibration;
  if (calibration !== null && !isCalibration(calibration)) return false;

  const inMeterBounds = (observation: unknown): boolean => {
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
      (observation) =>
        isLandmark(observation) &&
        calibration !== null &&
        inMeterBounds(observation),
    ) &&
    value.terrain.every(isTerrainRegion) &&
    value.materials.every(
      (observation) =>
        isMaterialObservation(observation) &&
        calibration !== null &&
        inMeterBounds(observation),
    )
  );
}

export function createMapStudy(
  edition: CatalogEdition,
  map: CatalogMap,
): MapStudy {
  return {
    schemaVersion: 2,
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
      terrainRegions: "normalized-map-relative",
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
  const storageKey = `map-study-v2:${edition.id}:${map.id}`;
  const legacyStorageKey = `map-study-v1:${edition.id}:${map.id}`;
  const serialized =
    localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey);
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

  const study = migrateMapStudy(parsed);
  if (!study) {
    throw new Error(`Saved study for "${map.name}" has an unsupported format.`);
  }
  if (study.editionId !== edition.id || study.mapId !== map.id) {
    throw new Error("Saved study does not match the selected map.");
  }
  if (localStorage.getItem(storageKey) === null) {
    saveMapStudy(study);
    localStorage.removeItem(legacyStorageKey);
  }
  return study;
}

export function saveMapStudy(study: MapStudy): void {
  localStorage.setItem(
    `map-study-v2:${study.editionId}:${study.mapId}`,
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
  const study = migrateMapStudy(parsed);
  if (!study) {
    throw new Error("The file is not a supported map study.");
  }
  return study;
}
