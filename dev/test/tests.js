import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { run } from "uebersicht";
import { decode, parseFeed, mergeItems } from "../../desk-widgets/lib/feed.js";
import { feedCmd, sh, qpath } from "../../desk-widgets/lib/shell.js";
import { claudeCmd, parseClaude, parseStatus, resumeScript } from "../../desk-widgets/lib/claude.js";
import { parseChart, chartUrl, priceDigits } from "../../desk-widgets/lib/market.js";
import { merge } from "../../desk-widgets/lib/config.js";
import { parseEvents, icalCmd } from "../../desk-widgets/calendar.jsx";
import { parseTasks, toggleCmd } from "../../desk-widgets/tasks.jsx";
import { parseTrack, CMD as NOWPLAYING_CMD } from "../../desk-widgets/now-playing.jsx";
import { nextOccurrence } from "../../desk-widgets/countdown.jsx";
import { updateState as systemUpdate, CMD as SYSTEM_CMD } from "../../desk-widgets/system.jsx";
import { gematria } from "../../desk-widgets/clock.jsx";
import { updateState as customUpdate } from "../../desk-widgets/custom.jsx";

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name, e && e.message ? e.message.slice(0, 600) : String(e)]); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dwtest-"));

(async () => {
  await test("decode entities + CDATA + tags", () => {
    assert.strictEqual(decode("<![CDATA[Hello &amp; <b>world</b>]]>"), "Hello & world");
    assert.strictEqual(decode("Tom &#8217;s &#x5D0; &quot;x&quot;"), "Tom ’s א \"x\"");
  });

  await test("parseFeed RSS 2.0 + Atom", () => {
    const rss = `<?xml version="1.0"?><rss><channel><title>Chan</title>
      <item><title><![CDATA[כותרת ראשונה]]></title><link>https://a.example/1?x=1&amp;y=2</link><pubDate>Tue, 17 Nov 2026 10:00:00 +0200</pubDate></item>
      <item><title>Second &amp; more</title><link><![CDATA[https://a.example/2]]></link><pubDate>Tue, 17 Nov 2026 09:00:00 GMT</pubDate></item>
      </channel></rss>`;
    const items = parseFeed(rss, { name: "A" });
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].title, "כותרת ראשונה");
    assert.strictEqual(items[0].link, "https://a.example/1?x=1&y=2");
    assert.ok(items[0].date > 0);
    assert.strictEqual(items[1].link, "https://a.example/2");
    const atom = `<feed><title>F</title><entry><title type="html">Atom &lt;one&gt;</title><link rel="alternate" href="https://b.example/1"/><updated>2026-11-17T08:00:00Z</updated></entry></feed>`;
    const a = parseFeed(atom, { name: "B" });
    assert.strictEqual(a.length, 1);
    assert.strictEqual(a[0].link, "https://b.example/1");
    const merged = mergeItems([items, a, items], { maxItems: 10, now: Date.parse("2026-11-17T12:00:00Z"), maxAgeHours: 24 });
    assert.strictEqual(merged.length, 3, "dedupe");
    assert.strictEqual(merged[0].title, "Second & more"); // 09:00Z is newest
    const filtered = mergeItems([items, a], { keywords: ["second"], maxItems: 10 });
    assert.strictEqual(filtered.length, 1);
  });

  await test("feedCmd converts windows-1255 feeds to UTF-8", async () => {
    const f = path.join(tmp, "heb.xml");
    const body = '<?xml version="1.0" encoding="windows-1255"?><rss><channel><item><title>שלום עולם</title></item></channel></rss>';
    const enc = require("child_process").execFileSync("iconv", ["-f", "utf-8", "-t", "windows-1255"], { input: body });
    fs.writeFileSync(f, enc);
    const out = await sh(feedCmd("file://" + f));
    assert.ok(out.indexOf("שלום עולם") !== -1, "got: " + out.slice(0, 120));
    const f2 = path.join(tmp, "utf.xml");
    fs.writeFileSync(f2, '<?xml version="1.0" encoding="UTF-8"?><rss><item><title>ok ✓</title></item></rss>');
    const out2 = await sh(feedCmd("file://" + f2));
    assert.ok(out2.indexOf("ok ✓") !== -1);
  });

  await test("qpath expands ~ safely", async () => {
    const out = await sh("echo " + qpath("~/a b/it's"));
    assert.strictEqual(out.trim(), os.homedir() + "/a b/it's");
  });

  await test("claudeCmd + parseClaude on a fake ~/.claude", async () => {
    const home = path.join(tmp, "home");
    const D = path.join(home, ".claude");
    const proj = path.join(D, "projects", "-Users-me-code-my-app");
    fs.mkdirSync(proj, { recursive: true });
    fs.mkdirSync(path.join(D, "todos"), { recursive: true });
    fs.mkdirSync(path.join(D, "tasks", "list-1"), { recursive: true });
    const sid = "11111111-2222-3333-4444-555555555555";
    const lines = [
      { type: "summary", summary: "Fix login redirect bug", leafUuid: "x" },
      { type: "user", isMeta: true, cwd: "/Users/me/code/my-app", gitBranch: "main", message: { role: "user", content: "Caveat: blah" } },
      { type: "user", cwd: "/Users/me/code/my-app", gitBranch: "feature/login", message: { role: "user", content: "<command-name>/clear</command-name>" } },
      { type: "user", cwd: "/Users/me/code/my-app", gitBranch: "feature/login", message: { role: "user", content: [{ type: "text", text: "The login page redirects twice, please fix" }] } },
      { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } },
    ];
    fs.writeFileSync(path.join(proj, sid + ".jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    // second session: no summary, huge first prompt (gets cut by `cut -c1-6000`)
    const sid2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const long = "Build me a dashboard " + "x".repeat(9000);
    fs.writeFileSync(path.join(proj, sid2 + ".jsonl"), JSON.stringify({ type: "user", cwd: "/Users/me/code/other", gitBranch: "HEAD", message: { role: "user", content: long } }) + "\n");
    fs.utimesSync(path.join(proj, sid2 + ".jsonl"), new Date(Date.now() - 3600e3), new Date(Date.now() - 3600e3));
    // subagent transcript must be ignored
    fs.writeFileSync(path.join(proj, "agent-123.jsonl"), JSON.stringify({ type: "user", message: { content: "sub" } }) + "\n");
    fs.writeFileSync(path.join(D, "todos", sid + "-agent-" + sid + ".json"), JSON.stringify([
      { content: "Write tests", status: "completed", activeForm: "Writing tests" },
      { content: "Fix redirect", status: "in_progress", activeForm: "Fixing redirect" },
      { content: "Update docs", status: "pending", activeForm: "Updating docs" },
    ], null, 2));
    fs.writeFileSync(path.join(D, "todos", "empty-agent-empty.json"), "[]");
    fs.writeFileSync(path.join(D, "tasks", "list-1", "1.json"), JSON.stringify({ id: "1", subject: "Design schema", status: "pending" }, null, 2));
    fs.writeFileSync(path.join(D, "tasks", "list-1", "2.json"), JSON.stringify({ id: "2", subject: "Migrate DB", status: "in_progress", activeForm: "Migrating DB" }));
    const cmd = claudeCmd(path.join(home, ".claude"), 7, 4);
    const out = await sh(cmd);
    const r = parseClaude(out);
    assert.strictEqual(r.sessions.length, 2, "sessions: " + JSON.stringify(r.sessions));
    const s1 = r.sessions.find((s) => s.id === sid);
    assert.strictEqual(s1.title, "Fix login redirect bug");
    assert.strictEqual(s1.project, "my-app");
    assert.strictEqual(s1.branch, "feature/login");
    assert.strictEqual(s1.active, true);
    const s2 = r.sessions.find((s) => s.id === sid2);
    assert.ok(s2.title.indexOf("Build me a dashboard") === 0, "long title: " + s2.title.slice(0, 40));
    assert.strictEqual(s2.branch, "");
    assert.strictEqual(s2.project, "other");
    assert.strictEqual(s2.active, false);
    assert.strictEqual(r.lists.length, 2, "lists: " + JSON.stringify(r.lists));
    const todo = r.lists.find((l) => l.id === sid);
    assert.strictEqual(todo.label, "my-app");
    assert.deepStrictEqual(todo.items.map((i) => i.status), ["in_progress", "pending", "completed"]);
    assert.strictEqual(todo.done, 1);
    const tl = r.lists.find((l) => l.id === "list-1");
    assert.deepStrictEqual(tl.items.map((i) => i.title), ["Migrate DB", "Design schema"]);
    assert.ok(r.today >= 1);
    // missing directory => no crash, empty result
    const empty = parseClaude(await sh(claudeCmd(path.join(tmp, "nope"), 7, 4)));
    assert.strictEqual(empty.sessions.length, 0);
    assert.strictEqual(empty.lists.length, 0);
  });

  await test("parseStatus + resumeScript", () => {
    const s = parseStatus({ status: { indicator: "minor", description: "Minor" }, incidents: [{ name: "Elevated errors", status: "investigating", impact: "minor", shortlink: "https://stspg.io/x" }, { name: "old", status: "resolved" }], components: [{ name: "API", status: "degraded_performance" }, { name: "claude.ai", status: "operational" }] });
    assert.strictEqual(s.indicator, "minor");
    assert.strictEqual(s.incidents.length, 1);
    assert.deepStrictEqual(s.degraded, ["API"]);
    const lines = resumeScript({ id: "abc", cwd: "/Users/me/my \"app\"" });
    assert.ok(lines[2].indexOf('do script "cd \'/Users/me/my \\"app\\"\' && claude --resume \'abc\'"') === 0, lines[2]);
  });

  await test("parseChart", () => {
    const now = 1763373600000;
    const json = { chart: { result: [{ meta: { symbol: "AAPL", shortName: "Apple Inc.", currency: "USD", regularMarketPrice: 110, chartPreviousClose: 100, currentTradingPeriod: { regular: { start: now / 1000 - 100, end: now / 1000 + 100 } } }, indicators: { quote: [{ close: [100, null, 105, 110] }] } }], error: null } };
    const r = parseChart(json, { symbol: "AAPL" }, now);
    assert.strictEqual(r.name, "Apple Inc.");
    assert.strictEqual(Math.round(r.pct), 10);
    assert.deepStrictEqual(r.closes, [100, 105, 110]);
    assert.strictEqual(r.open, true);
    assert.ok(chartUrl("^GSPC").indexOf("/chart/%5EGSPC?range=1d") !== -1);
    assert.strictEqual(priceDigits(3.71), 3);
    assert.strictEqual(priceDigits(95000), 0);
  });

  await test("config merge replaces position", () => {
    const m = merge({ a: { position: { top: 1, left: 2 }, x: 1 } }, { a: { position: { right: 5 } } });
    assert.deepStrictEqual(m.a.position, { right: 5 });
    assert.strictEqual(m.a.x, 1);
  });

  await test("calendar parseEvents + command syntax", async () => {
    const out = "2026-11-17 at 09:30 ~~ Standup\n2026-11-17 ~~ יום הולדת לדנה\n2026-11-18 at 14:00 ~~ Dentist\nnoise line\n";
    const ev = parseEvents(out);
    assert.strictEqual(ev.length, 3);
    assert.strictEqual(new Date(ev[0].date).getHours(), 9);
    assert.strictEqual(ev[1].allDay, true);
    assert.strictEqual(ev[1].title, "יום הולדת לדנה");
    const noIcal = await sh(icalCmd());
    assert.strictEqual(noIcal.trim(), "@@NOICALBUDDY");
  });

  await test("tasks parse + toggle via perl", async () => {
    const f = path.join(tmp, "tasks.md");
    fs.writeFileSync(f, "# Work\n- [ ] Email Dana\n- [x] Ship v1\n  - [ ] sub item\n\n# Home\n* [X] Groceries\nnot a task\n");
    const items = parseTasks(fs.readFileSync(f, "utf8"));
    assert.deepStrictEqual(items.map((i) => i.kind), ["heading", "task", "task", "task", "heading", "task"]);
    assert.strictEqual(items[3].indent, true);
    assert.strictEqual(items[5].done, true);
    const cmd = toggleCmd(2).replace(/'[^']*widget-tasks\.md'|"\$HOME"'[^']*'/, "'" + f + "'");
    await sh(cmd);
    assert.ok(fs.readFileSync(f, "utf8").split("\n")[1] === "- [x] Email Dana");
    await sh(toggleCmd(7).replace(/"\$HOME"'[^']*'/, "'" + f + "'"));
    assert.ok(fs.readFileSync(f, "utf8").split("\n")[6] === "* [ ] Groceries");
  });

  await test("now playing parse + shell syntax", async () => {
    const tr = parseTrack("Spotify|||playing|||Song|||Artist|||Album|||83,5|||215.3|||https://i.scdn.co/image/x");
    assert.strictEqual(tr.position, 83.5);
    assert.strictEqual(tr.playing, true);
    assert.strictEqual(parseTrack(""), null);
    const r = require("child_process").spawnSync("bash", ["-n"], { input: NOWPLAYING_CMD, encoding: "utf8" });
    assert.strictEqual(r.status, 0, r.stderr);
  });

  await test("system command syntax + parse", () => {
    const r = require("child_process").spawnSync("bash", ["-n"], { input: SYSTEM_CMD, encoding: "utf8" });
    assert.strictEqual(r.status, 0, r.stderr);
    const out = "cpu=12.5\nmemtotal=17179869184\nmemused=9663676416\ndisk=482797652 210000000 250000000\nbattsrc=Battery Power\nbatt=76\nbattstate=discharging\nbattleft=5:12\nboot=1763000000\nnow=1763373600\nnet=1000000 200000\ntop=23.4|Google Chrome Helper;5.0|WindowServer;1.2|Übersicht";
    const s1 = systemUpdate({ type: "UB/COMMAND_RAN", output: out }, {});
    assert.strictEqual(s1.cpu, 12.5);
    assert.strictEqual(s1.batt, 76);
    assert.strictEqual(s1.onAC, false);
    assert.strictEqual(s1.top.length, 3);
    assert.strictEqual(s1.top[2].name, "Übersicht");
    const s2 = systemUpdate({ type: "UB/COMMAND_RAN", output: out.replace("net=1000000 200000", "net=1500000 300000") }, Object.assign({}, s1, { at: s1.at - 5000 }));
    assert.ok(Math.abs(s2.rateIn - 100000) < 2000, "rate " + s2.rateIn);
  });

  await test("countdown yearly rollover", () => {
    const now = new Date(2026, 10, 17, 12).getTime();
    assert.strictEqual(nextOccurrence({ date: "1990-06-20", repeat: "yearly" }, now).getFullYear(), 2027);
    assert.strictEqual(nextOccurrence({ date: "1990-12-01", repeat: "yearly" }, now).getFullYear(), 2026);
    assert.strictEqual(nextOccurrence({ date: "1990-11-17", repeat: "yearly" }, now).getDate(), 17);
  });

  await test("gematria (Hebrew numerals)", () => {
    assert.strictEqual(gematria(7), "ז׳");
    assert.strictEqual(gematria(15), "ט״ו");
    assert.strictEqual(gematria(16), "ט״ז");
    assert.strictEqual(gematria(30), "ל׳");
    assert.strictEqual(gematria(5787), "תשפ״ז");
    assert.strictEqual(gematria(5800), "ת״ת");
  });

  await test("custom widget output parsing", () => {
    const s = customUpdate({ type: "UB/COMMAND_RAN", output: "@@ITEM 0\n192.168.1.5\n@@ITEM 1\n\n@@ITEM 2\nline a\nline b\n" }, {});
    assert.strictEqual(s.values[0], "192.168.1.5");
    assert.strictEqual(s.values[1], "");
  });

  results.forEach((r) => console.log(r.join("  ")));
  const failed = results.filter((r) => r[0] === "FAIL").length;
  console.log(failed ? failed + " FAILED" : "ALL " + results.length + " PASSED");
  process.exit(failed ? 1 : 0);
})();
