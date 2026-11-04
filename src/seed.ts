export function proceduralSeed(
  worldSeed: string,
  editionId: string,
  mapId: string,
): number {
  const input = `${worldSeed}|${editionId}|${mapId}`;
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value = Math.imul(value ^ input.charCodeAt(index), 16777619);
  }
  return value >>> 0;
}
