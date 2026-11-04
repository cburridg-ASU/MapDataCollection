# MapDataCollection

MapDataCollection catalogs map labels from [noclip.website](https://noclip.website/)
and uses those labels as optional inspiration for an original, procedural
Three.js environment. The browser app does not download, reproduce, or require
World of Warcraft game assets.

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite in a modern WebGL-capable browser. The app loads
`data/catalog/world-of-warcraft.json` by default. **Import catalog** accepts
another JSON catalog with the same schema; it is read in the browser and is not
uploaded to a server.

Choose a release and map label, then adjust the biome, seed, scale, relief,
vegetation, and ruins. **Generate environment** rebuilds the scene. Drag to
orbit, scroll to zoom, and right-drag to pan. Export the generated scene as GLB
or download its JSON settings manifest.

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
