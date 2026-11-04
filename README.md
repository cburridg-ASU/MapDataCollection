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

Choose an edition and map, then open **Map study**. Record calibrated bounds,
then add landmark dimensions and positions, terrain/biome regions, and
descriptive material observations with approximate colors. Coordinates use
meters, with the origin at the northwest corner, +X east/right, +Z south/down,
and elevation upward. Use **Export map study JSON** to back up your
observations; data is autosaved in the current browser only.

The generator uses measured bounds for the scene extents, terrain regions for
elevation and biome coloring, material descriptions for approximate original
colors, and landmark dimensions/positions for simple 3D blockouts. Unobserved
areas still use procedural terrain, vegetation, and structures. This is a
manual transcription aid, not an automatic extractor or a faithful
reconstruction. Texture files are not copied or uploaded; material observations
are text descriptions and approximate color swatches only.

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
