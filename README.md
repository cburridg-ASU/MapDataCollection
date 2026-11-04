# MapDataCollection

Choose a studied reference map and press **Generate**. The builder only offers
maps with a committed terrain study and shapes its terrain to that study's
irregular zone boundary and observed terrain regions. It does not generate a
generic fallback for maps without data.

The current dataset contains one low-confidence pilot for Ironforge / Dun
Morogh. Its playable-zone outline and settlement spacing are approximate; its
31.2 km extent is the documented WoW map-coordinate grid, not a surveyed zone
footprint. The terrain height is relative, not absolute elevation.

## Run locally

```powershell
npm install
npm run dev
```

Generated geometry, materials, and vegetation are original placeholders. Do not
add game textures, models, or screenshots to this repository.

## Add map studies

Place validated study JSON at
`data/references/world-of-warcraft/<edition-id>/<map-id>/study.json`.
Studies contain zone and terrain polygons, normalized roughness/elevation,
ground material categories, vegetation density, and optional measurements and
landmark spacing. The app loads committed studies at build time and only offers
maps with complete zone and terrain data.

## GitHub Pages

The `.github/workflows/pages.yml` workflow builds and deploys `dist` to GitHub
Pages. Set **Settings → Pages → Build and deployment → Source** to **GitHub
Actions**.
