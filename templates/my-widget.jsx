// Template for a new widget. Copy this file into the desk-widgets folder
// (next to clock.jsx), rename it, and Übersicht will pick it up right away.
//
// 1. Add a section for it in config.json, for example:
//      "myWidget": { "enabled": true, "position": { "top": 20, "left": "calc(50% - 145px)" } }
// 2. Change `command` to fetch what you want (shell command or URL).
// 3. Change `updateState` / `render` to show it.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, widgetClass, Nothing } from "./lib/ui";
import { t } from "./lib/i18n";
import { sh, fetchJSON } from "./lib/shell";

const cfg = widget("myWidget");
const enabled = cfg.enabled !== false;

export const className = widgetClass(cfg);
export const refreshFrequency = 60 * 1000; // every minute
export const initialState = { data: null };

// Option A: run a shell command (output arrives as a string).
export const command = enabled ? () => sh("uptime") : undefined;

// Option B: fetch JSON from a public API (no CORS problems: curl runs it).
// export const command = enabled
//   ? (dispatch) => fetchJSON("https://api.example.com/data.json").then((data) => dispatch({ type: "DATA", data }))
//   : undefined;

export const updateState = (event, prev) => {
  if (event.type === "DATA") return { data: event.data };
  if (event.type === "UB/COMMAND_RAN" && event.output) return { data: event.output.trim() };
  return prev;
};

const big = css({ fontSize: "1.4em", fontWeight: 300 });

function renderMyWidget({ data }) {
  return (
    <Card icon="✨" title="My widget">
      {data ? <div className={big}>{typeof data === "string" ? data : JSON.stringify(data)}</div> : <Message text={t("loading")} />}
    </Card>
  );
}

export const render = enabled ? renderMyWidget : Nothing;
