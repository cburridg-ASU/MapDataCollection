import "./style.css";
import { loadCatalog, type CatalogEdition, type CatalogMap, type WorldCatalog } from "./catalog";
import {
  biomeLabel,
  WorldBuilder,
  type BiomeId,
  type WorldSettings,
} from "./world-builder";

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
};

const builder = new WorldBuilder(
  document.querySelector<HTMLCanvasElement>("#world-canvas")!,
);

let editions: CatalogEdition[] = [];
let currentSettings: WorldSettings | null = null;
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
    builder.build(settings);
    currentSettings = settings;
    elements.worldName.textContent = titleFromSeed(settings.seed);
    elements.worldEdition.textContent = `/ ${selectedEdition()!.id.replaceAll("-", " ").toUpperCase()}`;
    elements.worldSubtitle.textContent = `${settings.category} · ${biomeLabel(settings.biome)} · inspired by ${settings.name}`;
    elements.statSize.textContent = `${settings.scale} × ${settings.scale}`;
    elements.statSeed.textContent = settings.seed.toUpperCase();
    showToast("Environment generated from your settings.");
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
    settings: currentSettings,
    note: "Catalog labels are references only. No game assets are included.",
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
elements.map.addEventListener("change", () => {
  const map = selectedMap();
  if (map) {
    elements.worldSubtitle.textContent = `${map.category} · inspiration: ${map.name}`;
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
