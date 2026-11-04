import "./style.css";
import { loadCatalog, type CatalogEdition, type CatalogMap } from "./catalog";
import { getBundledMapStudy } from "./map-study-corpus";
import type { MapStudy } from "./map-study";
import { WorldBuilder, type BiomeId, type WorldSettings } from "./world-builder";

const elements = {
  map: document.querySelector<HTMLSelectElement>("#map-select")!,
  generate: document.querySelector<HTMLButtonElement>("#generate-world")!,
  status: document.querySelector<HTMLElement>("#data-status")!,
  mapName: document.querySelector<HTMLElement>("#map-name")!,
  loading: document.querySelector<HTMLElement>("#loading-state")!,
  error: document.querySelector<HTMLElement>("#error-message")!,
};

const builder = new WorldBuilder(
  document.querySelector<HTMLCanvasElement>("#world-canvas")!,
);

interface MapChoice {
  edition: CatalogEdition;
  map: CatalogMap;
}

const mapChoices = new Map<string, MapChoice>();
let selectedStudy: MapStudy | undefined;

function mapKey(editionId: string, mapId: string): string {
  return `${editionId}|${mapId}`;
}

function selectedChoice(): MapChoice | undefined {
  return mapChoices.get(elements.map.value);
}

function studyObservationCount(study: MapStudy): number {
  return (
    study.landmarks.length +
    study.terrain.length +
    study.materials.length
  );
}

function setStudyStatus(choice: MapChoice): void {
  selectedStudy = getBundledMapStudy(choice.edition.id, choice.map.id);
  const count = selectedStudy ? studyObservationCount(selectedStudy) : 0;
  if (count) {
    elements.status.textContent = `${count} collected observations`;
  } else if (selectedStudy?.calibration) {
    elements.status.textContent = "Calibrated bounds; no terrain observations.";
  } else {
    elements.status.textContent =
      "No collected study; this map will use generic procedural terrain.";
  }
}

function biomeForStudy(study: MapStudy | undefined): BiomeId {
  const description = study?.terrain.map((region) => region.biome).join(" ");
  if (/tundra|snow|ice|frost|glacier/i.test(description ?? "")) return "tundra";
  if (/desert|sand|arid|badland/i.test(description ?? "")) return "desert";
  if (/swamp|marsh|wetland|bog|fen/i.test(description ?? "")) return "swamp";
  if (/arcane|crystal|magic/i.test(description ?? "")) return "arcane";
  if (/fel|corrupt|demonic/i.test(description ?? "")) return "fel";
  return "temperate";
}

function createSettings(choice: MapChoice): WorldSettings {
  return {
    editionId: choice.edition.id,
    mapId: choice.map.id,
    name: choice.map.name,
    category: choice.map.category,
    edition: choice.edition.title,
    seed: `generation-${crypto.randomUUID()}`,
    scale: 240,
    relief: 42,
    biome: biomeForStudy(selectedStudy),
    vegetation: true,
    ruins: true,
  };
}

async function generateMap(): Promise<void> {
  const choice = selectedChoice();
  if (!choice) return;

  elements.generate.disabled = true;
  elements.loading.hidden = false;
  elements.error.hidden = true;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => resolve()),
  );

  try {
    builder.build(createSettings(choice), selectedStudy ?? null);
    elements.mapName.textContent = `${choice.map.name} · ${choice.edition.title}`;
  } catch (error) {
    elements.error.textContent =
      error instanceof Error ? error.message : "Could not generate this map.";
    elements.error.hidden = false;
  } finally {
    elements.loading.hidden = true;
    elements.generate.disabled = false;
  }
}

function populateMaps(editions: CatalogEdition[]): void {
  elements.map.replaceChildren();
  mapChoices.clear();

  for (const edition of editions) {
    const group = document.createElement("optgroup");
    group.label = edition.title;
    for (const map of edition.maps) {
      const key = mapKey(edition.id, map.id);
      mapChoices.set(key, { edition, map });
      const option = document.createElement("option");
      option.value = key;
      option.textContent = map.name;
      group.append(option);
    }
    elements.map.append(group);
  }

  elements.map.disabled = mapChoices.size === 0;
  elements.generate.disabled = mapChoices.size === 0;
  const choice = selectedChoice();
  if (choice) setStudyStatus(choice);
}

elements.map.addEventListener("change", () => {
  const choice = selectedChoice();
  if (choice) setStudyStatus(choice);
});
elements.generate.addEventListener("click", () => void generateMap());

void loadCatalog()
  .then((catalog) => populateMaps(catalog.editions))
  .catch((error: unknown) => {
    elements.map.replaceChildren();
    elements.map.disabled = true;
    elements.generate.disabled = true;
    elements.status.textContent =
      error instanceof Error ? error.message : "Could not load map catalog.";
  });
