// System monitor: CPU, memory, disk, battery, network throughput, top processes.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Ring, Message, Section, widgetClass, Nothing } from "./lib/ui";
import { t } from "./lib/i18n";
import { sh } from "./lib/shell";
import { bytes, duration, num } from "./lib/format";

const cfg = widget("system");
const enabled = cfg.enabled !== false;

export const CMD = String.raw`
echo "cpu=$(top -l 2 -n 0 -s 1 | awk '/CPU usage/ {v=$7} END {gsub("%","",v); if (v != "") print 100-v}')"
echo "memtotal=$(sysctl -n hw.memsize)"
echo "memused=$(vm_stat | awk '/page size of/ {ps=$8} /Pages active/ {a=$3} /Pages wired down/ {w=$4} /occupied by compressor/ {c=$5} END {printf "%.0f", (a+w+c)*ps}')"
dl=$(df -k /System/Volumes/Data | awk 'NR==2 {print $2, $3, $4}')
[ -z "$dl" ] && dl=$(df -k / | awk 'NR==2 {print $2, $3, $4}')
echo "disk=$dl"
b=$(pmset -g batt)
echo "battsrc=$(echo "$b" | head -n 1 | sed -E "s/.*'(.*)'.*/\1/")"
echo "batt=$(echo "$b" | grep -Eo '[0-9]+%' | head -n 1 | tr -d %)"
echo "battstate=$(echo "$b" | grep -Eo '[0-9]+%; [a-zA-Z ]+' | head -n 1 | sed -E 's/.*; //')"
echo "battleft=$(echo "$b" | grep -Eo '[0-9]+:[0-9]+ remaining' | head -n 1 | cut -d' ' -f1)"
echo "boot=$(sysctl -n kern.boottime | awk '{print $4}' | tr -d ,)"
echo "now=$(date +%s)"
ifc=$(route -n get default | awk '/interface:/ {print $2}')
[ -n "$ifc" ] && echo "net=$(netstat -ibn -I "$ifc" | awk 'NR>1 && $3 ~ /Link/ {print $7, $10; exit}')"
echo "top=$(ps -Aceo pcpu,comm -r | sed -n 2,4p | awk '{p=$1; $1=""; sub(/^ +/, ""); printf "%s%s|%s", (NR>1 ? ";" : ""), p, $0}')"
`;

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(2, cfg.refreshSeconds || 5) * 1000;
export const initialState = {};
export const command = enabled ? () => sh(CMD) : undefined;

function parse(output) {
  const m = {};
  String(output || "")
    .split("\n")
    .forEach((line) => {
      const i = line.indexOf("=");
      if (i > 0) m[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  return m;
}

export const updateState = (event, prev) => {
  if (event.type !== "UB/COMMAND_RAN" || event.error || !event.output) return prev;
  const m = parse(event.output);
  const s = { at: Date.now() };

  s.cpu = m.cpu !== undefined && m.cpu !== "" ? parseFloat(m.cpu) : null;

  const memTotal = parseFloat(m.memtotal);
  const memUsed = parseFloat(m.memused);
  if (memTotal > 0 && memUsed >= 0) {
    s.memTotal = memTotal;
    s.memUsed = Math.min(memUsed, memTotal);
  }

  const disk = (m.disk || "").split(/\s+/).map(Number);
  if (disk.length === 3 && disk[0] > 0) {
    // df -k reports 1K blocks. Used = total - available (APFS shares free space between volumes).
    s.diskTotal = disk[0] * 1024;
    s.diskFree = disk[2] * 1024;
  }

  if (m.batt) {
    s.batt = parseInt(m.batt, 10);
    s.battState = m.battstate || "";
    s.battLeft = m.battleft || "";
    s.onAC = /AC/.test(m.battsrc || "");
  }

  const boot = parseInt(m.boot, 10);
  const now = parseInt(m.now, 10);
  if (boot > 0 && now > 0) s.uptime = now - boot;

  const net = (m.net || "").split(/\s+/).map(Number);
  if (net.length === 2 && !isNaN(net[0])) {
    s.netIn = net[0];
    s.netOut = net[1];
    if (prev && prev.netIn !== undefined && prev.at) {
      const dt = (s.at - prev.at) / 1000;
      if (dt > 0) {
        s.rateIn = Math.max(0, (s.netIn - prev.netIn) / dt);
        s.rateOut = Math.max(0, (s.netOut - prev.netOut) / dt);
      }
    }
  }

  s.top = (m.top || "")
    .split(";")
    .filter(Boolean)
    .map((p) => {
      const j = p.indexOf("|");
      return { cpu: parseFloat(p.slice(0, j)), name: p.slice(j + 1) };
    });
  return s;
};

const level = (v) => (v >= 85 ? "var(--dw-down)" : v >= 60 ? "var(--dw-warn)" : "var(--dw-accent)");

const rings = css({ display: "flex", justifyContent: "space-between", gap: 4 });
const sub = css({
  fontSize: "0.68em",
  color: "var(--dw-faint)",
  textAlign: "center",
  marginTop: 1,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});
const netRow = css({
  display: "flex",
  justifyContent: "space-around",
  marginTop: 10,
  paddingTop: 8,
  borderTop: "1px solid var(--dw-line)",
  fontSize: "0.82em",
  fontVariantNumeric: "tabular-nums",
  direction: "ltr",
});
const procRow = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  fontSize: "0.82em",
  padding: "1px 0",
  direction: "ltr",
});
const procName = css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 });
const procCpu = css({ color: "var(--dw-muted)", fontVariantNumeric: "tabular-nums" });

