import "./style.css";
import { loadCatalog, type CatalogEdition, type CatalogMap, type WorldCatalog } from "./catalog";
import {
  biomeLabel,
  WorldBuilder,
  type BiomeId,
  type WorldSettings,
} from "./world-builder";
import {
  loadMapStudy,
  isMapStudy,
  parseStudyFile,
  saveMapStudy,
  updateObservedAt,
  type MapRelativePoint,
  type MapStudy,
  type ObservationConfidence,
  type TerrainRegionObservation,
} from "./map-study";
import { getBundledMapStudy } from "./map-study-corpus";

const elements = {
  edition: document.querySelector<HTMLSelectElement>("#edition-select")!,
  map: document.querySelector<HTMLSelectElement>("#map-select")!,
  biome: document.querySelector<HTMLSelectElement>("#biome-select")!,
  seed: document.querySelector<HTMLInputElement>("#seed-input")!,
  scale: document.querySelector<HTMLInputElement>("#scale-input")!,
  relief: document.querySelector<HTMLInputElement>("#relief-input")!,
  vegetation: document.querySelector<HTMLInputElement>("#vegetation-toggle")!,
  ruins: document.querySelector<HTMLInputElement>("#ruins-toggle")!,
  scaleOutput: document.querySelector<HTMLOutputElement>("#scale-output")!,
  reliefOutput: document.querySelector<HTMLOutputElement>("#relief-output")!,
  catalogStatus: document.querySelector<HTMLElement>("#catalog-status")!,
  worldName: document.querySelector<HTMLElement>("#world-name")!,
  worldEdition: document.querySelector<HTMLElement>("#world-edition")!,
  worldSubtitle: document.querySelector<HTMLElement>("#world-subtitle")!,
  statSize: document.querySelector<HTMLElement>("#stat-size")!,
  statSizeUnit: document.querySelector<HTMLElement>("#stat-size-unit")!,
  statSeed: document.querySelector<HTMLElement>("#stat-seed")!,
  loading: document.querySelector<HTMLElement>("#loading-state")!,
  toast: document.querySelector<HTMLElement>("#toast")!,
  generate: document.querySelector<HTMLButtonElement>("#generate-world")!,
  exportScene: document.querySelector<HTMLButtonElement>("#export-scene")!,
  exportManifest: document.querySelector<HTMLButtonElement>("#export-manifest")!,
  importCatalog: document.querySelector<HTMLButtonElement>("#import-catalog")!,
  catalogFile: document.querySelector<HTMLInputElement>("#catalog-file")!,
  randomSeed: document.querySelector<HTMLButtonElement>("#random-seed")!,
  resetCamera: document.querySelector<HTMLButtonElement>("#reset-camera")!,
  wireframe: document.querySelector<HTMLButtonElement>("#toggle-wireframe")!,
  openStudy: document.querySelector<HTMLButtonElement>("#open-study")!,
  studyDialog: document.querySelector<HTMLDialogElement>("#study-dialog")!,
  closeStudy: document.querySelector<HTMLButtonElement>("#close-study")!,
  studyTitle: document.querySelector<HTMLElement>("#study-map-title")!,
  calibrationForm: document.querySelector<HTMLFormElement>("#calibration-form")!,
  calibrationStatus: document.querySelector<HTMLElement>("#calibration-status")!,
  observationForm: document.querySelector<HTMLFormElement>("#observation-form")!,
  addObservation: document.querySelector<HTMLButtonElement>("#add-observation")!,
  regionMap: document.querySelector<SVGSVGElement>("#region-map")!,
  regionLayer: document.querySelector<SVGGElement>("#region-layer")!,
  regionDraft: document.querySelector<SVGPolylineElement>("#region-draft")!,
  regionDraftPoints: document.querySelector<SVGGElement>("#region-draft-points")!,
  regionPointCount: document.querySelector<HTMLElement>("#region-point-count")!,
  undoRegionPoint: document.querySelector<HTMLButtonElement>("#undo-region-point")!,
  clearRegionPoints: document.querySelector<HTMLButtonElement>("#clear-region-points")!,
  studyCounts: document.querySelector<HTMLElement>("#study-counts")!,
  studyRecords: document.querySelector<HTMLElement>("#study-record-list")!,
  studyFile: document.querySelector<HTMLInputElement>("#study-file")!,
  exportStudy: document.querySelector<HTMLButtonElement>("#export-study")!,
};

