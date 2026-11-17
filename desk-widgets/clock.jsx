// Clock: time, Gregorian + Hebrew date, greeting, day/year progress, world clocks.
import { css } from "uebersicht";
import config, { widget } from "./lib/config";
import { Card, Bar, widgetClass, Nothing } from "./lib/ui";
import { t, locale, lang } from "./lib/i18n";
import { isoDate } from "./lib/format";

const cfg = widget("clock");
const enabled = cfg.enabled !== false;

export const className = widgetClass(cfg);
export const refreshFrequency = 1000;
export const command = enabled ? (dispatch) => dispatch({ type: "TICK", now: Date.now() }) : undefined;
export const initialState = { now: Date.now() };
export const updateState = (event, prev) => (event.type === "TICK" ? { now: event.now } : prev);

const pad = (n) => String(n).padStart(2, "0");

const dateFmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

let hebrewFmt = null;
try {
  hebrewFmt = new Intl.DateTimeFormat(lang === "he" ? "he-IL-u-ca-hebrew" : "en-US-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
  });
} catch (e) {
  hebrewFmt = null;
}

// Numbers in Hebrew letters: 7 -> ז׳, 15 -> ט״ו, 5787 -> תשפ״ז
const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
export function gematria(num) {
  const n = num % 1000;
  const r = n % 100;
  let s = HUNDREDS[Math.floor(n / 100)];
  s += r === 15 ? "טו" : r === 16 ? "טז" : TENS[Math.floor(r / 10)] + ONES[r % 10];
  return s.length === 1 ? s + "׳" : s.slice(0, -1) + "״" + s.slice(-1);
}

function hebrewDate(d) {
  if (!hebrewFmt) return "";
  try {
    if (lang !== "he") return hebrewFmt.format(d);
    const parts = {};
    hebrewFmt.formatToParts(d).forEach((p) => {
      parts[p.type] = p.value;
    });
    const day = parseInt(parts.day, 10);
    const year = parseInt(parts.year, 10);
    if (!day || !year || !parts.month) return hebrewFmt.format(d);
    return gematria(day) + " ב" + parts.month.replace(/^ב/, "") + " " + gematria(year);
  } catch (e) {
    return "";
  }
}

const zoneFmts = {};
function zoneTime(tz, now) {
  try {
    if (!zoneFmts[tz]) {
      zoneFmts[tz] = {
        time: new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: !!cfg.hour12 }),
        day: new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }),
      };
    }
    const f = zoneFmts[tz];
    const theirDay = f.day.format(now);
    const ourDay = isoDate(now);
    const offset = theirDay > ourDay ? "+1" : theirDay < ourDay ? "-1" : "";
    return { time: f.time.format(now), offset };
  } catch (e) {
    return { time: "--:--", offset: "" };
  }
}

function greeting(h) {
  if (h >= 5 && h < 12) return t("greetMorning");
  if (h >= 12 && h < 17) return t("greetNoon");
  if (h >= 17 && h < 22) return t("greetEvening");
  return t("greetNight");
}

const greetCls = css({ fontSize: "0.9em", color: "var(--dw-muted)", marginBottom: 2 });
const timeRow = css({ display: "flex", alignItems: "baseline", gap: 6, direction: "ltr", justifyContent: "flex-end" });
const timeCls = css({
  fontSize: "3.7em",
  fontWeight: 200,
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
  fontVariantNumeric: "tabular-nums",
});
const secCls = css({ fontSize: "1.25em", fontWeight: 300, color: "var(--dw-muted)", fontVariantNumeric: "tabular-nums" });
const dateCls = css({ fontSize: "0.98em", fontWeight: 500, marginTop: 2 });
const hebCls = css({ fontSize: "0.88em", color: "var(--dw-muted)", marginTop: 1 });
const progRow = css({ display: "flex", gap: 12, marginTop: 11 });
const progItem = css({ flex: 1, minWidth: 0 });
const progLabel = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.72em",
  color: "var(--dw-faint)",
  marginBottom: 4,
  fontVariantNumeric: "tabular-nums",
});
const zones = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 11,
  paddingTop: 9,
  borderTop: "1px solid var(--dw-line)",
});
const zoneCls = css({ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 });
const zoneLabel = css({ fontSize: "0.72em", color: "var(--dw-faint)", whiteSpace: "nowrap" });
const zoneTimeCls = css({ fontSize: "0.98em", fontWeight: 500, fontVariantNumeric: "tabular-nums" });
const zoneOff = css({ fontSize: "0.68em", color: "var(--dw-accent)", marginInlineStart: 2 });

function renderClock({ now }) {
  const d = new Date(now);
  const h = d.getHours();
  const shownHour = cfg.hour12 ? h % 12 || 12 : h;
  const time = pad(shownHour) + ":" + pad(d.getMinutes());

  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayPct = ((now - dayStart) / 86400000) * 100;
  const yStart = new Date(d.getFullYear(), 0, 1).getTime();
  const yEnd = new Date(d.getFullYear() + 1, 0, 1).getTime();
  const yearPct = ((now - yStart) / (yEnd - yStart)) * 100;

  const name = config.name ? ", " + config.name : "";
  const world = cfg.worldClocks || [];

  return (
    <Card>
      {cfg.showGreeting !== false ? <div className={greetCls}>{greeting(h) + name}</div> : null}
      <div className={timeRow} style={{ justifyContent: lang === "he" ? "flex-end" : "flex-start" }}>
        <span className={timeCls}>{time}</span>
        {cfg.showSeconds ? <span className={secCls}>{pad(d.getSeconds())}</span> : null}
        {cfg.hour12 ? <span className={secCls}>{h < 12 ? "AM" : "PM"}</span> : null}
      </div>
      <div className={dateCls}>{dateFmt.format(d)}</div>
      {cfg.showHebrewDate !== false && hebrewFmt ? <div className={hebCls}>{hebrewDate(d)}</div> : null}

      {cfg.showProgress !== false ? (
        <div className={progRow}>
          <div className={progItem}>
            <div className={progLabel}>
              <span>{t("dayProgress")}</span>
              <span>{Math.floor(dayPct)}%</span>
            </div>
            <Bar value={dayPct} />
          </div>
          <div className={progItem}>
            <div className={progLabel}>
              <span>{t("yearProgress")}</span>
              <span>{Math.floor(yearPct)}%</span>
            </div>
            <Bar value={yearPct} />
          </div>
        </div>
      ) : null}

      {world.length ? (
        <div className={zones}>
          {world.map((z) => {
            const zt = zoneTime(z.timeZone, d);
            return (
              <div className={zoneCls} key={z.timeZone + z.label}>
                <span className={zoneLabel}>{z.label}</span>
                <span className={zoneTimeCls}>
                  {zt.time}
                  {zt.offset ? <span className={zoneOff}>{zt.offset}</span> : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

export const render = enabled ? renderClock : Nothing;
