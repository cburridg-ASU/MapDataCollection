# World of Warcraft references

Keep one study per edition and catalog map ID at
`<edition-id>/<map-id>/study.json`. Studies in this folder are loaded by the
builder automatically. Browser-local observations override the bundled copy
for that browser; export them from **Map study** and replace the committed JSON
to publish them. Browser storage does not sync to GitHub Pages.

Do not add map-wide boundaries, physical dimensions, or placements unless the
reference view supports them. Record confidence and evidence limits in each
observation; maps without a trustworthy study remain uncollected.

Schema version 2 records:

- optional map bounds in meters and the scale reference;
- landmark kind, coordinates, dimensions, elevation, orientation, and confidence;
- arbitrary polygon terrain/biome regions in map-relative normalized coordinates,
  with relative elevation and confidence;
- material/texture descriptions, approximate colors, use, and observed extents.

Meter-based landmark and material observations use a northwest origin, +X
east/right, +Z south/down, and elevation upward. Polygon vertices use a
per-map 0-to-1 coordinate range; relative elevation ranges from -1 to 1 across
the generator's configured relief, not meters. Physical map dimensions are
optional and should only be recorded with a trustworthy scale reference.

Separate map studies remain independent. Their normalized boundaries preserve
the map shape for future overhead layouts, but no inter-map placement or
adjacency is inferred yet. Material observations are descriptive metadata; do
not place copyrighted game texture files in this public repository.
