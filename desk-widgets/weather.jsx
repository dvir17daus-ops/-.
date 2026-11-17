// Weather: current conditions + multi-day forecast from Open-Meteo (no API key).
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, widgetClass, Nothing } from "./lib/ui";
import { t, locale, lang } from "./lib/i18n";
import { fetchJSON } from "./lib/shell";
import { resolveLocation } from "./lib/geo";
import { parseLocal, timeOf } from "./lib/format";

const cfg = widget("weather");
const enabled = cfg.enabled !== false;

// WMO weather code -> [day icon, night icon, Hebrew, English]
const WMO = {
  0: ["☀️", "🌙", "בהיר", "Clear"],
  1: ["🌤️", "🌙", "בהיר ברובו", "Mainly clear"],
  2: ["⛅", "☁️", "מעונן חלקית", "Partly cloudy"],
  3: ["☁️", "☁️", "מעונן", "Overcast"],
  45: ["🌫️", "🌫️", "ערפל", "Fog"],
  48: ["🌫️", "🌫️", "ערפל קפוא", "Rime fog"],
  51: ["🌦️", "🌧️", "טפטוף קל", "Light drizzle"],
  53: ["🌦️", "🌧️", "טפטוף", "Drizzle"],
  55: ["🌧️", "🌧️", "טפטוף חזק", "Dense drizzle"],
  56: ["🌧️", "🌧️", "טפטוף קפוא", "Freezing drizzle"],
  57: ["🌧️", "🌧️", "טפטוף קפוא", "Freezing drizzle"],
  61: ["🌦️", "🌧️", "גשם קל", "Light rain"],
  63: ["🌧️", "🌧️", "גשם", "Rain"],
  65: ["🌧️", "🌧️", "גשם חזק", "Heavy rain"],
  66: ["🌧️", "🌧️", "גשם קפוא", "Freezing rain"],
  67: ["🌧️", "🌧️", "גשם קפוא", "Freezing rain"],
  71: ["🌨️", "🌨️", "שלג קל", "Light snow"],
  73: ["🌨️", "🌨️", "שלג", "Snow"],
  75: ["❄️", "❄️", "שלג כבד", "Heavy snow"],
  77: ["🌨️", "🌨️", "גרגרי שלג", "Snow grains"],
  80: ["🌦️", "🌧️", "ממטרים קלים", "Light showers"],
  81: ["🌧️", "🌧️", "ממטרים", "Showers"],
  82: ["⛈️", "⛈️", "ממטרים עזים", "Violent showers"],
  85: ["🌨️", "🌨️", "ממטרי שלג", "Snow showers"],
  86: ["🌨️", "🌨️", "ממטרי שלג", "Snow showers"],
  95: ["⛈️", "⛈️", "סופת רעמים", "Thunderstorm"],
  96: ["⛈️", "⛈️", "סופת רעמים וברד", "Thunderstorm, hail"],
  99: ["⛈️", "⛈️", "סופת רעמים וברד", "Thunderstorm, hail"],
};
const wmo = (code) => WMO[code] || ["🌡️", "🌡️", "", ""];

function forecastUrl(loc) {
  const p = [
    "latitude=" + loc.lat,
    "longitude=" + loc.lon,
    "current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    "daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    "timezone=auto",
    "forecast_days=" + Math.max(1, Math.min(10, cfg.days || 5)),
    "wind_speed_unit=kmh",
  ];
  if (cfg.units === "fahrenheit") p.push("temperature_unit=fahrenheit");
  return "https://api.open-meteo.com/v1/forecast?" + p.join("&");
}

export const className = widgetClass(cfg);
export const refreshFrequency = (cfg.refreshMinutes || 15) * 60 * 1000;
export const initialState = { loading: true };

export const command = enabled
  ? (dispatch) =>
      resolveLocation(cfg)
        .then((loc) => fetchJSON(forecastUrl(loc)).then((data) => dispatch({ type: "DATA", data, loc, at: Date.now() })))
        .catch((err) => dispatch({ type: "ERROR", error: String(err && err.message ? err.message : err) }))
  : undefined;

