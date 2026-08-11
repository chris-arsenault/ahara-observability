# Ahara Source Viewer

Grafana panel for immutable source retained with a Qlty scan. It reads the first
row of a datasource frame with these fields:

- `repo`, `commit`, `path`, `language`, and `source`
- `start_line` and `end_line`
- `hotspot_lines`, a JSON array of `{startLine, endLine, level, message}`

The panel highlights the selected range, overlays every Qlty finding for the
file, and links to the same line at the analyzed Git commit.
