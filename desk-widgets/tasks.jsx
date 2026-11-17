// Personal to-do list from a Markdown file (default ~/Documents/widget-tasks.md).
//   - [ ] open task      - [x] done task      # Heading
// Click a task to tick it off (needs Übersicht's interaction shortcut).
// Tip: you can ask Claude Code to add tasks to this file for you.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, Pressable, widgetClass, Nothing } from "./lib/ui";
import { t } from "./lib/i18n";
import { sh, qpath } from "./lib/shell";

const cfg = widget("tasks");
const enabled = cfg.enabled !== false;
const file = cfg.file || "~/Documents/widget-tasks.md";
const readCmd = "if [ -f " + qpath(file) + " ]; then cat " + qpath(file) + "; else echo '@@NOFILE'; fi";

// Flip "[ ]" <-> "[x]" on one line of the file (perl works the same on macOS and Linux).
export const toggleCmd = (lineNo) =>
  "perl -i -pe 'if ($. == " + Number(lineNo) + ") { s/\\[ \\]/[x]/ or s/\\[[xX]\\]/[ ]/ }' " + qpath(file);

export function parseTasks(text) {
  const items = [];
  String(text || "")
    .split("\n")
    .forEach((line, i) => {
      const h = line.match(/^\s{0,3}#{1,6}\s+(.+)$/);
      if (h) {
        items.push({ kind: "heading", text: h[1].trim(), line: i + 1 });
        return;
      }
      const m = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
      if (m) items.push({ kind: "task", done: m[2] !== " ", text: m[3].trim(), line: i + 1, indent: m[1].length >= 2 });
    });
  return items;
}

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(3, cfg.refreshSeconds || 15) * 1000;
export const initialState = { items: null };
export const command = enabled ? () => sh(readCmd) : undefined;

export const updateState = (event, prev) => {
  if (event.type !== "UB/COMMAND_RAN" || event.error) return prev;
  const out = String(event.output || "");
  if (out.trim() === "@@NOFILE") return { items: [], missing: true };
  return { items: parseTasks(out), missing: false };
};

const row = css({ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.9em" });
const box = css({
  flex: "none",
  width: 14,
  height: 14,
  marginTop: 2,
  borderRadius: 4,
  border: "1.5px solid var(--dw-faint)",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  color: "#fff",
  fontWeight: 700,
});
const head = css({ fontSize: "0.72em", fontWeight: 700, color: "var(--dw-faint)", margin: "8px 0 2px" });
const progress = css({ fontVariantNumeric: "tabular-nums" });

function renderTasks({ items, missing }, dispatch) {
  const title = cfg.title || t("tasks");
  if (!items) {
    return (
      <Card icon="✅" title={title}>
        <Message text={t("loading")} />
      </Card>
    );
  }
  if (missing) {
    return (
      <Card icon="✅" title={title}>
        <Message text={t("noFile")} />
        <div style={{ fontSize: "0.78em", direction: "ltr", textAlign: "start", color: "var(--dw-faint)" }}>{file}</div>
      </Card>
    );
  }
  const tasks = items.filter((i) => i.kind === "task");
  const done = tasks.filter((i) => i.done).length;
  const shown = [];
  let count = 0;
  const max = cfg.maxItems || 8;
  items.forEach((i) => {
    if (count >= max) return;
    if (i.kind === "heading") {
      shown.push(i);
      return;
    }
    if (i.done && cfg.showCompleted === false) return;
    shown.push(i);
    count += 1;
  });
  // Drop headings with nothing under them.
  const visible = shown.filter((i, idx) => i.kind !== "heading" || (shown[idx + 1] && shown[idx + 1].kind === "task"));

  const toggle = (line) =>
    sh(toggleCmd(line))
      .then(() => sh(readCmd))
      .then((output) => dispatch({ type: "UB/COMMAND_RAN", output }));

  return (
    <Card icon="✅" title={title} right={tasks.length ? <span className={progress}>{t("tasksDone", { d: done, t: tasks.length })}</span> : null}>
      {tasks.length && done === tasks.length ? <Message text={t("allDone")} /> : null}
      {visible.map((i) =>
        i.kind === "heading" ? (
          <div className={head} key={i.line} dir="auto">
            {i.text}
          </div>
        ) : (
          <Pressable key={i.line} onClick={() => toggle(i.line)}>
            <div className={row} style={i.indent ? { paddingInlineStart: 18 } : null}>
              <span
                className={box}
                style={i.done ? { background: "var(--dw-accent)", borderColor: "var(--dw-accent)" } : null}
              >
                {i.done ? "✓" : ""}
              </span>
              <span
                dir="auto"
                style={i.done ? { textDecoration: "line-through", color: "var(--dw-faint)" } : null}
              >
                {i.text}
              </span>
            </div>
          </Pressable>
        )
      )}
    </Card>
  );
}

export const render = enabled ? renderTasks : Nothing;
