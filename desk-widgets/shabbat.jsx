// Shabbat times (candle lighting, havdalah, weekly parasha) and upcoming
// Jewish holidays from Hebcal (free, no API key).
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, Section, widgetClass, Nothing } from "./lib/ui";
import { t, locale, lang } from "./lib/i18n";
import { fetchJSON } from "./lib/shell";
import { resolveLocation } from "./lib/geo";
import { isoDate, parseLocal, startOfDay, untilText } from "./lib/format";

const cfg = widget("shabbat");
const enabled = cfg.enabled !== false;
const hebcalLang = lang === "he" ? "he-x-NoNikud" : "s";

function shabbatUrl(loc) {
  return (
    "https://www.hebcal.com/shabbat?cfg=json&M=on" +
    "&latitude=" + loc.lat +
    "&longitude=" + loc.lon +
    "&tzid=" + encodeURIComponent(cfg.timeZone || "Asia/Jerusalem") +
    "&b=" + (cfg.candleMinutesBeforeSunset || 18) +
    "&lg=" + hebcalLang
  );
}

function holidaysUrl() {
  const start = new Date();
  const end = new Date(start.getTime() + 120 * 86400000);
  return (
    "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&ss=off&mf=off&c=off" +
    "&i=" + (cfg.israel === false ? "off" : "on") +
    "&start=" + isoDate(start) +
    "&end=" + isoDate(end) +
    "&lg=" + hebcalLang
  );
}

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(15, cfg.refreshMinutes || 180) * 60 * 1000;
export const initialState = { week: null, holidays: null };

export const command = enabled
  ? (dispatch) =>
      resolveLocation(cfg)
        .then((loc) =>
          Promise.all([fetchJSON(shabbatUrl(loc)), fetchJSON(holidaysUrl()).catch(() => ({ items: [] })), loc])
        )
        .then((res) => dispatch({ type: "DATA", week: res[0], holidays: res[1], place: res[2].name, at: Date.now() }))
        .catch((err) => dispatch({ type: "ERROR", error: String(err) }))
  : undefined;

export const updateState = (event, prev) => {
  if (event.type === "DATA") return { week: event.week, holidays: event.holidays, place: event.place, at: event.at };
  if (event.type === "ERROR") return Object.assign({}, prev, { error: event.error });
  return prev;
};

const name = (item) => (lang === "he" && item.hebrew ? item.hebrew : item.title);
// Show times in the location's time zone, even if the Mac is set to another one.
const tz = cfg.timeZone || "Asia/Jerusalem";
const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: tz });

const parasha = css({ fontSize: "1.05em", fontWeight: 600, marginBottom: 8 });
const times = css({ display: "flex", gap: 10 });
const timeBox = css({
  flex: 1,
  borderRadius: 12,
  background: "var(--dw-hover)",
  padding: "7px 8px",
  textAlign: "center",
  minWidth: 0,
});
const timeLabel = css({ fontSize: "0.72em", color: "var(--dw-muted)" });
const timeVal = css({ fontSize: "1.35em", fontWeight: 300, fontVariantNumeric: "tabular-nums" });
const timeSub = css({ fontSize: "0.66em", color: "var(--dw-faint)" });
const hRow = css({ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.86em", padding: "2px 0" });
const hWhen = css({ color: "var(--dw-faint)", fontSize: "0.9em", whiteSpace: "nowrap" });

function TimeBox({ icon, label, iso, now }) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    <div className={timeBox}>
      <div className={timeLabel}>
        {icon} {label}
      </div>
      <div className={timeVal}>{timeFmt.format(d)}</div>
      <div className={timeSub}>{d.getTime() > now ? untilText(d, now) : dayFmt.format(d)}</div>
    </div>
  );
}

function renderShabbat({ week, holidays, place, error }) {
  if (!week) {
    return (
      <Card icon="🕯️" title={t("shabbat")}>
        <Message text={error ? t("error") : t("loading")} />
      </Card>
    );
  }
  const now = Date.now();
  const items = week.items || [];
  const candles = items.filter((i) => i.category === "candles");
  const havdalah = items.filter((i) => i.category === "havdalah");
  const par = items.filter((i) => i.category === "parashat")[0];
  const today = startOfDay(new Date(now)).getTime();
  const upcoming = ((holidays && holidays.items) || [])
    .filter((i) => i.category === "holiday" && parseLocal(i.date) && parseLocal(i.date).getTime() >= today)
    .filter((i, idx, arr) => arr.findIndex((j) => name(j) === name(i)) === idx)
    .slice(0, cfg.upcomingHolidays === undefined ? 3 : cfg.upcomingHolidays);
  const hebcalPlace = week.location && week.location.title ? week.location.title.split(",")[0] : "";
  const location = place || (/^[-\d.\s]+$/.test(hebcalPlace) ? "" : hebcalPlace);

  return (
    <Card icon="🕯️" title={t("shabbat")} right={location}>
      {par ? (
        <div className={parasha} dir="auto">
          {name(par)}
        </div>
      ) : null}
      <div className={times}>
        <TimeBox icon="🕯️" label={t("candles")} iso={candles.length ? candles[candles.length - 1].date : null} now={now} />
        <TimeBox icon="✨" label={t("havdalah")} iso={havdalah.length ? havdalah[havdalah.length - 1].date : null} now={now} />
      </div>
      {upcoming.length ? (
        <div>
          <Section title={t("upcomingHolidays")} />
          {upcoming.map((h) => {
            const d = parseLocal(h.date);
            const days = Math.round((d.getTime() - today) / 86400000);
            return (
              <div className={hRow} key={h.date + h.title}>
                <span dir="auto">{name(h)}</span>
                <span className={hWhen}>{days === 0 ? t("today") : days === 1 ? t("tomorrow") : t("inDays", { n: days })}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

export const render = enabled ? renderShabbat : Nothing;