export const updateState = (event, prev) => {
  if (event.type === "DATA") return { data: event.data, loc: event.loc, at: event.at };
  if (event.type === "ERROR") return Object.assign({}, prev, { loading: false, error: event.error });
  return prev;
};

const nowRow = css({ display: "flex", alignItems: "center", gap: 12 });
const bigIcon = css({ fontSize: "2.7em", lineHeight: 1 });
const tempCls = css({ fontSize: "2.6em", fontWeight: 300, lineHeight: 1, fontVariantNumeric: "tabular-nums" });
const descCls = css({ fontWeight: 600, fontSize: "0.98em" });
const detailCls = css({ fontSize: "0.78em", color: "var(--dw-muted)", marginTop: 3, lineHeight: 1.45, whiteSpace: "nowrap" });
const days = css({
  display: "flex",
  justifyContent: "space-between",
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid var(--dw-line)",
});
const dayCls = css({ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, minWidth: 0 });
const dayName = css({ fontSize: "0.74em", color: "var(--dw-muted)", whiteSpace: "nowrap" });
const dayIcon = css({ fontSize: "1.35em", lineHeight: 1.3 });
const hi = css({ fontSize: "0.86em", fontWeight: 600, fontVariantNumeric: "tabular-nums" });
const lo = css({ fontSize: "0.78em", color: "var(--dw-faint)", fontVariantNumeric: "tabular-nums" });
const rain = css({ fontSize: "0.68em", color: "var(--dw-info)", fontVariantNumeric: "tabular-nums" });

const dayFmt = new Intl.DateTimeFormat(locale, { weekday: lang === "he" ? "narrow" : "short" });
const deg = (v) => (v === null || v === undefined ? "—" : Math.round(v) + "°");

function renderWeather({ data, loc, at, error }) {
  const title = loc && loc.name ? loc.name : cfg.city || t("weather");
  if (!data) {
    return (
      <Card icon="📍" title={title}>
        <Message text={error ? t("error") : t("loading")} />
      </Card>
    );
  }
  const cur = data.current || {};
  const daily = data.daily || {};
  const isDay = cur.is_day !== 0;
  const w = wmo(cur.weather_code);
  const sunrise = daily.sunrise && daily.sunrise[0] ? timeOf(new Date(daily.sunrise[0])) : null;
  const sunset = daily.sunset && daily.sunset[0] ? timeOf(new Date(daily.sunset[0])) : null;

  return (
    <Card icon="📍" title={title} right={at ? timeOf(new Date(at)) : null}>
      <div className={nowRow}>
        <span className={bigIcon}>{isDay ? w[0] : w[1]}</span>
        <span className={tempCls}>{deg(cur.temperature_2m)}</span>
        <div style={{ minWidth: 0 }}>
          <div className={descCls}>{lang === "he" ? w[2] : w[3]}</div>
          <div className={detailCls}>
            <div>
              {t("feels")} {deg(cur.apparent_temperature)} · {t("humidity")} {Math.round(cur.relative_humidity_2m || 0)}%
            </div>
            <div>
              {t("wind")} {Math.round(cur.wind_speed_10m || 0)} {t("kmh")}
            </div>
            {sunrise && sunset ? (
              <div>
                <span dir="ltr">
                  ☀︎ {sunrise} – {sunset}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {daily.time && daily.time.length > 1 ? (
        <div className={days}>
          {daily.time.map((day, i) => {
            const dw = wmo(daily.weather_code[i]);
            const p = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : null;
            return (
              <div className={dayCls} key={day}>
                <span className={dayName}>{i === 0 ? t("today") : dayFmt.format(parseLocal(day))}</span>
                <span className={dayIcon}>{dw[0]}</span>
                <span className={hi}>{deg(daily.temperature_2m_max[i])}</span>
                <span className={lo}>{deg(daily.temperature_2m_min[i])}</span>
                <span className={rain} style={{ visibility: p >= 20 ? "visible" : "hidden" }}>
                  💧{p || 0}%
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

export const render = enabled ? renderWeather : Nothing;