const builder = new WorldBuilder(
  document.querySelector<HTMLCanvasElement>("#world-canvas")!,
);

let editions: CatalogEdition[] = [];
let currentSettings: WorldSettings | null = null;
let currentStudy: MapStudy | null = null;
let activeObservationTab = "landmark";
let pendingRegionBoundary: MapRelativePoint[] = [];
let toastTimer: number | undefined;

function selectedEdition(): CatalogEdition | undefined {
  return editions.find((edition) => edition.id === elements.edition.value);
}

function selectedMap(): CatalogMap | undefined {
  return selectedEdition()?.maps.find((map) => map.id === elements.map.value);
}

function setCatalogStatus(message: string, isError = false): void {
  elements.catalogStatus.textContent = message;
  elements.catalogStatus.classList.toggle("field-note-error", isError);
}

function showToast(message: string): void {
  elements.toast.textContent = message;
  elements.toast.classList.add("toast-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => elements.toast.classList.remove("toast-visible"),
    3200,
  );
}

function populateEditions(
  nextCatalog: WorldCatalog,
  sourceName = "Bundled catalog",
): void {
  editions = nextCatalog.editions;
  elements.edition.replaceChildren();

  for (const edition of editions) {
    const option = document.createElement("option");
    option.value = edition.id;
    option.textContent = edition.title;
    elements.edition.append(option);
  }

  populateMaps();
  setCatalogStatus(
    `${editions.reduce((total, edition) => total + edition.maps.length, 0)} maps · ${sourceName}`,
  );
}

function populateMaps(): void {
  const edition = selectedEdition();
  elements.map.replaceChildren();
  if (!edition) return;

  for (const map of edition.maps) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    elements.map.append(option);
  }
}

function readSettings(): WorldSettings {
  const map = selectedMap();
  const edition = selectedEdition();
  if (!map || !edition) {
    throw new Error("Choose a map and edition from the catalog first.");
  }

  return {
    editionId: edition.id,
    mapId: map.id,
    name: map.name,
    category: map.category,
    edition: edition.title,
    seed: elements.seed.value.trim() || "untitled-frontier",
    scale: Number(elements.scale.value),
    relief: Number(elements.relief.value),
    biome: elements.biome.value as BiomeId,
    vegetation: elements.vegetation.checked,
    ruins: elements.ruins.checked,
  };
}

function getCurrentStudy(): MapStudy {
  const edition = selectedEdition();
  const map = selectedMap();
  if (!edition || !map) {
    throw new Error("Choose a map before opening its study.");
  }
  if (
    currentStudy?.editionId === edition.id &&
    currentStudy.mapId === map.id
  ) {
    return currentStudy;
  }
  currentStudy = loadMapStudy(
    edition,
    map,
    getBundledMapStudy(edition.id, map.id),
  );
  return currentStudy;
}

function syncStudyDialog(): void {
  const edition = selectedEdition();
  const map = selectedMap();
  if (!edition || !map) return;

  const study = getCurrentStudy();
  elements.studyTitle.textContent = `${edition.title} / ${map.name}`;
  const calibration = study.calibration;
  const calibrationFields = elements.calibrationForm.elements;
  (calibrationFields.namedItem("widthMeters") as HTMLInputElement).value =
    calibration?.widthMeters.toString() ?? "";
  (calibrationFields.namedItem("depthMeters") as HTMLInputElement).value =
    calibration?.depthMeters.toString() ?? "";
  (
    calibrationFields.namedItem("originDescription") as HTMLInputElement
  ).value = calibration?.originDescription ?? "";
  elements.calibrationStatus.textContent = calibration
    ? `Measured bounds: ${calibration.widthMeters} m × ${calibration.depthMeters} m. Meter-based landmark/material notes use the northwest origin.`
    : "No physical scale recorded. Relative region mapping is available; meter-based notes need a trustworthy scale.";
  updateObservationTab(activeObservationTab);
  renderStudyRecords(study);
}

