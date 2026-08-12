# Ahara Source Viewer

Grafana panel for immutable source retained with a Qlty scan. It reads the first
row of a datasource frame with these fields:

- `repo`, `commit`, `path`, `language`, and `source`
- `start_line` and `end_line`
- `selection_kind`, `selection_label`, `selection_cognitive`, and
  `selection_cyclomatic`
- `finding_annotations`, a JSON array of Qlty findings with source locations,
  severity, rule, category, effort, and message

The panel labels and highlights the selected complexity range, renders every
Qlty finding in a visible annotation rail and source gutter, and links to the
same line at the analyzed Git commit. It explicitly distinguishes files with no
Qlty findings from failures to load finding data.
