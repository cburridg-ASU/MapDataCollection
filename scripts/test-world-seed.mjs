import assert from "node:assert/strict";
import { proceduralSeed } from "../src/seed.ts";

const base = proceduralSeed(
  "ashen-reach-07",
  "classic",
  "eastern-kingdoms/ironforge-dun-morogh",
);

assert.equal(
  base,
  proceduralSeed(
    "ashen-reach-07",
    "classic",
    "eastern-kingdoms/ironforge-dun-morogh",
  ),
  "The same world seed and map should reproduce the same terrain seed.",
);
assert.notEqual(
  base,
  proceduralSeed(
    "ashen-reach-07",
    "classic",
    "eastern-kingdoms/stormwind-elwynn-forest",
  ),
  "Changing the selected map should change the terrain seed.",
);
assert.notEqual(
  base,
  proceduralSeed(
    "ashen-reach-07",
    "the-burning-crusade",
    "eastern-kingdoms/ironforge-dun-morogh",
  ),
  "Changing the selected edition should change the terrain seed.",
);

console.log("Procedural seed selection tests passed.");
