import { PanelPlugin } from "@grafana/data";
import { SourcePanel } from "./SourcePanel";
import { SourcePanelOptions } from "./types";

export const plugin = new PanelPlugin<SourcePanelOptions>(SourcePanel).setPanelOptions(
  (builder) =>
    builder
      .addNumberInput({
        path: "fontSize",
        name: "Font size",
        defaultValue: 12,
        settings: { min: 9, max: 24, integer: true },
      })
      .addBooleanSwitch({
        path: "showLineNumbers",
        name: "Show line numbers",
        defaultValue: true,
      })
);
