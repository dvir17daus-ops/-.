// Number, date and time formatting shared by the widgets.
import { t, locale } from "./i18n";

export function relTime(when, now) {
  const ms = (now || Date.now()) - (when instanceof Date ? when.getTime() : when);
  const min = Math.round(ms / 60000);
  if (min < 1) return t("now");
  if (min < 60) return t("minAgo", { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t("hourAgo", { n: h });
  const d = Math.round(h / 24);
  if (d === 1) return t("yesterday");
  return t("dayAgo", { n: d });
}

export function untilText(when, now) {
  const ms = (when instanceof Date ? when.getTime() : when) - (now || Date.now());
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return t("inMinutes", { n: min });
  const h = Math.round(min / 60);
  if (h < 36) return t("inHours", { n: h });
  return t("inDays", { n: Math.round(h / 24) });
}

const nfCache = {};
export function num(value, digits) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const d = digits === undefined ? 2 : digits;
  const k = String(d);
  if (!nfCache[k]) {
    nfCache[k] = new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  return nfCache[k].format(value);
}

export const signedPct = (v) => (v > 0 ? "+" : "") + num(v, 2) + "%";

export function bytes(n) {
  if (!n && n !== 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return num(v, v >= 100 || i === 0 ? 0 : 1) + " " + units[i];
}

export function duration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return d + "d " + h + "h";
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

export const mmss = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

export function timeOf(date, opts) {
  return new Intl.DateTimeFormat(locale, Object.assign({ hour: "2-digit", minute: "2-digit", hour12: false }, opts || {})).format(date);
}

export const truncate = (s, n) => {
  const str = String(s || "").replace(/\s+/g, " ").trim();
  return str.length > n ? str.slice(0, n - 1).trim() + "…" : str;
};

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const isoDate = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

// Parse "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM" as *local* time.
export function parseLocal(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}