function regionColor(biome: string): string {
  const label = biome.toLowerCase();
  if (/tundra|snow|ice|frost|glacier/.test(label)) return "#b7d5d4";
  if (/desert|sand|arid|badland/.test(label)) return "#d6b46f";
  if (/swamp|marsh|wetland|bog|fen/.test(label)) return "#6e8e58";
  if (/arcane|crystal|magic/.test(label)) return "#8f7bc0";
  if (/fel|corrupt|demonic/.test(label)) return "#a29445";
  if (/forest|woodland/.test(label)) return "#4b8a5a";
  if (/plain|grassland|meadow/.test(label)) return "#9ab565";
  return "#9b9d75";
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}

function regionSvgPoint(point: MapRelativePoint): string {
  return `${(point.x * 1000).toFixed(1)},${(point.z * 700).toFixed(1)}`;
}

function renderRegionMap(study: MapStudy): void {
  elements.regionLayer.replaceChildren();
  for (const region of study.terrain) {
    const polygon = svgElement("polygon");
    polygon.setAttribute(
      "points",
      region.boundary.map(regionSvgPoint).join(" "),
    );
    polygon.setAttribute("fill", regionColor(region.biome));
    polygon.setAttribute("fill-opacity", "0.3");
    polygon.setAttribute("stroke", regionColor(region.biome));
    polygon.setAttribute("stroke-width", "3");
    polygon.setAttribute("vector-effect", "non-scaling-stroke");
    const title = svgElement("title");
    title.textContent = `${region.label} · ${region.terrainType} · ${region.biome}`;
    polygon.append(title);
    elements.regionLayer.append(polygon);
  }

  elements.regionDraft.setAttribute(
    "points",
    pendingRegionBoundary.map(regionSvgPoint).join(" "),
  );
  elements.regionDraftPoints.replaceChildren();
  for (const point of pendingRegionBoundary) {
    const circle = svgElement("circle");
    circle.setAttribute("cx", String(point.x * 1000));
    circle.setAttribute("cy", String(point.z * 700));
    circle.setAttribute("r", "7");
    circle.setAttribute("class", "region-draft-point");
    elements.regionDraftPoints.append(circle);
  }
  elements.regionPointCount.textContent =
    `${pendingRegionBoundary.length} points · add at least 3`;
  elements.undoRegionPoint.disabled = pendingRegionBoundary.length === 0;
  elements.clearRegionPoints.disabled = pendingRegionBoundary.length === 0;
}

