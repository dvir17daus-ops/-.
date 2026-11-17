// Claude: service status, Claude Code task lists and recent sessions.
// Click a session to resume it in Terminal (needs Übersicht's interaction shortcut).
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, Section, Pressable, Dot, widgetClass, Nothing, ellipsis } from "./lib/ui";
import { t } from "./lib/i18n";
import { sh, fetchJSON, openUrl, osascript } from "./lib/shell";
import { relTime, truncate } from "./lib/format";
import { claudeCmd, parseClaude, parseStatus, resumeScript } from "./lib/claude";

const cfg = widget("claude");
const enabled = cfg.enabled !== false;
const STATUS_URL = "https://status.claude.com/api/v2/summary.json";

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(5, cfg.refreshSeconds || 20) * 1000;
export const initialState = { local: null, status: null };

let lastStatusAt = 0;

export const command = enabled
  ? (dispatch) => {
      const jobs = [];
      if (cfg.showTasks !== false || cfg.showSessions !== false) {
        jobs.push(
          sh(claudeCmd(cfg.claudeDir, cfg.lookbackDays, cfg.maxSessions)).then((out) =>
            dispatch({ type: "LOCAL", local: parseClaude(out) })
          )
        );
      }
      // The status page changes slowly; check it at most every 2 minutes.
      if (cfg.showStatus !== false && Date.now() - lastStatusAt > 120000) {
        lastStatusAt = Date.now();
        jobs.push(
          fetchJSON(STATUS_URL)
            .then((json) => dispatch({ type: "STATUS", status: parseStatus(json) }))
            .catch(() => dispatch({ type: "STATUS", status: { indicator: "unknown", incidents: [], degraded: [] } }))
        );
      }
      return Promise.all(jobs).then(() => undefined);
    }
  : undefined;

export const updateState = (event, prev) => {
  if (event.type === "LOCAL") return Object.assign({}, prev, { local: event.local });
  if (event.type === "STATUS") return Object.assign({}, prev, { status: event.status });
  return prev;
};

const STATUS_VIEW = {
  none: ["var(--dw-up)", "statusOk"],
  minor: ["var(--dw-warn)", "statusMinor"],
  maintenance: ["var(--dw-warn)", "statusMinor"],
  major: ["var(--dw-down)", "statusMajor"],
  critical: ["var(--dw-down)", "statusCritical"],
  unknown: ["var(--dw-faint)", "statusUnknown"],
};

const statusRow = css({ display: "flex", alignItems: "center", gap: 7, fontSize: "0.86em" });
const incident = css({ fontSize: "0.8em", color: "var(--dw-warn)", marginTop: 4 });
const listHead = css({ fontSize: "0.72em", color: "var(--dw-faint)", margin: "6px 0 2px", display: "flex", gap: 6 });
const taskRow = css({ display: "flex", alignItems: "flex-start", gap: 7, fontSize: "0.88em", padding: "2px 0" });
const taskIcon = css({ width: 14, flex: "none", textAlign: "center", lineHeight: 1.35 });
const spinner = css({
  display: "inline-block",
  width: 9,
  height: 9,
  marginTop: 3,
  borderRadius: "50%",
  border: "2px solid var(--dw-accent)",
  borderTopColor: "transparent",
  animation: "dwSpin 1s linear infinite",
});
const sessTitle = css({ display: "flex", alignItems: "center", gap: 7, fontSize: "0.9em", fontWeight: 500 });
const sessMeta = css({ fontSize: "0.72em", color: "var(--dw-faint)", marginTop: 1, paddingInlineStart: 14 });

function TaskItem({ item }) {
  const done = item.status === "completed";
  const running = item.status === "in_progress";
  return (
    <div className={taskRow} style={done ? { color: "var(--dw-faint)" } : null}>
      <span className={taskIcon}>
        {running ? <span className={spinner} /> : done ? "✓" : "○"}
      </span>
      <span
        dir="auto"
        style={{
          textDecoration: done ? "line-through" : "none",
          color: running ? "var(--dw-accent)" : undefined,
          fontWeight: running ? 600 : 400,
        }}
      >
        {truncate(running && item.active ? item.active : item.title, 70)}
      </span>
    </div>
  );
}

function renderTasks(local) {
  const max = cfg.maxTasks || 6;
  const showDone = cfg.showCompleted !== false;
  const lists = local.lists.filter((l) => l.open > 0 || (showDone && local.now - l.mtime < 3600));
  if (!lists.length) return <Message text={t("noClaudeTasks")} />;
  let budget = max;
  const out = [];
  lists.forEach((l) => {
    if (budget <= 0) return;
    const items = l.items.filter((i) => showDone || i.status !== "completed").slice(0, budget);
    if (!items.length) return;
    budget -= items.length;
    out.push(
      <div key={l.id}>
        <div className={listHead}>
          {l.label ? <span>{l.label}</span> : null}
          <span>{relTime(l.mtime * 1000, local.now * 1000)}</span>
          <span>· {l.done}/{l.items.length}</span>
        </div>
        {items.map((item, i) => (
          <TaskItem item={item} key={i} />
        ))}
      </div>
    );
  });
  return out;
}

function renderSessions(local) {
  if (!local.sessions.length) return <Message text={t("noSessions")} />;
  return local.sessions.map((s) => (
    <Pressable key={s.id} onClick={() => sh(osascript(resumeScript(s)))} title="claude --resume">
      <div className={sessTitle}>
        <Dot color={s.active ? "var(--dw-up)" : "var(--dw-faint)"} pulse={s.active} />
        <span className={ellipsis} dir="auto">
          {truncate(s.title, 60) || t("untitled")}
        </span>
      </div>
      <div className={sessMeta}>
        {[s.project, s.branch, s.active ? t("activeNow") : relTime(s.mtime * 1000, local.now * 1000)]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </Pressable>
  ));
}

function renderClaude({ local, status }) {
  const sv = STATUS_VIEW[(status && status.indicator) || "unknown"] || STATUS_VIEW.unknown;
  return (
    <Card icon="✳️" title={t("claude")} right={local && local.today ? t("sessionsToday", { n: local.today }) : null}>
      {cfg.showStatus !== false ? (
        <div>
          <Pressable onClick={() => openUrl("https://status.claude.com")}>
            <div className={statusRow}>
              <Dot color={sv[0]} size={8} />
              <span>{status ? t(sv[1]) : t("loading")}</span>
            </div>
            {status && status.incidents.length
              ? status.incidents.slice(0, 2).map((i) => (
                  <div className={incident} key={i.name} dir="auto">
                    ⚠︎ {truncate(i.name, 70)}
                  </div>
                ))
              : null}
          </Pressable>
        </div>
      ) : null}

      {cfg.showTasks !== false ? (
        <div>
          <Section title={t("claudeTasks")} first={cfg.showStatus === false} />
          {local ? renderTasks(local) : <Message text={t("loading")} />}
        </div>
      ) : null}

      {cfg.showSessions !== false ? (
        <div>
          <Section title={t("claudeSessions")} />
          {local ? renderSessions(local) : <Message text={t("loading")} />}
        </div>
      ) : null}
    </Card>
  );
}

export const render = enabled ? renderClaude : Nothing;
