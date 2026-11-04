import catalogUrl from "../data/catalog/world-of-warcraft.json?url";

export interface CatalogMap {
  id: string;
  name: string;
  category: string;
}

export interface CatalogEdition {
  id: string;
  title: string;
  maps: CatalogMap[];
}

export interface WorldCatalog {
  schemaVersion: number;
  editions: CatalogEdition[];
}

function isCatalog(value: unknown): value is WorldCatalog {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorldCatalog>;
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.editions) &&
    candidate.editions.every(
      (edition) =>
        edition !== null &&
        typeof edition === "object" &&
        typeof edition.id === "string" &&
        typeof edition.title === "string" &&
        Array.isArray(edition.maps) &&
        edition.maps.every(
          (map) =>
            map !== null &&
            typeof map === "object" &&
            typeof map.id === "string" &&
            typeof map.name === "string" &&
            typeof map.category === "string",
        ),
    )
  );
}

export async function loadCatalog(file?: File): Promise<WorldCatalog> {
  const response = file
    ? undefined
    : await fetch(catalogUrl, { cache: "no-cache" });

  if (response && !response.ok) {
    throw new Error(`Catalog request failed (${response.status}).`);
  }

  const raw: unknown = file
    ? JSON.parse(await file.text())
    : await response!.json();

  if (!isCatalog(raw) || raw.editions.length === 0) {
    throw new Error("The selected file is not a supported map catalog.");
  }

  return raw;
}
