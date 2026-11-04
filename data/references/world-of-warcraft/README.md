# World of Warcraft references

Keep one study per edition and catalog map ID. Export it from the browser's
**Map study** dialog, then place the JSON here as
`<edition-id>/<map-id>/study.json`. Browser storage is local to that browser and
does not sync to GitHub Pages.

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
