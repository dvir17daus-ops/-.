// Your own rows: each row runs a shell command and shows its output.
// No coding needed — add rows in config.json → "custom" → "items".
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, widgetClass, Nothing, ellipsis } from "./lib/ui";
import { t } from "./lib/i18n";
import { sh } from "./lib/shell";

const cfg = widget("custom");
const items = (cfg.items || []).filter((i) => i && i.command);
const enabled = cfg.enabled !== false && items.length > 0;

// Run every command in its own subshell and mark where each output starts.
const CMD = items
  .map((item, i) => "echo '@@ITEM " + i + "'; ( " + item.command + "\n) | head -c 400")
  .join("\n");

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(2, cfg.refreshSeconds || 30) * 1000;
export const initialState = { values: null };
export const command = enabled ? () => sh(CMD) : undefined;

export const updateState = (event, prev) => {
  if (event.type !== "UB/COMMAND_RAN" || event.error) return prev;
  const values = items.map(() => "");
  let cur = -1;
  String(event.output || "")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^@@ITEM (\d+)$/);
      if (m) cur = +m[1];
      else if (cur >= 0 && line.trim()) values[cur] += (values[cur] ? " " : "") + line.trim();
    });
  return { values };
};

const row = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  padding: "4px 0",
  borderTop: "1px solid var(--dw-line)",
  ":first-of-type": { borderTop: "none", paddingTop: 0 },
});
const label = css({ fontSize: "0.86em", color: "var(--dw-muted)", whiteSpace: "nowrap" });
const value = css({ fontSize: "0.92em", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "end" });

function renderCustom({ values }) {
  return (
    <Card icon={cfg.icon || "🧩"} title={cfg.title || "Custom"}>
      {!values ? <Message text={t("loading")} /> : null}
      {values
        ? items.map((item, i) => (
            <div className={row} key={i}>
              <span className={label} dir="auto">
                {item.icon ? item.icon + " " : ""}
                {item.label}
              </span>
              <span className={value + " " + ellipsis} dir="auto">
                {values[i] || "—"}
              </span>
            </div>
          ))
        : null}
    </Card>
  );
}

export const render = enabled ? renderCustom : Nothing;
