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
import { HotspotLine, SourcePanelOptions } from "./types";

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

const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  ts: "typescript",
  tsx: "typescript",
  vb: "vbnet",
};

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

function parseHotspots(raw: unknown): HotspotLine[] {
  if (!raw) {
    return [];
  }
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(value)
      ? value.filter(
          (item): item is HotspotLine =>
            typeof item === "object" && item !== null && Number(item.startLine) > 0
        )
      : [];
  } catch {
    return [];
  }
}

function sourceLanguage(value: string): string {
  const normalized = value.toLowerCase().replace(/^language_/, "");
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function hotspotForLine(hotspots: HotspotLine[], line: number): HotspotLine | undefined {
  return hotspots.find(
    (hotspot) =>
      line >= Number(hotspot.startLine) &&
      line <= Number(hotspot.endLine ?? hotspot.startLine)
  );
}

export const SourcePanel: React.FC<PanelProps<SourcePanelOptions>> = ({
  data,
  height,
  id,
  options,
  width,
}) => {
  const frame = data.series[0];
  const selectedLine = useRef<HTMLDivElement | null>(null);
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
    return {
      commit: textValue(frame, "commit"),
      endLine: numberValue(frame, "end_line", numberValue(frame, "start_line", 1)),
      hotspots: parseHotspots(firstValue(frame, "hotspot_lines")),
      language: sourceLanguage(textValue(frame, "language")),
      path: textValue(frame, "path"),
      repo: textValue(frame, "repo"),
      source,
      startLine: numberValue(frame, "start_line", 1),
    };
  }, [frame]);

  useEffect(() => {
    selectedLine.current?.scrollIntoView({ block: "center" });
  }, [model?.path, model?.startLine]);

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

  return (
    <div
      className={`ahara-source-panel ahara-source-panel-${id}`}
      style={{ width, height, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <style>{`
        .ahara-source-panel-${id} .source-line { display: flex; min-width: max-content; }
        .ahara-source-panel-${id} .source-line.selected { background: rgba(87, 148, 242, 0.20); }
        .ahara-source-panel-${id} .source-line.hotspot { box-shadow: inset 3px 0 #ff9830; background: rgba(255, 152, 48, 0.10); }
        .ahara-source-panel-${id} .line-number { color: #8e8e8e; user-select: none; text-align: right; padding: 0 12px 0 8px; min-width: 4.5em; }
        .ahara-source-panel-${id} .line-code { white-space: pre; padding-right: 18px; flex: 1; }
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
        <span>lines {model.startLine}-{model.endLine}</span>
        <a href={`${githubUrl}#L${model.startLine}`} rel="noreferrer" target="_blank">
          GitHub
        </a>
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize,
          lineHeight: 1.55,
          overflow: "auto",
          padding: "6px 0",
        }}
      >
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const selected = lineNumber >= model.startLine && lineNumber <= model.endLine;
          const hotspot = hotspotForLine(model.hotspots, lineNumber);
          const className = `source-line${selected ? " selected" : ""}${hotspot ? " hotspot" : ""}`;
          const highlighted = hljs.highlight(line || " ", {
            language,
            ignoreIllegals: true,
          }).value;
          return (
            <div
              className={className}
              key={lineNumber}
              ref={lineNumber === model.startLine ? selectedLine : undefined}
              title={hotspot?.message}
            >
              {showLineNumbers && <span className="line-number">{lineNumber}</span>}
              <span className="line-code" dangerouslySetInnerHTML={{ __html: highlighted }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
