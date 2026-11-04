# MapDataCollection

Choose a studied reference map and press **Generate**. The builder only offers
maps with a committed terrain study and shapes its terrain to that study's
irregular zone boundary and observed terrain regions. It does not generate a
generic fallback for maps without data.

The dataset contains 20 low-confidence studies across Classic, The Burning
Crusade, and Wrath of the Lich King. Their zone outlines, terrain subregions,
generic feature footprints, and spacing are estimates for testing the
data-driven workflow, not surveyed measurements or geometry extracted from
Noclip. Each 31.2 km calibration is the documented WoW map-coordinate grid,
not the playable-zone size. Terrain height is relative, not absolute elevation.

Coverage: Classic (Dun Morogh, Elwynn Forest, Westfall, Duskwood, Stranglethorn
Vale, Mulgore, Durotar, Ashenvale); The Burning Crusade (Hellfire Peninsula,
Zangarmarsh, Nagrand, Shadowmoon Valley, Terokkar Forest, Netherstorm); Wrath
of the Lich King (Borean Tundra, Howling Fjord, Grizzly Hills, Sholazar Basin,
Zul'Drak, Storm Peaks).

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
ground material categories, vegetation density, generic feature footprints,
and estimated spacing. The app loads committed studies at build time and only
offers maps with complete zone and terrain data. Review each study's
`sources`, `summary`, and observation notes before treating its estimates as
reference measurements.

## GitHub Pages

The `.github/workflows/pages.yml` workflow builds and deploys `dist` to GitHub
Pages. Set **Settings → Pages → Build and deployment → Source** to **GitHub
Actions**.
