import { DataFrame, PanelProps } from "@grafana/data";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import kotlin from "highlight.js/lib/languages/kotlin";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import vbnet from "highlight.js/lib/languages/vbnet";
import React, { useEffect, useMemo, useRef } from "react";
import {
  findingTone,
  findingsForLine,
  parseFindingAnnotations,
  sourceLanguage,
  strongestFindingTone,
} from "./sourceModel";
import { SourcePanelOptions } from "./types";

hljs.registerLanguage("c", cpp);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("php", php);
hljs.registerLanguage("python", python);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("vbnet", vbnet);

function firstValue(frame: DataFrame, name: string): unknown {
  const field = frame.fields.find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase()
  );
  if (!field || field.values.length === 0) {
    return undefined;
  }
  return field.values[0];
}

function textValue(frame: DataFrame, name: string): string {
  const value = firstValue(frame, name);
  return value === null || value === undefined ? "" : String(value);
}

function numberValue(frame: DataFrame, name: string, fallback: number): number {
  const parsed = Number(firstValue(frame, name));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalNumberValue(frame: DataFrame, name: string): number | undefined {
  const raw = firstValue(frame, name);
  if (raw === null || raw === undefined || raw === "") {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const SourcePanel: React.FC<PanelProps<SourcePanelOptions>> = ({
  data,
  height,
  id,
  options,
  width,
}) => {
  const frame = data.series[0];
  const lineElements = useRef(new Map<number, HTMLDivElement>());
  const fontSize = options.fontSize || 12;
  const showLineNumbers = options.showLineNumbers !== false;

  const model = useMemo(() => {
    if (!frame) {
      return undefined;
    }
    const source = textValue(frame, "source");
    if (!source) {
      return undefined;
    }
    const findingAnnotationsAvailable = frame.fields.some((field) =>
      ["finding_annotations", "hotspot_lines"].includes(field.name.toLowerCase())
    );
    return {
      commit: textValue(frame, "commit"),
      endLine: numberValue(frame, "end_line", numberValue(frame, "start_line", 1)),
      findings: parseFindingAnnotations(
        firstValue(frame, "finding_annotations") ?? firstValue(frame, "hotspot_lines")
      ),
      findingAnnotationsAvailable,
      language: sourceLanguage(textValue(frame, "language")),
      path: textValue(frame, "path"),
      repo: textValue(frame, "repo"),
      selectionCognitive: optionalNumberValue(frame, "selection_cognitive"),
      selectionCyclomatic: optionalNumberValue(frame, "selection_cyclomatic"),
      selectionKind: textValue(frame, "selection_kind") || "Selected range",
      selectionLabel: textValue(frame, "selection_label"),
      source,
      startLine: numberValue(frame, "start_line", 1),
    };
  }, [frame]);

  useEffect(() => {
    if (model) {
      lineElements.current.get(model.startLine)?.scrollIntoView({ block: "center" });
    }
  }, [model]);

  if (!model) {
    return (
      <div style={{ padding: 16, width, height, boxSizing: "border-box" }}>
        Select a file, function, or finding from a hotspot table to load its analyzed source.
      </div>
    );
  }

  const language = hljs.getLanguage(model.language) ? model.language : "plaintext";
  const lines = model.source.split("\n");
  const githubUrl = `https://github.com/${model.repo}/blob/${model.commit}/${model.path}`;
  const wideLayout = width >= 900;

  return (
    <div
      className={`ahara-source-panel ahara-source-panel-${id}`}
      style={{ width, height, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <style>{`
        .ahara-source-panel-${id} .selection-summary { background: rgba(87, 148, 242, 0.12); border-bottom: 1px solid rgba(87, 148, 242, 0.45); padding: 9px 12px; }
        .ahara-source-panel-${id} .selection-kind { background: #3274d9; border-radius: 3px; color: white; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; padding: 3px 6px; text-transform: uppercase; }
        .ahara-source-panel-${id} .source-line { display: flex; min-width: max-content; position: relative; }
        .ahara-source-panel-${id} .source-line.selected { background: rgba(87, 148, 242, 0.20); box-shadow: inset 3px 0 #5794f2; }
        .ahara-source-panel-${id} .source-line.finding-note { background: rgba(87, 148, 242, 0.13); box-shadow: inset 3px 0 #8ab8ff; }
        .ahara-source-panel-${id} .source-line.finding-warning { background: rgba(255, 152, 48, 0.14); box-shadow: inset 3px 0 #ff9830; }
        .ahara-source-panel-${id} .source-line.finding-error { background: rgba(242, 73, 92, 0.14); box-shadow: inset 3px 0 #f2495c; }
        .ahara-source-panel-${id} .source-line.selected.finding-note, .ahara-source-panel-${id} .source-line.selected.finding-warning, .ahara-source-panel-${id} .source-line.selected.finding-error { outline: 1px solid rgba(87, 148, 242, 0.65); outline-offset: -1px; }
        .ahara-source-panel-${id} .line-number { color: #8e8e8e; user-select: none; text-align: right; padding: 0 8px; min-width: 4.5em; }
        .ahara-source-panel-${id} .finding-markers { display: inline-flex; gap: 3px; min-width: 28px; padding-right: 6px; }
        .ahara-source-panel-${id} .finding-marker { align-items: center; border-radius: 50%; color: white; display: inline-flex; font-size: 9px; font-weight: 700; height: 16px; justify-content: center; width: 16px; }
        .ahara-source-panel-${id} .finding-marker.note, .ahara-source-panel-${id} .finding-card.note { border-color: #8ab8ff; }
        .ahara-source-panel-${id} .finding-marker.note { background: #3274d9; }
        .ahara-source-panel-${id} .finding-marker.warning, .ahara-source-panel-${id} .finding-card.warning { border-color: #ff9830; }
        .ahara-source-panel-${id} .finding-marker.warning { background: #c15c17; }
        .ahara-source-panel-${id} .finding-marker.error, .ahara-source-panel-${id} .finding-card.error { border-color: #f2495c; }
        .ahara-source-panel-${id} .finding-marker.error { background: #c4162a; }
        .ahara-source-panel-${id} .line-code { white-space: pre; padding-right: 18px; flex: 1; }
        .ahara-source-panel-${id} .finding-rail { background: rgba(20, 20, 20, 0.16); box-sizing: border-box; overflow: auto; padding: 10px; }
        .ahara-source-panel-${id} .finding-card { background: rgba(128, 128, 128, 0.08); border: 1px solid; border-left-width: 4px; border-radius: 3px; color: inherit; cursor: pointer; display: block; margin-top: 8px; padding: 9px; text-align: left; width: 100%; }
        .ahara-source-panel-${id} .finding-level { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .ahara-source-panel-${id} .finding-message { display: block; font-size: 12px; line-height: 1.4; margin-top: 5px; }
        .ahara-source-panel-${id} .finding-meta { color: #9e9e9e; display: block; font-size: 10px; margin-top: 5px; }
        .ahara-source-panel-${id} .hljs-keyword, .ahara-source-panel-${id} .hljs-selector-tag, .ahara-source-panel-${id} .hljs-built_in { color: #c792ea; }
        .ahara-source-panel-${id} .hljs-string, .ahara-source-panel-${id} .hljs-attr { color: #c3e88d; }
        .ahara-source-panel-${id} .hljs-number, .ahara-source-panel-${id} .hljs-literal { color: #f78c6c; }
        .ahara-source-panel-${id} .hljs-comment, .ahara-source-panel-${id} .hljs-quote { color: #697098; font-style: italic; }
        .ahara-source-panel-${id} .hljs-title, .ahara-source-panel-${id} .hljs-function { color: #82aaff; }
        .ahara-source-panel-${id} .hljs-type, .ahara-source-panel-${id} .hljs-class { color: #ffcb6b; }
      `}</style>
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid rgba(128,128,128,0.35)",
          display: "flex",
          flexWrap: "wrap",
          fontSize: 12,
          gap: 8,
          padding: "7px 10px",
        }}
      >
        <strong>{model.path}</strong>
        <span>{model.repo}@{model.commit.slice(0, 12)}</span>
        <a href={`${githubUrl}#L${model.startLine}`} rel="noreferrer" target="_blank">
          Open exact commit on GitHub
        </a>
      </div>
      <div className="selection-summary">
        <span className="selection-kind">{model.selectionKind}</span>{" "}
        <strong>{model.selectionLabel || model.path}</strong>{" "}
        <span>lines {model.startLine}-{model.endLine}</span>
        {model.selectionCognitive !== undefined && (
          <span> · cognitive {model.selectionCognitive}</span>
        )}
        {model.selectionCyclomatic !== undefined && (
          <span> · cyclomatic {model.selectionCyclomatic}</span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: wideLayout ? "row" : "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize,
            lineHeight: 1.55,
            minHeight: 0,
            overflow: "auto",
            padding: "6px 0",
          }}
        >
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const selected = lineNumber >= model.startLine && lineNumber <= model.endLine;
            const lineFindings = findingsForLine(model.findings, lineNumber);
            const startingFindings = model.findings
              .map((finding, findingIndex) => ({ finding, findingIndex }))
              .filter(({ finding }) => finding.startLine === lineNumber);
            const tone = strongestFindingTone(lineFindings);
            const className = `source-line${selected ? " selected" : ""}${tone ? ` finding-${tone}` : ""}`;
            const highlighted = hljs.highlight(line || " ", {
              language,
              ignoreIllegals: true,
            }).value;
            return (
              <div
                className={className}
                key={lineNumber}
                ref={(element) => {
                  if (element) {
                    lineElements.current.set(lineNumber, element);
                  } else {
                    lineElements.current.delete(lineNumber);
                  }
                }}
              >
                {showLineNumbers && <span className="line-number">{lineNumber}</span>}
                <span className="finding-markers">
                  {startingFindings.map(({ finding, findingIndex }) => (
                    <span
                      className={`finding-marker ${findingTone(finding.level)}`}
                      key={`${findingIndex}-${finding.startLine}`}
                      title={finding.message}
                    >
                      {findingIndex + 1}
                    </span>
                  ))}
                </span>
                <span className="line-code" dangerouslySetInnerHTML={{ __html: highlighted }} />
              </div>
            );
          })}
        </div>
        <aside
          className="finding-rail"
          style={{
            borderLeft: wideLayout ? "1px solid rgba(128,128,128,0.35)" : undefined,
            borderTop: wideLayout ? undefined : "1px solid rgba(128,128,128,0.35)",
            flex: wideLayout ? "0 0 340px" : "0 0 42%",
          }}
        >
          <strong>Qlty findings ({model.findings.length})</strong>
          {!model.findingAnnotationsAvailable ? (
            <p style={{ color: "#f2495c", fontSize: 12, lineHeight: 1.4 }}>
              Finding annotations were not returned by the datasource. Refresh the dashboard; if
              this persists, inspect the source-panel query rather than treating the file as clean.
            </p>
          ) : model.findings.length === 0 ? (
            <p style={{ color: "#9e9e9e", fontSize: 12, lineHeight: 1.4 }}>
              No Qlty findings were reported for this file. The blue range marks the selected
              complexity hotspot; it is selection context, not a finding.
            </p>
          ) : (
            model.findings.map((finding, findingIndex) => {
              const tone = findingTone(finding.level);
              const endLine = finding.endLine ?? finding.startLine;
              const rule = [finding.category, finding.ruleKey].filter(Boolean).join(" · ");
              return (
                <button
                  className={`finding-card ${tone}`}
                  key={`${findingIndex}-${finding.startLine}-${finding.message ?? ""}`}
                  onClick={() =>
                    lineElements.current.get(finding.startLine)?.scrollIntoView({ block: "center" })
                  }
                  type="button"
                >
                  <span className="finding-level">
                    {findingIndex + 1}. {finding.level || "note"} · lines {finding.startLine}-{endLine}
                  </span>
                  <span className="finding-message">{finding.message || "Qlty finding"}</span>
                  {(rule || finding.effortMinutes !== undefined) && (
                    <span className="finding-meta">
                      {rule}
                      {rule && finding.effortMinutes !== undefined ? " · " : ""}
                      {finding.effortMinutes !== undefined
                        ? `${finding.effortMinutes} debt min`
                        : ""}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </aside>
      </div>
    </div>
  );
};
