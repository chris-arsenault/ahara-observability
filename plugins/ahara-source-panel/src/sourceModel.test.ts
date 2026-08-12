import assert from "node:assert/strict";
import test from "node:test";
import {
  findingTone,
  findingsForLine,
  parseFindingAnnotations,
  sourceLanguage,
  strongestFindingTone,
} from "./sourceModel.ts";

test("parses and orders Grafana finding annotation data", () => {
  const findings = parseFindingAnnotations(
    JSON.stringify([
      { startLine: 20, level: "warning", message: "Nested branch" },
      { startLine: 4, endLine: 6, level: "error", message: "Complex function" },
      { startLine: 0, message: "Invalid location" },
    ])
  );

  assert.deepEqual(
    findings.map(({ startLine, endLine }) => [startLine, endLine]),
    [
      [4, 6],
      [20, 20],
    ]
  );
});

test("finds every annotation that covers a source line", () => {
  const findings = parseFindingAnnotations([
    { startLine: 3, endLine: 8, level: "warning", message: "First" },
    { startLine: 5, endLine: 5, level: "error", message: "Second" },
  ]);

  assert.equal(findingsForLine(findings, 5).length, 2);
  assert.equal(findingsForLine(findings, 9).length, 0);
  assert.equal(strongestFindingTone(findingsForLine(findings, 5)), "error");
});

test("normalizes severities and source language aliases", () => {
  assert.equal(findingTone("warning"), "warning");
  assert.equal(findingTone("unknown"), "note");
  assert.equal(sourceLanguage("language_tsx"), "typescript");
  assert.equal(sourceLanguage("Rust"), "rust");
});