function updateObservationTab(kind: string): void {
  activeObservationTab = kind;
  (
    elements.observationForm.elements.namedItem(
      "observationKind",
    ) as HTMLInputElement
  ).value = kind;
  for (const tab of document.querySelectorAll<HTMLButtonElement>(
    "[data-observation-tab]",
  )) {
    const active = tab.dataset.observationTab === kind;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  for (const fields of document.querySelectorAll<HTMLElement>(
    "[data-observation-fields]",
  )) {
    const active = fields.dataset.observationFields === kind;
    fields.hidden = !active;
    for (const control of fields.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
      | HTMLButtonElement
    >("input, select, button")) {
      control.disabled = !active;
    }
  }
  elements.addObservation.textContent =
    kind === "terrain" ? "Add terrain region" : "Add observation";
  if (currentStudy) renderRegionMap(currentStudy);
}

function renderStudyRecords(study: MapStudy): void {
  renderRegionMap(study);
  elements.studyCounts.replaceChildren();
  const counts = [
    ["Landmarks", study.landmarks.length],
    ["Terrain regions", study.terrain.length],
    ["Material notes", study.materials.length],
  ];
  for (const [label, count] of counts) {
    const item = document.createElement("span");
    item.className = "study-count";
    const strong = document.createElement("strong");
    strong.textContent = String(count);
    item.append(strong, ` ${label}`);
    elements.studyCounts.append(item);
  }

  elements.studyRecords.replaceChildren();
  const records = [
    ...study.landmarks.map((record) => ({
      id: record.id,
      label: record.label,
      type: `Landmark · ${record.kind}`,
      kind: "landmarks",
    })),
    ...study.terrain.map((record) => ({
      id: record.id,
      label: record.label,
      type: `Terrain · ${record.terrainType} · ${record.biome} · ${record.boundary.length} points · rel. ${record.relativeElevation.toFixed(2)}`,
      kind: "terrain",
    })),
    ...study.materials.map((record) => ({
      id: record.id,
      label: record.label,
      type: `Material · ${record.materialType} on ${record.usedOn}`,
      kind: "materials",
    })),
  ];

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.className = "study-empty";
    empty.textContent =
      "No observations yet. Trace map-relative terrain regions now; add meter-based landmarks and materials when a trustworthy scale is available.";
    elements.studyRecords.append(empty);
    return;
  }

  for (const record of records) {
    const row = document.createElement("div");
    row.className = "study-record";
    const copy = document.createElement("span");
    copy.className = "study-record-copy";
    const title = document.createElement("strong");
    title.textContent = record.label;
    const detail = document.createElement("small");
    detail.textContent = record.type;
    copy.append(title, detail);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "study-record-delete";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${record.label}`);
    remove.addEventListener("click", () => {
      const mutable = getCurrentStudy();
      if (record.kind === "landmarks") {
        mutable.landmarks = mutable.landmarks.filter(
          (item) => item.id !== record.id,
        );
      } else if (record.kind === "terrain") {
        mutable.terrain = mutable.terrain.filter(
          (item) => item.id !== record.id,
        );
      } else {
        mutable.materials = mutable.materials.filter(
          (item) => item.id !== record.id,
        );
      }
      try {
        persistStudy(mutable);
        void generateWorld();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not update map study.");
      }
    });
    row.append(copy, remove);
    elements.studyRecords.append(row);
  }
}

function persistStudy(study: MapStudy): void {
  updateObservedAt(study);
  try {
    saveMapStudy(study);
    currentStudy = study;
    renderStudyRecords(study);
  } catch (error) {
    throw new Error(
      `Could not save this map study in browser storage: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function formValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value.trim() : "";
}

function formNumber(form: HTMLFormElement, name: string): number {
  const value = Number(formValue(form, name));
  if (!Number.isFinite(value)) {
    throw new Error(`Enter a valid number for ${name}.`);
  }
  return value;
}

function titleFromSeed(seed: string): string {
  const words = seed
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.length
    ? words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join(" ")
    : "Untitled Frontier";
}

async function generateWorld(): Promise<void> {
  elements.generate.disabled = true;
  elements.loading.hidden = false;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  try {
    const settings = readSettings();
    currentStudy = getCurrentStudy();
    builder.build(settings, currentStudy);
    currentSettings = settings;
    elements.worldName.textContent = titleFromSeed(settings.seed);
    elements.worldEdition.textContent = `/ ${selectedEdition()!.id.replaceAll("-", " ").toUpperCase()}`;
    const observationCount =
      currentStudy.landmarks.length +
      currentStudy.terrain.length +
      currentStudy.materials.length;
    const measuredWidthKm =
      (currentStudy.calibration?.widthMeters ?? 0) / 1000;
    const measuredDepthKm =
      (currentStudy.calibration?.depthMeters ?? 0) / 1000;
    elements.worldSubtitle.textContent = observationCount
      ? `${settings.category} · ${observationCount} map observations · ${settings.name}`
      : `${settings.category} · ${biomeLabel(settings.biome)} · reference only: ${settings.name}`;
    elements.statSize.textContent = currentStudy.calibration
      ? `${measuredWidthKm.toFixed(2)} × ${measuredDepthKm.toFixed(2)}`
      : `${settings.scale} × ${settings.scale}`;
    elements.statSizeUnit.textContent = currentStudy.calibration
      ? " KM MEASURED"
      : " KM GENERATED";
    elements.statSeed.textContent = settings.seed.toUpperCase();
    showToast(
      observationCount
        ? `Generated from ${observationCount} saved map observations and procedural fill.`
        : "Generic procedural preview only. Record measured map observations to make this scene reflect the reference.",
    );
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not generate the environment.");
  } finally {
    elements.loading.hidden = true;
    elements.generate.disabled = false;
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileSlug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function exportScene(): Promise<void> {
  if (!currentSettings) {
    showToast("Generate an environment before exporting.");
    return;
  }
  elements.exportScene.disabled = true;
  try {
    const bytes = await builder.exportGlb();
    downloadBlob(
      new Blob([bytes], { type: "model/gltf-binary" }),
      `${fileSlug(titleFromSeed(currentSettings.seed)) || "frontier"}.glb`,
    );
    showToast("GLB environment downloaded.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "GLB export failed.");
  } finally {
    elements.exportScene.disabled = false;
  }
}

function exportManifest(): void {
  if (!currentSettings) {
    showToast("Generate an environment before exporting its settings.");
    return;
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generator: "Fieldcraft World Lab",
    output: "original procedural terrain",
    inspiration: {
      edition: currentSettings.edition,
      catalogMap: currentSettings.name,
      category: currentSettings.category,
    },
    mapStudy: currentStudy
      ? {
          calibration: currentStudy.calibration,
          terrainCoordinates: "normalized-map-relative",
          relativeElevationRange: [-1, 1],
          observationCounts: {
            landmarks: currentStudy.landmarks.length,
            terrainRegions: currentStudy.terrain.length,
            materialDescriptions: currentStudy.materials.length,
          },
        }
      : null,
    settings: currentSettings,
    note: "Map study records are manual observations. Generated geometry and materials are original placeholders; no game assets are included.",
  };
  downloadBlob(
    new Blob([`${JSON.stringify(manifest, null, 2)}\n`], {
      type: "application/json",
    }),
    `${fileSlug(titleFromSeed(currentSettings.seed)) || "frontier"}-manifest.json`,
  );
  showToast("Settings manifest downloaded.");
}

elements.edition.addEventListener("change", populateMaps);
elements.edition.addEventListener("change", () => {
  currentStudy = null;
  pendingRegionBoundary = [];
  try {
    renderRegionMap(getCurrentStudy());
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not load map study.");
  }
});
elements.map.addEventListener("change", () => {
  currentStudy = null;
  pendingRegionBoundary = [];
  const map = selectedMap();
  if (map) {
    elements.worldSubtitle.textContent = `${map.category} · reference selected: ${map.name}`;
    try {
      renderRegionMap(getCurrentStudy());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load map study.");
    }
  }
});
elements.scale.addEventListener("input", () => {
  elements.scaleOutput.value = `${elements.scale.value} km`;
});
elements.relief.addEventListener("input", () => {
  elements.reliefOutput.value = `${elements.relief.value}%`;
});
elements.generate.addEventListener("click", () => void generateWorld());
elements.exportScene.addEventListener("click", () => void exportScene());
elements.exportManifest.addEventListener("click", exportManifest);
elements.randomSeed.addEventListener("click", () => {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  elements.seed.value = `frontier-${values[0]!.toString(36)}-${values[1]!.toString(36)}`;
});
elements.resetCamera.addEventListener("click", () => builder.resetCamera());
elements.wireframe.addEventListener("click", () => {
  const enabled = elements.wireframe.getAttribute("aria-pressed") !== "true";
  elements.wireframe.setAttribute("aria-pressed", String(enabled));
  builder.setWireframe(enabled);
});
elements.importCatalog.addEventListener("click", () => elements.catalogFile.click());
elements.openStudy.addEventListener("click", () => {
  try {
    syncStudyDialog();
    elements.studyDialog.showModal();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not open map study.");
  }
});
elements.closeStudy.addEventListener("click", () => elements.studyDialog.close());
elements.studyDialog.addEventListener("click", (event) => {
  if (event.target === elements.studyDialog) elements.studyDialog.close();
});
elements.regionMap.addEventListener("click", (event) => {
  if (activeObservationTab !== "terrain") return;
  const bounds = elements.regionMap.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;
  pendingRegionBoundary.push({
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    z: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  });
  renderRegionMap(getCurrentStudy());
});
elements.undoRegionPoint.addEventListener("click", () => {
  pendingRegionBoundary.pop();
  renderRegionMap(getCurrentStudy());
});
elements.clearRegionPoints.addEventListener("click", () => {
  pendingRegionBoundary = [];
  renderRegionMap(getCurrentStudy());
});
for (const tab of document.querySelectorAll<HTMLButtonElement>(
  "[data-observation-tab]",
)) {
  tab.addEventListener("click", () => {
    const kind = tab.dataset.observationTab;
    if (kind) updateObservationTab(kind);
  });
}
elements.calibrationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const study = getCurrentStudy();
    const widthValue = formValue(elements.calibrationForm, "widthMeters");
    const depthValue = formValue(elements.calibrationForm, "depthMeters");
    if (!widthValue && !depthValue) {
      if (study.landmarks.length + study.materials.length > 0) {
        throw new Error(
          "Remove meter-based landmarks and materials before clearing the physical scale.",
        );
      }
      study.calibration = null;
      persistStudy(study);
      syncStudyDialog();
      void generateWorld();
      showToast("Physical map scale cleared. Relative regions remain unchanged.");
      return;
    }
    if (!widthValue || !depthValue) {
      throw new Error("Enter both map dimensions, or leave both blank.");
    }
    const widthMeters = formNumber(elements.calibrationForm, "widthMeters");
    const depthMeters = formNumber(elements.calibrationForm, "depthMeters");
    if (widthMeters <= 0 || depthMeters <= 0) {
      throw new Error("Map width and depth must be greater than zero.");
    }
    const observations = [
      ...study.landmarks,
      ...study.materials,
    ];
    if (
      observations.some(
        (observation) =>
          observation.xMeters > widthMeters ||
          observation.zMeters > depthMeters,
      )
    ) {
      throw new Error(
        "The new map bounds exclude saved observations. Update or remove those observations first.",
      );
    }
    study.calibration = {
      widthMeters,
      depthMeters,
      originDescription: formValue(
        elements.calibrationForm,
        "originDescription",
      ),
    };
    persistStudy(study);
    syncStudyDialog();
    void generateWorld();
    showToast("Map scale calibration saved locally.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not save calibration.");
  }
});
elements.observationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const study = getCurrentStudy();
    const label = formValue(elements.observationForm, "label");
    const metadata = {
      id: crypto.randomUUID(),
      label,
      confidence: formValue(
        elements.observationForm,
        "confidence",
      ) as ObservationConfidence,
      notes: formValue(elements.observationForm, "notes"),
    };
    let updatedStudy = study;

    if (activeObservationTab === "terrain") {
      if (pendingRegionBoundary.length < 3) {
        throw new Error("Add at least 3 boundary points on the overhead map.");
      }
      const region: TerrainRegionObservation = {
        ...metadata,
        terrainType: formValue(
          elements.observationForm,
          "terrainType",
        ) as TerrainRegionObservation["terrainType"],
        biome: formValue(elements.observationForm, "biome"),
        boundary: pendingRegionBoundary.map((point) => ({ ...point })),
        relativeElevation: formNumber(
          elements.observationForm,
          "relativeElevation",
        ),
      };
      updatedStudy = {
        ...study,
        terrain: [...study.terrain, region],
      };
      if (!isMapStudy(updatedStudy)) {
        throw new Error(
          "The region outline is invalid. Avoid crossing or overlapping its own boundary.",
        );
      }
    } else {
      if (!study.calibration) {
        throw new Error(
          "Save a trustworthy physical scale before adding meter-based landmarks or materials.",
        );
      }
      const xMeters = formNumber(elements.observationForm, "xMeters");
      const zMeters = formNumber(elements.observationForm, "zMeters");
      if (
        xMeters < 0 ||
        xMeters > study.calibration.widthMeters ||
        zMeters < 0 ||
        zMeters > study.calibration.depthMeters
      ) {
        throw new Error(
          "The observation coordinates must fall inside calibrated map bounds.",
        );
      }
      const base = { ...metadata, xMeters, zMeters };
      if (activeObservationTab === "landmark") {
        const widthMeters = formNumber(elements.observationForm, "widthMeters");
        const depthMeters = formNumber(elements.observationForm, "depthMeters");
        const heightMeters = formNumber(elements.observationForm, "heightMeters");
        if (widthMeters <= 0 || depthMeters <= 0 || heightMeters <= 0) {
          throw new Error(
            "Landmark width, depth, and height must be greater than zero.",
          );
        }
        study.landmarks.push({
          ...base,
          kind: formValue(elements.observationForm, "kind") as
            | "building"
            | "tree"
            | "rock"
            | "structure"
            | "other",
          elevationMeters: formNumber(
            elements.observationForm,
            "elevationMeters",
          ),
          widthMeters,
          depthMeters,
          heightMeters,
          rotationDegrees: formNumber(
            elements.observationForm,
            "rotationDegrees",
          ),
        });
      } else {
        const widthMeters = formNumber(elements.observationForm, "widthMeters");
        const depthMeters = formNumber(elements.observationForm, "depthMeters");
        if (widthMeters <= 0 || depthMeters <= 0) {
          throw new Error(
            "Observed area width and depth must be greater than zero.",
          );
        }
        study.materials.push({
          ...base,
          materialType: formValue(
            elements.observationForm,
            "materialType",
          ) as "ground" | "rock" | "wood" | "water" | "metal" | "other",
          usedOn: formValue(elements.observationForm, "usedOn") as
            | "terrain"
            | "building"
            | "vegetation"
            | "rock"
            | "water"
            | "other",
          approximateColor: formValue(
            elements.observationForm,
            "approximateColor",
          ),
          appearance: formValue(elements.observationForm, "appearance"),
          widthMeters,
          depthMeters,
        });
      }
    }

    persistStudy(updatedStudy);
    if (activeObservationTab === "terrain") {
      pendingRegionBoundary = [];
      renderRegionMap(updatedStudy);
    }
    (elements.observationForm.elements.namedItem("label") as HTMLInputElement).value = "";
    (elements.observationForm.elements.namedItem("notes") as HTMLInputElement).value = "";
    void generateWorld();
    showToast("Observation saved in this browser and applied to the generated scene.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not save observation.");
  }
});
elements.exportStudy.addEventListener("click", () => {
  try {
    const study = getCurrentStudy();
    downloadBlob(
      new Blob([`${JSON.stringify(study, null, 2)}\n`], {
        type: "application/json",
      }),
      `${fileSlug(study.editionId)}-${fileSlug(study.mapName)}-study.json`,
    );
    showToast("Map study JSON exported.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not export map study.");
  }
});
elements.studyFile.addEventListener("change", async () => {
  const file = elements.studyFile.files?.[0];
  if (!file) return;
  try {
    const study = parseStudyFile(await file.text());
    if (
      study.editionId !== selectedEdition()?.id ||
      study.mapId !== selectedMap()?.id
    ) {
      throw new Error("This study belongs to a different edition or map.");
    }
    persistStudy(study);
    syncStudyDialog();
    void generateWorld();
    showToast(`Imported observations from ${file.name}.`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Map study import failed.");
  } finally {
    elements.studyFile.value = "";
  }
});
elements.catalogFile.addEventListener("change", async () => {
  const file = elements.catalogFile.files?.[0];
  if (!file) return;

  try {
    populateEditions(await loadCatalog(file), file.name);
    await generateWorld();
    showToast(`Loaded ${file.name}.`);
  } catch (error) {
    setCatalogStatus(
      error instanceof Error ? error.message : "Could not load catalog.",
      true,
    );
    showToast("Catalog import failed. Check the JSON file and try again.");
  } finally {
    elements.catalogFile.value = "";
  }
});

async function initialize(): Promise<void> {
  try {
    populateEditions(await loadCatalog());
    await generateWorld();
  } catch (error) {
    setCatalogStatus(
      error instanceof Error ? error.message : "Catalog could not be loaded.",
      true,
    );
    showToast("The map catalog failed to load.");
  }
}

void initialize();
