# World of Warcraft references

Keep one study per edition and catalog map ID. Export it from the browser's
**Map study** dialog, then place the JSON here as
`<edition-id>/<map-id>/study.json`. Browser storage is local to that browser and
does not sync to GitHub Pages.

The schema records:

- map bounds in meters and the origin description;
- landmark kind, coordinates, dimensions, elevation, orientation, and confidence;
- rectangular terrain/biome regions with elevation and confidence;
- material/texture descriptions, approximate colors, use, and observed extents.

Coordinates use a northwest origin, +X east/right, +Z south/down, and elevation
upward. Record the measurement method and uncertainty in notes. Material
observations are descriptive metadata; do not place copyrighted game texture
files in this public repository.
