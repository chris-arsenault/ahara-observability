# Ahara Source Viewer

Grafana panel for immutable source retained with a Qlty scan. It reads the first
row of a datasource frame with these fields:

- `repo`, `commit`, `path`, `language`, and `source`
- `start_line` and `end_line`
- `selection_kind`, `selection_label`, `selection_cognitive`, and
  `selection_cyclomatic`
- `finding_annotations`, a JSON array of Qlty findings with source locations,
  severity, rule, category, effort, and message

The panel labels and highlights the selected range. File selections render all
Qlty findings; function and issue selections initially render only findings
that overlap the selected range, with an explicit control to show the rest of
the file. It links to the same line at the analyzed Git commit and distinguishes
an empty range, a clean file, and a failure to load finding data.