function battLabel(s) {
  if (s.battState === "charging") return "⚡ " + t("charging");
  if (s.battState === "charged" || (s.onAC && s.batt >= 99)) return t("charged");
  if (s.battLeft && s.battLeft !== "0:00") return t("remaining", { t: s.battLeft });
  return s.onAC ? t("onAC") : "";
}

function renderSystem(s) {
  if (!s || !s.at) {
    return (
      <Card icon="🖥️" title={t("system")}>
        <Message text={t("loading")} />
      </Card>
    );
  }
  const memPct = s.memTotal ? (s.memUsed / s.memTotal) * 100 : null;
  const diskPct = s.diskTotal ? ((s.diskTotal - s.diskFree) / s.diskTotal) * 100 : null;
  const battColor = s.batt <= 20 && s.battState !== "charging" ? "var(--dw-down)" : "var(--dw-up)";

  return (
    <Card icon="🖥️" title={t("system")} right={s.uptime ? t("uptime", { t: duration(s.uptime) }) : null}>
      <div className={rings}>
        <div>
          <Ring value={s.cpu || 0} color={level(s.cpu || 0)} label={t("cpu")} />
        </div>
        {memPct !== null ? (
          <div>
            <Ring value={memPct} color={level(memPct)} label={t("ram")} />
            <div className={sub}>
              {num(s.memUsed / 1073741824, 1)}/{num(s.memTotal / 1073741824, 0)}GB
            </div>
          </div>
        ) : null}
        {diskPct !== null ? (
          <div>
            <Ring value={diskPct} color={level(diskPct)} label={t("disk")} />
            <div className={sub}>{bytes(s.diskFree)} {t("free")}</div>
          </div>
        ) : null}
        {s.batt !== undefined ? (
          <div>
            <Ring value={s.batt} color={battColor} label={t("battery")} />
            <div className={sub}>{battLabel(s)}</div>
          </div>
        ) : null}
      </div>

      {cfg.showNetwork !== false && s.rateIn !== undefined ? (
        <div className={netRow}>
          <span>↓ {bytes(s.rateIn)}/s</span>
          <span>↑ {bytes(s.rateOut)}/s</span>
        </div>
      ) : null}

      {cfg.showTopProcesses !== false && s.top && s.top.length ? (
        <div>
          <Section title={t("topProcs")} />
          {s.top.map((p, i) => (
            <div className={procRow} key={i}>
              <span className={procName}>{p.name}</span>
              <span className={procCpu}>{num(p.cpu, 1)}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export const render = enabled ? renderSystem : Nothing;
