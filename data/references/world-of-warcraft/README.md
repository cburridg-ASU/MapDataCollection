# World of Warcraft references

Keep one study per edition and catalog map ID at
`<edition-id>/<map-id>/study.json`. Studies in this folder are loaded by the
builder automatically. Browser-local observations override the bundled copy
for that browser; export them from **Map study** and replace the committed JSON
to publish them. Browser storage does not sync to GitHub Pages.

The current 20-study pilot corpus includes low-confidence concept estimates so
the data-driven generator can be exercised across varied zones. These outlines,
terrain regions, generic footprints, and spacing estimates are not surveyed or
extracted from Noclip. Keep that caveat in each study, and do not treat nominal
map-grid extents as playable-zone dimensions. Replace estimates with
map-supported observations as stronger references are reviewed.

Schema version 2 records:

- the reference coordinate frame in meters and its scale source;
- an irregular polygon for the playable zone and polygons for terrain/biome areas;
- relative elevation, roughness, vegetation density, and ground-material
  categories for each terrain area;
- generic landmark footprints and estimated point-to-point distances;
- material descriptions, approximate colors, use, and provenance.

Meter-based landmark and material observations use a northwest origin, +X
east/right, +Z south/down, and elevation upward. Polygon vertices use a
per-map 0-to-1 coordinate range; relative elevation ranges from -1 to 1 across
the generator's configured relief, not meters. Any nominal coordinate-grid extent must not be presented as the exact playable
zone size. Use confidence and notes to distinguish map-derived estimates from
measured values.

Separate map studies remain independent. Their normalized boundaries preserve
the map shape for future overhead layouts, but no inter-map placement or
adjacency is inferred yet. Material observations are descriptive metadata; do
not place copyrighted game texture files in this public repository.
