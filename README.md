# MapDataCollection

MapDataCollection catalogs map labels from [noclip.website](https://noclip.website/)
and provides a manual observation workspace for recording map scale, landmarks,
terrain and biome regions, and material descriptions for original procedural
Three.js blockouts. Catalog labels alone do not describe map geography.

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite in a modern WebGL-capable browser. The app loads
`data/catalog/world-of-warcraft.json` by default. **Import catalog** accepts
another JSON catalog with the same schema; it is read in the browser and is not
uploaded to a server.

Choose an edition and map, then open **Map study**. Terrain and biome regions
are traced as arbitrary polygons on a schematic overhead canvas using the
source map as a visual reference; the canvas does not contain source-map
imagery. Their horizontal coordinates run from 0 to 1 across each map, and
their elevation is relative to the generator's relief range, not a meter value.
This works without knowing the map's real-world dimensions. Enter physical
width and depth only when a trustworthy scale reference is available;
meter-based landmark and material notes require that calibration. Use
**Export map study JSON** to back up observations; data is autosaved in the
current browser only.

The generator uses measured bounds when available, polygon regions for terrain
shape and original biome palettes, material descriptions for approximate
original colors, and calibrated landmark dimensions/positions for simple 3D
blockouts. Unobserved areas still use procedural terrain, vegetation, and
structures. Map-relative polygons retain their shape when no physical scale is
known, and provide a basis for future map-to-map layout and overhead viewing;
they do not yet define how separate maps connect. This is a manual
transcription aid, not an automatic extractor or a faithful reconstruction.
Texture files are not copied or uploaded; material observations are text
descriptions and approximate color swatches only.

To keep exported studies in version control, save them under
`data/references/world-of-warcraft/<edition-id>/<map-id>/study.json`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys the site when
changes are pushed to `main` (or when manually triggered). In the repository's
**Settings → Pages**, set the build and deployment source to **GitHub Actions**.
The Vite base path is configured for this repository name.

## Data layout

- `data/catalog/` — version-controlled catalog metadata.
- `data/references/world-of-warcraft/` — notes and permitted references.
- `data/source/` — local-only, rights-cleared source material; ignored by Git.
- `data/derived/world-of-warcraft/` — manifests and original reconstruction
  work, organized by edition and map ID.
- `scripts/` — Playwright automation for catalog metadata only.

Refresh the catalog with:

```powershell
npx playwright install chromium
npm run catalog:wow
```

The catalog collector uses the site's interface and records map names and
categories only. Check the site's terms and your rights before collecting or
using any material.
