import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const siteUrl = "https://noclip.website/";
const editions = [
  { id: "classic", title: "World of Warcraft" },
  {
    id: "the-burning-crusade",
    title: "World of Warcraft: The Burning Crusade",
  },
  {
    id: "wrath-of-the-lich-king",
    title: "World of Warcraft: Wrath of the Lich King",
  },
];
const outputPath = resolve("data/catalog/world-of-warcraft.json");

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function collectEdition(page, edition) {
  await page.getByText(edition.title, { exact: true }).click();
  await page.waitForFunction(
    (title) =>
      [...document.querySelectorAll(".text")].some(
        (element) =>
          element.textContent.trim() === title &&
          element.parentElement?.parentElement?.style.backgroundColor ===
            "rgb(210, 30, 30)",
      ),
    edition.title,
  );
  await page.waitForTimeout(500);

  const maps = await page.evaluate(() => {
    const scrollLists = [...document.querySelectorAll("div")].filter(
      (element) =>
        element.clientHeight > 100 &&
        element.scrollHeight > element.clientHeight + 30 &&
        [...element.children].some((child) =>
          child.matches('[data-header="1"]'),
        ),
    );
    const mapList = scrollLists.find(
      (element) => !element.innerText.includes("World of Warcraft"),
    );

    if (!mapList) {
      throw new Error("Could not locate the selected edition's map list.");
    }

    let category = "Uncategorized";
    const entries = [];

    for (const row of mapList.children) {
      if (row.matches('[data-header="1"]')) {
        category =
          row.querySelector(".header")?.innerText
            .trim()
            .replace(/^-\s*/, "") || "Uncategorized";
        continue;
      }

      const name = row.querySelector(".text")?.innerText.trim();
      if (name) {
        entries.push({ name, category });
      }
    }

    return entries;
  });

  if (maps.length === 0) {
    throw new Error(`No map labels were found for "${edition.title}".`);
  }

  const idCounts = new Map();
  return {
    ...edition,
    maps: maps.map(({ name, category }) => {
      const baseId =
        `${slugify(category) || "uncategorized"}/${slugify(name) || "map"}`;
      const count = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}-${count}`;
      return { id, name, category };
    }),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage();
    await page.goto(siteUrl, { waitUntil: "domcontentloaded" });

    const collectedEditions = [];
    for (const edition of editions) {
      collectedEditions.push(await collectEdition(page, edition));
    }

    const catalog = {
      schemaVersion: 1,
      source: siteUrl,
      collectedAt: new Date().toISOString(),
      scope: "Map labels and categories only; no scene or game assets.",
      editions: collectedEditions,
    };

    await mkdir(dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`);
    await rename(temporaryPath, outputPath);
    console.log(
      `Wrote ${collectedEditions.reduce((total, edition) => total + edition.maps.length, 0)} map labels to ${outputPath}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("World of Warcraft catalog collection failed:", error);
  process.exitCode = 1;
});
