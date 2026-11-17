// Reads Claude Code's local data (~/.claude) and the public Claude status page.
//
//   ~/.claude/todos/*.json            to-do lists written by Claude Code (TodoWrite)
//   ~/.claude/tasks/<list>/*.json     task lists (newer Claude Code versions)
//   ~/.claude/projects/<proj>/*.jsonl session transcripts (title, project, branch, time)
//
// Everything is read-only; the shell command only lists files and greps a few lines.
import { qpath } from "./shell";

export function claudeCmd(dir, days, maxSessions) {
  const D = qpath(dir || "~/.claude");
  const d = Math.max(1, Math.round(days || 7));
  const n = Math.max(1, Math.round(maxSessions || 4));
  const notAgents = "! -name 'agent-*' ! -path '*/subagents/*'";
  return String.raw`
D=${D}
if [ "$(uname)" = Darwin ]; then MT='stat -f %m'; else MT='stat -c %Y'; fi
echo "@@NOW $(date +%s)"
find "$D/todos" -maxdepth 1 -type f -name '*.json' -size +2c -mtime -${d} -print0 | xargs -0 -r ls -t | head -n 8 | while IFS= read -r f; do echo "@@TODO $($MT "$f") $f"; head -c 20000 "$f" | tr '\n\r' '  '; echo; done
find "$D/tasks" -type f -name '*.json' -mtime -${d} -print0 | xargs -0 -r ls -t | head -n 60 | while IFS= read -r f; do echo "@@TASK $($MT "$f") $f"; head -c 6000 "$f" | tr '\n\r' '  '; echo; done
find "$D/projects" -type f -name '*.jsonl' ${notAgents} -mtime -${d} -print0 | xargs -0 -r ls -t | head -n ${n} | while IFS= read -r f; do
  echo "@@SESSION $($MT "$f") $f"
  grep -m 8 '"type":"user"' "$f" | cut -c1-6000
  grep -m 3 -E '"type":"(summary|custom-title)"' "$f" | cut -c1-1500
done
echo "@@TODAY $(find "$D/projects" -type f -name '*.jsonl' ${notAgents} -newermt "$(date +%Y-%m-%d)" | wc -l | tr -d ' ')"
`;
}

const basename = (p) => String(p || "").replace(/\/+$/, "").split("/").pop();

function tryJSON(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function grab(line, key) {
  const m = line.match(new RegExp('"' + key + '":"((?:[^"\\\\]|\\\\.)*)'));
  if (!m) return "";
  const v = tryJSON('"' + m[1] + '"');
  return v === null ? m[1] : v;
}

function cleanPrompt(text) {
  const s = String(text || "").trim();
  if (!s || s[0] === "<" || s.indexOf("[Request interrupted") === 0 || s.indexOf("Caveat:") === 0) return "";
  return s;
}

function promptOf(line) {
  const obj = tryJSON(line);
  if (obj) {
    if (obj.isMeta || obj.isSidechain) return "";
    const c = obj.message && obj.message.content;
    if (typeof c === "string") return cleanPrompt(c);
    if (Array.isArray(c)) {
      const tb = c.filter((b) => b && b.type === "text" && typeof b.text === "string")[0];
      return tb ? cleanPrompt(tb.text) : "";
    }
    return "";
  }
  // The line was cut short (very long message): fall back to a regex.
  if (/"isMeta":true/.test(line) || /"tool_result"/.test(line)) return "";
  return cleanPrompt(grab(line, "content") || grab(line, "text"));
}

const STATUS = { in_progress: "in_progress", inprogress: "in_progress", active: "in_progress", completed: "completed", done: "completed", pending: "pending", open: "pending", todo: "pending" };

function normItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = raw.subject || raw.content || raw.title || raw.description || "";
  const status = STATUS[String(raw.status || "pending").toLowerCase()] || (raw.status === "deleted" ? null : "pending");
  if (!title || !status) return null;
  return { title: String(title), active: raw.activeForm ? String(raw.activeForm) : "", status, id: raw.id };
}

function itemsFrom(json) {
  if (Array.isArray(json)) return json.map(normItem).filter(Boolean);
  if (json && Array.isArray(json.tasks)) return json.tasks.map(normItem).filter(Boolean);
  if (json && Array.isArray(json.todos)) return json.todos.map(normItem).filter(Boolean);
  const one = normItem(json);
  return one ? [one] : [];
}

