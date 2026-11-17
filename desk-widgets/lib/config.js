// Loads ../config.json and fills in safe defaults for anything missing.
// Übersicht watches config.json, so saving it updates the widgets live.
import user from "../config.json";

const DEFAULTS = {
  lang: "he",
  name: "",
  theme: {
    mode: "auto",
    accent: "#D97757",
    width: 290,
    radius: 18,
    opacity: 0.55,
    blur: 22,
    fontSize: 13,
    font: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  },
  clock: { enabled: true, position: { top: 20, left: 20 }, worldClocks: [] },
  weather: { enabled: true, position: { top: 251, left: 20 }, units: "celsius", days: 5, refreshMinutes: 15 },
  shabbat: { enabled: true, position: { top: 557, right: 20 }, timeZone: "Asia/Jerusalem", candleMinutesBeforeSunset: 18, israel: true, upcomingHolidays: 2, refreshMinutes: 180 },
  system: { enabled: true, position: { bottom: 20, left: 20 }, refreshSeconds: 5, showTopProcesses: true, showNetwork: true },
  calendar: { enabled: true, position: { top: 20, left: 326 }, showMonthGrid: true, weekStartsOn: 0, days: 3, maxEvents: 6, calendars: [], excludeCalendars: [], refreshMinutes: 5 },
  tasks: { enabled: true, position: { top: 391, left: 326 }, file: "~/Documents/widget-tasks.md", maxItems: 8, showCompleted: true, refreshSeconds: 15 },
  countdown: { enabled: true, position: { bottom: 20, left: 326 }, showPast: false, events: [] },
  claude: { enabled: true, position: { top: 20, right: 326 }, claudeDir: "~/.claude", showStatus: true, showTasks: true, showSessions: true, showCompleted: true, maxTasks: 5, maxSessions: 3, lookbackDays: 7, refreshSeconds: 20 },
  news: { enabled: true, position: { bottom: 20, right: 326 }, maxItems: 4, maxAgeHours: 24, refreshMinutes: 10, feeds: [], keywords: [] },
  quote: { enabled: true, position: { top: 493, left: 20 }, rotateMinutes: 60, quotes: [] },
  market: { enabled: true, position: { top: 20, right: 20 }, range: "1d", interval: "5m", refreshMinutes: 2, symbols: [] },
  marketNews: { enabled: true, position: { top: 336, right: 20 }, maxItems: 3, maxAgeHours: 24, refreshMinutes: 10, feeds: [], keywords: [] },
  nowPlaying: { enabled: true, position: { bottom: 20, right: 20 }, hideWhenIdle: false, refreshSeconds: 3 },
  custom: { enabled: false, position: { top: 20, left: "calc(50% - 130px)" }, width: 260, refreshSeconds: 60, items: [] },
  ticker: { enabled: false, position: { bottom: 0, left: 0, right: 0 }, speedSeconds: 60, refreshMinutes: 2, useMarketSymbols: true, symbols: [] },
};

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Deep-merge plain objects. Arrays and scalars from `over` replace `base`.
// `position` is replaced as a whole, so {"right": 20} doesn't keep a default "left".
export function merge(base, over, key) {
  if (over === undefined) return base;
  if (key === "position" || !isObj(base) || !isObj(over)) return over;
  const out = Object.assign({}, base);
  Object.keys(over).forEach((k) => {
    out[k] = merge(base[k], over[k], k);
  });
  return out;
}

const config = merge(DEFAULTS, isObj(user) ? user : {});

export default config;
export const theme = config.theme;
export const widget = (name) => config[name] || {};
export const isEnabled = (name) => widget(name).enabled !== false;
