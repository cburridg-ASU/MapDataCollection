import "./style.css";
import { loadCatalog, type CatalogEdition, type CatalogMap } from "./catalog";
import { getAvailableMapStudies } from "./map-study-corpus";
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
  study: MapStudy;
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
    study.materials.length +
    (study.landmarkDistances?.length ?? 0)
  );
}

function setStudyStatus(choice: MapChoice): void {
  selectedStudy = choice.study;
  const count = studyObservationCount(selectedStudy);
  elements.status.textContent =
    `${selectedStudy.terrain.length} estimated terrain regions · ` +
    `${selectedStudy.landmarks.length} generic footprints · ` +
    `${count} low-confidence estimates`;
}

function biomeForStudy(study: MapStudy): BiomeId {
  const description = study.terrain.map((region) => region.biome).join(" ");
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
    biome: biomeForStudy(choice.study),
    vegetation: true,
    ruins: false,
  };
}

async function generateMap(): Promise<void> {
  const choice = selectedChoice();
  if (!choice || !selectedStudy) return;

  elements.generate.disabled = true;
  elements.loading.hidden = false;
  elements.error.hidden = true;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  try {
    builder.build(createSettings(choice), selectedStudy);
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

function populateMaps(
  editions: CatalogEdition[],
  studies: MapStudy[],
): void {
  elements.map.replaceChildren();
  mapChoices.clear();
  const studiesByMap = new Map(
    studies.map((study) => [`${study.editionId}|${study.mapId}`, study]),
  );

  for (const edition of editions) {
    const availableMaps = edition.maps.filter((map) =>
      studiesByMap.has(mapKey(edition.id, map.id)),
    );
    if (availableMaps.length === 0) continue;

    const group = document.createElement("optgroup");
    group.label = edition.title;
    for (const map of availableMaps) {
      const key = mapKey(edition.id, map.id);
      mapChoices.set(key, {
        edition,
        map,
        study: studiesByMap.get(key)!,
      });
      const option = document.createElement("option");
      option.value = key;
      option.textContent = map.name;
      group.append(option);
    }
    elements.map.append(group);
  }

  if (mapChoices.size === 0) {
    const option = document.createElement("option");
    option.textContent = "No collected map data";
    elements.map.append(option);
    elements.status.textContent =
      "No complete map studies are available. Generation is disabled until data is added.";
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
  .then((catalog) => populateMaps(catalog.editions, getAvailableMapStudies()))
  .catch((error: unknown) => {
    elements.map.replaceChildren();
    elements.map.disabled = true;
    elements.generate.disabled = true;
    elements.status.textContent =
      error instanceof Error ? error.message : "Could not load map catalog.";
  });
