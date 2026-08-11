export interface SourcePanelOptions {
  fontSize: number;
  showLineNumbers: boolean;
}

export interface HotspotLine {
  startLine: number;
  endLine?: number;
  level?: string;
  message?: string;
}
