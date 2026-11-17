// Interface strings for Hebrew (default) and English. Set "lang" in config.json.
import config from "./config";

const STR = {
  he: {
    loading: "טוען…",
    error: "לא הצלחתי לטעון נתונים",
    updated: "עודכן",
    now: "עכשיו",
    minAgo: "לפני {n} דק׳",
    hourAgo: "לפני {n} שע׳",
    dayAgo: "לפני {n} ימים",
    yesterday: "אתמול",
    today: "היום",
    tomorrow: "מחר",
    inDays: "בעוד {n} ימים",
    inHours: "בעוד {n} שע׳",
    inMinutes: "בעוד {n} דק׳",

    greetMorning: "בוקר טוב",
    greetNoon: "צהריים טובים",
    greetEvening: "ערב טוב",
    greetNight: "לילה טוב",
    dayProgress: "היום",
    yearProgress: "השנה",
    week: "שבוע {n}",

    weather: "מזג אוויר",
    feels: "מרגיש",
    humidity: "לחות",
    wind: "רוח",
    kmh: "קמ״ש",
    sunrise: "זריחה",
    sunset: "שקיעה",

    system: "מצב המערכת",
    cpu: "מעבד",
    ram: "זיכרון",
    disk: "דיסק",
    battery: "סוללה",
    charging: "בטעינה",
    charged: "טעונה",
    onAC: "מחובר לחשמל",
    remaining: "נותרו {t}",
    free: "פנויים",
    uptime: "פועל {t}",
    topProcs: "תהליכים מובילים",

    calendar: "יומן",
    noEvents: "אין אירועים קרובים",
    installIcal: "כדי לראות אירועים מהיומן הריצו: brew install ical-buddy",
    allDay: "כל היום",

    tasks: "משימות",
    noFile: "לא נמצא קובץ משימות:",
    tasksDone: "{d}/{t} הושלמו",
    allDone: "הכול הושלם! 🎉",

    countdown: "ספירה לאחור",
    days: "ימים",
    day: "יום",
    hours: "שעות",
    passed: "עבר",
    itsToday: "היום! 🎉",

    claude: "Claude",
    statusOk: "כל המערכות תקינות",
    statusMinor: "תקלה חלקית",
    statusMajor: "תקלה משמעותית",
    statusCritical: "השבתה",
    statusUnknown: "סטטוס לא זמין",
    claudeTasks: "משימות של Claude Code",
    claudeSessions: "סשנים אחרונים",
    activeNow: "פעיל",
    noClaudeTasks: "אין משימות פתוחות",
    noSessions: "אין סשנים מהימים האחרונים",
    sessionsToday: "{n} היום",
    untitled: "(ללא כותרת)",

    news: "חדשות",
    marketNews: "חדשות שוק",
    noNews: "אין כותרות חדשות",

    market: "שוק ההון",
    open: "פתוח",
    closed: "סגור",

    nowPlaying: "מתנגן עכשיו",
    nothingPlaying: "לא מתנגן כרגע",
    paused: "מושהה",

    shabbat: "שבת וחגים",
    candles: "הדלקת נרות",
    havdalah: "צאת שבת",
    upcomingHolidays: "חגים ומועדים קרובים",
    shabbatShalom: "שבת שלום",
  },
  en: {
    loading: "Loading…",
    error: "Couldn't load data",
    updated: "Updated",
    now: "now",
    minAgo: "{n}m ago",
    hourAgo: "{n}h ago",
    dayAgo: "{n}d ago",
    yesterday: "Yesterday",
    today: "Today",
    tomorrow: "Tomorrow",
    inDays: "in {n} days",
    inHours: "in {n}h",
    inMinutes: "in {n}m",

    greetMorning: "Good morning",
    greetNoon: "Good afternoon",
    greetEvening: "Good evening",
    greetNight: "Good night",
    dayProgress: "Day",
    yearProgress: "Year",
    week: "Week {n}",

    weather: "Weather",
    feels: "Feels",
    humidity: "Humidity",
    wind: "Wind",
    kmh: "km/h",
    sunrise: "Sunrise",
    sunset: "Sunset",

    system: "System",
    cpu: "CPU",
    ram: "Memory",
    disk: "Disk",
    battery: "Battery",
    charging: "Charging",
    charged: "Charged",
    onAC: "On AC power",
    remaining: "{t} left",
    free: "free",
    uptime: "Up {t}",
    topProcs: "Top processes",

    calendar: "Calendar",
    noEvents: "No upcoming events",
    installIcal: "To show calendar events run: brew install ical-buddy",
    allDay: "All day",

    tasks: "Tasks",
    noFile: "Tasks file not found:",
    tasksDone: "{d}/{t} done",
    allDone: "All done! 🎉",

    countdown: "Countdown",
    days: "days",
    day: "day",
    hours: "hours",
    passed: "passed",
    itsToday: "Today! 🎉",

    claude: "Claude",
    statusOk: "All systems operational",
    statusMinor: "Partial outage",
    statusMajor: "Major outage",
    statusCritical: "Critical outage",
    statusUnknown: "Status unavailable",
    claudeTasks: "Claude Code tasks",
    claudeSessions: "Recent sessions",
    activeNow: "active",
    noClaudeTasks: "No open tasks",
    noSessions: "No recent sessions",
    sessionsToday: "{n} today",
    untitled: "(untitled)",

    news: "News",
    marketNews: "Market news",
    noNews: "No fresh headlines",

    market: "Markets",
    open: "open",
    closed: "closed",

    nowPlaying: "Now playing",
    nothingPlaying: "Nothing playing",
    paused: "Paused",

    shabbat: "Shabbat & holidays",
    candles: "Candle lighting",
    havdalah: "Havdalah",
    upcomingHolidays: "Upcoming holidays",
    shabbatShalom: "Shabbat Shalom",
  },
};

export const lang = config.lang === "en" ? "en" : "he";
export const dir = lang === "he" ? "rtl" : "ltr";
export const locale = lang === "he" ? "he-IL" : "en-US";

export function t(key, vars) {
  let s = STR[lang][key];
  if (s === undefined) s = STR.en[key];
  if (s === undefined) s = key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      s = s.replace("{" + k + "}", vars[k]);
    });
  }
  return s;
}
