export interface SourcePanelOptions {
  fontSize: number;
  showLineNumbers: boolean;
}

export interface FindingAnnotation {
  startLine: number;
  endLine?: number;
  level?: string;
  category?: string;
  ruleKey?: string;
  effortMinutes?: number;
  message?: string;
}