export function parseClaude(output, opts) {
  const o = opts || {};
  const sections = [];
  let cur = null;
  let now = Math.floor(Date.now() / 1000);
  let today = 0;
  String(output || "")
    .split("\n")
    .forEach((line) => {
      const head = line.match(/^@@(NOW|TODAY|TODO|TASK|SESSION)\s*(\d*)\s*(.*)$/);
      if (head) {
        if (head[1] === "NOW") now = parseInt(head[2], 10) || now;
        else if (head[1] === "TODAY") today = parseInt(head[2], 10) || 0;
        else {
          cur = { kind: head[1], mtime: parseInt(head[2], 10) || 0, path: head[3], lines: [] };
          sections.push(cur);
        }
        return;
      }
      if (cur && line) cur.lines.push(line);
    });

  // Sessions
  const sessions = sections
    .filter((s) => s.kind === "SESSION")
    .map((s) => {
      let title = "";
      let summary = "";
      let customTitle = "";
      let cwd = "";
      let branch = "";
      s.lines.forEach((line) => {
        const obj = tryJSON(line);
        const type = obj ? obj.type : (line.match(/"type":"([a-z-]+)"/) || [])[1];
        if (type === "summary") summary = summary || (obj ? obj.summary : grab(line, "summary"));
        else if (type === "custom-title") customTitle = (obj && (obj.customTitle || obj.title)) || grab(line, "customTitle") || customTitle;
        else if (type === "user") {
          if (!cwd) cwd = obj ? obj.cwd || "" : grab(line, "cwd");
          // Keep the most recent branch seen (it can change during a session).
          branch = (obj ? obj.gitBranch : grab(line, "gitBranch")) || branch;
          if (!title) title = promptOf(line);
        }
      });
      const id = basename(s.path).replace(/\.jsonl$/, "");
      const projDir = basename(s.path.replace(/\/[^/]+$/, ""));
      return {
        id,
        mtime: s.mtime,
        cwd,
        project: cwd ? basename(cwd) : projDir.split("-").filter(Boolean).pop() || projDir,
        branch: branch && branch !== "HEAD" ? branch : "",
        title: customTitle || summary || title,
        active: now - s.mtime < (o.activeSeconds || 90),
      };
    });

  const sessionById = {};
  sessions.forEach((s) => {
    sessionById[s.id] = s;
  });

  // Task lists: one per todo file, and one per tasks/<list> directory.
  const lists = [];
  sections
    .filter((s) => s.kind === "TODO")
    .forEach((s) => {
      const items = itemsFrom(tryJSON(s.lines.join(" ")));
      if (!items.length) return;
      const sid = basename(s.path).replace(/\.json$/, "").split("-agent-")[0];
      const sess = sessionById[sid];
      lists.push({ id: sid, mtime: s.mtime, items, label: sess ? sess.project : "" });
    });
  const byDir = {};
  sections
    .filter((s) => s.kind === "TASK")
    .forEach((s) => {
      const dirName = basename(s.path.replace(/\/[^/]+$/, ""));
      const items = itemsFrom(tryJSON(s.lines.join(" ")));
      if (!items.length) return;
      if (!byDir[dirName]) {
        const sess = sessionById[dirName];
        byDir[dirName] = { id: dirName, mtime: 0, items: [], label: sess ? sess.project : "" };
        lists.push(byDir[dirName]);
      }
      byDir[dirName].mtime = Math.max(byDir[dirName].mtime, s.mtime);
      byDir[dirName].items = byDir[dirName].items.concat(items);
    });

  const rank = { in_progress: 0, pending: 1, completed: 2 };
  lists.forEach((l) => {
    l.items.sort((a, b) => {
      const r = rank[a.status] - rank[b.status];
      if (r !== 0) return r;
      const na = Number(a.id);
      const nb = Number(b.id);
      return !isNaN(na) && !isNaN(nb) ? na - nb : 0;
    });
    l.done = l.items.filter((i) => i.status === "completed").length;
    l.open = l.items.length - l.done;
  });
  lists.sort((a, b) => b.mtime - a.mtime);

  return { now, today, sessions, lists };
}

export function parseStatus(json) {
  const status = (json && json.status) || {};
  const incidents = ((json && json.incidents) || [])
    .filter((i) => i.status !== "resolved" && i.status !== "postmortem")
    .map((i) => ({ name: i.name, impact: i.impact, url: i.shortlink }));
  const degraded = ((json && json.components) || [])
    .filter((c) => c.status && c.status !== "operational" && !c.group)
    .map((c) => c.name);
  return { indicator: status.indicator || "unknown", description: status.description || "", incidents, degraded };
}

// AppleScript that opens Terminal and resumes a Claude Code session in its folder.
export function resumeScript(session) {
  const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
  const cmd = (session.cwd ? "cd " + q(session.cwd) + " && " : "") + "claude --resume " + q(session.id);
  const asString = '"' + cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  return ['tell application "Terminal"', "activate", "do script " + asString, "end tell"];
}
