import { isMapStudy, type MapStudy } from "./map-study";

const studyFiles = import.meta.glob<unknown>(
  "../data/references/world-of-warcraft/**/study.json",
  { eager: true, import: "default" },
);

const studies = new Map<string, MapStudy>();

for (const [filePath, value] of Object.entries(studyFiles)) {
  if (!isMapStudy(value)) {
    throw new Error(`Bundled map study at "${filePath}" has an unsupported format.`);
  }

  const expectedSuffix = `/world-of-warcraft/${value.editionId}/${value.mapId}/study.json`;
  if (!filePath.replaceAll("\\", "/").endsWith(expectedSuffix)) {
    throw new Error(`Bundled map study at "${filePath}" does not match its catalog IDs.`);
  }

  const key = `${value.editionId}:${value.mapId}`;
  if (studies.has(key)) {
    throw new Error(`More than one bundled study exists for "${key}".`);
  }
  studies.set(key, value);
}

export function getBundledMapStudy(
  editionId: string,
  mapId: string,
): MapStudy | undefined {
  const study = studies.get(`${editionId}:${mapId}`);
  return study ? structuredClone(study) : undefined;
}
