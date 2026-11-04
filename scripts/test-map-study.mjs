import assert from "node:assert/strict";
import {
  isMapPointInsideRegion,
  isMapStudy,
  migrateMapStudy,
} from "../src/map-study.ts";

const mapStudy = {
  schemaVersion: 2,
  editionId: "classic",
  editionTitle: "World of Warcraft",
  mapId: "test/region",
  mapName: "Test Region",
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
  terrain: [
    {
      id: "forest",
      label: "Forest edge",
      confidence: "medium",
      notes: "",
      terrainType: "hill",
      biome: "temperate forest",
      boundary: [
        { x: 0.1, z: 0.2 },
        { x: 0.8, z: 0.25 },
        { x: 0.6, z: 0.7 },
        { x: 0.25, z: 0.85 },
      ],
      relativeElevation: 0.25,
    },
  ],
  materials: [],
};

assert.equal(
  isMapStudy(mapStudy),
  true,
  "Map-relative polygon regions can be stored without physical map scale.",
);
const concaveBoundary = [
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: 1, z: 1 },
  { x: 0.6, z: 1 },
  { x: 0.6, z: 0.4 },
  { x: 0.4, z: 0.4 },
  { x: 0.4, z: 1 },
  { x: 0, z: 1 },
];
assert.equal(
  isMapPointInsideRegion(concaveBoundary, 0.2, 0.7),
  true,
  "Concave region interiors must be detected.",
);
assert.equal(
  isMapPointInsideRegion(concaveBoundary, 0.5, 0.7),
  false,
  "Concave region notches must remain outside.",
);

const crossedBoundary = structuredClone(mapStudy);
crossedBoundary.terrain[0].boundary = [
  { x: 0.1, z: 0.1 },
  { x: 0.9, z: 0.9 },
  { x: 0.1, z: 0.9 },
  { x: 0.9, z: 0.1 },
];
assert.equal(
  isMapStudy(crossedBoundary),
  false,
  "Self-crossing region outlines must be rejected.",
);

const unscaledLandmark = structuredClone(mapStudy);
unscaledLandmark.landmarks.push({
  id: "landmark",
  label: "Unscaled structure",
  confidence: "medium",
  notes: "",
  xMeters: 20,
  zMeters: 20,
  kind: "building",
  elevationMeters: 0,
  widthMeters: 10,
  depthMeters: 10,
  heightMeters: 10,
  rotationDegrees: 0,
});
assert.equal(
  isMapStudy(unscaledLandmark),
  false,
  "Meter-based landmarks still require physical map calibration.",
);

const legacyStudy = {
  ...mapStudy,
  schemaVersion: 1,
  calibration: {
    widthMeters: 10000,
    depthMeters: 8000,
    originDescription: "Known map dimensions",
  },
  terrain: [
    {
      id: "old-region",
      label: "Legacy rectangle",
      confidence: "high",
      notes: "",
      xMeters: 5000,
      zMeters: 4000,
      terrainType: "plain",
      biome: "grassland",
      widthMeters: 4000,
      depthMeters: 2000,
      elevationMeters: 1000,
    },
  ],
};
delete legacyStudy.coordinateSystem.terrainRegions;

const migrated = migrateMapStudy(legacyStudy);
assert.ok(migrated, "Version 1 studies should migrate.");
assert.equal(migrated.schemaVersion, 2);
assert.deepEqual(
  migrated.terrain[0].boundary,
  [
    { x: 0.3, z: 0.375 },
    { x: 0.7, z: 0.375 },
    { x: 0.7, z: 0.625 },
    { x: 0.3, z: 0.625 },
  ],
);
assert.equal(migrated.terrain[0].relativeElevation, 0.1);
assert.equal(
  migrated.coordinateSystem.terrainRegions,
  "normalized-map-relative",
);
assert.equal(isMapStudy(migrated), true);

const legacyEmpty = {
  ...mapStudy,
  schemaVersion: 1,
  coordinateSystem: { units: "meters", xAxis: "east", zAxis: "south" },
  terrain: [],
};
assert.ok(
  migrateMapStudy(legacyEmpty),
  "Legacy empty studies without scale should remain loadable.",
);

console.log("Map-relative terrain region tests passed.");
