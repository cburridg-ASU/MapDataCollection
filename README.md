# MapDataCollection

Choose a reference map and press **Generate**. The builder uses the matching
study in `data/references/world-of-warcraft/` when one exists. Maps without
collected observations produce a generic procedural preview, clearly labeled
as such; the map-name catalog alone does not provide geography.

The current repository has no committed map studies yet. Do not treat generated
previews for unstudied maps as data-based reconstructions.

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
Studies contain normalized terrain/biome regions and optional calibrated
measurements, landmarks, and material descriptions. The app loads committed
studies at build time.

## GitHub Pages

The `.github/workflows/pages.yml` workflow builds and deploys `dist` to GitHub
Pages. Set **Settings → Pages → Build and deployment → Source** to **GitHub
Actions**.
