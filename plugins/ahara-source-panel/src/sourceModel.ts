import type { FindingAnnotation } from "./types";

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

const LEVEL_PRIORITY: Record<string, number> = {
  error: 3,
  warning: 2,
  note: 1,
  info: 1,
};

export function parseFindingAnnotations(raw: unknown): FindingAnnotation[] {
  if (!raw) {
    return [];
  }

  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(
        (item): item is FindingAnnotation =>
          typeof item === "object" && item !== null && Number(item.startLine) > 0
      )
      .map((item) => ({
        ...item,
        endLine: Number(item.endLine ?? item.startLine),
        startLine: Number(item.startLine),
      }))
      .sort((left, right) => left.startLine - right.startLine);
  } catch {
    return [];
  }
}

export function sourceLanguage(value: string): string {
  const normalized = value.toLowerCase().replace(/^language_/, "");
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

export function findingsForLine(
  findings: FindingAnnotation[],
  line: number
): FindingAnnotation[] {
  return findings.filter(
    (finding) =>
      line >= Number(finding.startLine) &&
      line <= Number(finding.endLine ?? finding.startLine)
  );
}

export function findingTone(level?: string): "error" | "warning" | "note" {
  const normalized = level?.toLowerCase() ?? "note";
  if (normalized === "error") {
    return "error";
  }
  if (normalized === "warning") {
    return "warning";
  }
  return "note";
}

export function strongestFindingTone(
  findings: FindingAnnotation[]
): "error" | "warning" | "note" | undefined {
  if (findings.length === 0) {
    return undefined;
  }

  return findingTone(
    findings.reduce((strongest, finding) => {
      const strongestPriority = LEVEL_PRIORITY[strongest.level?.toLowerCase() ?? "note"] ?? 1;
      const findingPriority = LEVEL_PRIORITY[finding.level?.toLowerCase() ?? "note"] ?? 1;
      return findingPriority > strongestPriority ? finding : strongest;
    }).level
  );
}
