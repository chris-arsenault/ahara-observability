import assert from "node:assert/strict";
import test from "node:test";
import {
  findingTone,
  findingsForLine,
  findingsOverlappingRange,
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

test("scopes annotations to findings that overlap the selected range", () => {
  const findings = parseFindingAnnotations([
    { startLine: 3, endLine: 8, level: "medium", message: "Before and inside" },
    { startLine: 12, endLine: 14, level: "high", message: "Inside" },
    { startLine: 20, endLine: 22, level: "low", message: "After" },
  ]);

  assert.deepEqual(
    findingsOverlappingRange(findings, 7, 15).map((finding) => finding.message),
    ["Before and inside", "Inside"]
  );
});

test("normalizes severities and source language aliases", () => {
  assert.equal(findingTone("high"), "error");
  assert.equal(findingTone("medium"), "warning");
  assert.equal(findingTone("low"), "note");
  assert.equal(findingTone("unknown"), "note");
  assert.equal(sourceLanguage("language_tsx"), "typescript");
  assert.equal(sourceLanguage("Rust"), "rust");
});
