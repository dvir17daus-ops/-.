// Calendar: month grid + upcoming events from macOS Calendar (via icalBuddy).
// Install icalBuddy once:  brew install ical-buddy
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, widgetClass, Nothing, ellipsis } from "./lib/ui";
import { t, locale } from "./lib/i18n";
import { sh, q } from "./lib/shell";
import { sameDay, startOfDay, parseLocal } from "./lib/format";

const cfg = widget("calendar");
const enabled = cfg.enabled !== false;
const SEP = "~~";

export function icalCmd() {
  const days = Math.max(0, Math.min(30, cfg.days === undefined ? 3 : cfg.days));
  const filters = [];
  if (cfg.calendars && cfg.calendars.length) filters.push("-ic " + q(cfg.calendars.join(",")));
  if (cfg.excludeCalendars && cfg.excludeCalendars.length) filters.push("-ec " + q(cfg.excludeCalendars.join(",")));
  return [
    "if command -v icalBuddy >/dev/null; then",
    "icalBuddy -nc -nrd -npn -b '' -ps " + q("| " + SEP + " |") + " -po 'datetime,title' -iep 'datetime,title'",
    "-df '%Y-%m-%d' -tf '%H:%M' -eed " + filters.join(" ") + " eventsToday+" + days + ";",
    "else echo '@@NOICALBUDDY'; fi",
  ].join(" ");
}

export function parseEvents(output) {
  return String(output || "")
    .split("\n")
    .map((line) => {
      const i = line.indexOf(SEP);
      if (i < 0) return null;
      const when = line.slice(0, i);
      const title = line.slice(i + SEP.length).trim();
      const d = when.match(/(\d{4}-\d{2}-\d{2})/);
      if (!d || !title) return null;
      const tm = when.match(/(\d{1,2}):(\d{2})/);
      const date = parseLocal(d[1]);
      if (tm) date.setHours(+tm[1], +tm[2]);
      return { date: date.getTime(), allDay: !tm, title };
    })
    .filter(Boolean);
}

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(1, cfg.refreshMinutes || 5) * 60 * 1000;
export const initialState = { events: null, missing: false, now: Date.now() };
export const command = enabled ? () => sh(icalCmd()) : undefined;

export const updateState = (event, prev) => {
  if (event.type !== "UB/COMMAND_RAN" || event.error) return prev;
  const out = String(event.output || "");
  if (out.indexOf("@@NOICALBUDDY") !== -1) return { events: [], missing: true, now: Date.now() };
  return { events: parseEvents(out), missing: false, now: Date.now() };
};

const grid = css({ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px 0", textAlign: "center" });
const wd = css({ fontSize: "0.68em", color: "var(--dw-faint)", fontWeight: 600, paddingBottom: 3 });
const dayCell = css({
  position: "relative",
  fontSize: "0.78em",
  lineHeight: "22px",
  height: 22,
  width: 22,
  margin: "0 auto",
  borderRadius: "50%",
  fontVariantNumeric: "tabular-nums",
});
const evDot = css({
  position: "absolute",
  bottom: 1,
  left: "50%",
  width: 3,
  height: 3,
  marginLeft: -1.5,
  borderRadius: "50%",
  background: "var(--dw-accent)",
});
const list = css({ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--dw-line)" });
const dayHead = css({ fontSize: "0.72em", color: "var(--dw-faint)", fontWeight: 600, margin: "6px 0 2px" });
const evRow = css({ display: "flex", gap: 8, alignItems: "baseline", fontSize: "0.88em", padding: "1px 0" });
const evTime = css({
  flex: "none",
  width: 42,
  color: "var(--dw-accent)",
  fontWeight: 600,
  fontSize: "0.92em",
  fontVariantNumeric: "tabular-nums",
});
const hint = css({ fontSize: "0.76em", color: "var(--dw-muted)", direction: "ltr", textAlign: "start" });

const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
const wdFmt = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
const dayLabelFmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false });

function MonthGrid({ now, events }) {
  const today = new Date(now);
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const start = Number(cfg.weekStartsOn) || 0;
  const lead = (first.getDay() - start + 7) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const busy = {};
  (events || []).forEach((e) => {
    const ed = new Date(e.date);
    if (ed.getMonth() === today.getMonth()) busy[ed.getDate()] = true;
  });
  const names = [];
  for (let i = 0; i < 7; i++) {
    // 2023-01-01 was a Sunday.
    names.push(wdFmt.format(new Date(2023, 0, 1 + ((start + i) % 7))));
  }
  return (
    <div className={grid}>
      {names.map((n, i) => (
        <div className={wd} key={"w" + i}>
          {n}
        </div>
      ))}
      {cells.map((d, i) => {
        const isToday = d === today.getDate();
        return (
          <div key={i}>
            {d ? (
              <div
                className={dayCell}
                style={isToday ? { background: "var(--dw-accent)", color: "#fff", fontWeight: 700 } : null}
              >
                {d}
                {busy[d] && !isToday ? <span className={evDot} /> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function dayLabel(date, now) {
  const today = startOfDay(new Date(now));
  const tomorrow = new Date(today.getTime() + 86400000);
  if (sameDay(date, today)) return t("today");
  if (sameDay(date, tomorrow)) return t("tomorrow");
  return dayLabelFmt.format(date);
}

function renderCalendar({ events, missing, now }) {
  const title = monthFmt.format(new Date(now));
  const upcoming = (events || [])
    .filter((e) => e.allDay || e.date >= now - 15 * 60000)
    .slice(0, cfg.maxEvents || 6);
  const groups = [];
  upcoming.forEach((e) => {
    const label = dayLabel(new Date(e.date), now);
    const g = groups.length && groups[groups.length - 1].label === label ? groups[groups.length - 1] : null;
    if (g) g.items.push(e);
    else groups.push({ label, items: [e] });
  });

  return (
    <Card icon="📅" title={title}>
      {cfg.showMonthGrid !== false ? <MonthGrid now={now} events={events} /> : null}
      <div className={cfg.showMonthGrid !== false ? list : null}>
        {events === null ? <Message text={t("loading")} /> : null}
        {missing ? <div className={hint}>{t("installIcal")}</div> : null}
        {events && !missing && !upcoming.length ? <Message text={t("noEvents")} /> : null}
        {groups.map((g) => (
          <div key={g.label}>
            <div className={dayHead}>{g.label}</div>
            {g.items.map((e, i) => (
              <div className={evRow} key={i}>
                <span className={evTime}>{e.allDay ? "•" : timeFmt.format(new Date(e.date))}</span>
                <span className={ellipsis} dir="auto">
                  {e.title}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export const render = enabled ? renderCalendar : Nothing;
