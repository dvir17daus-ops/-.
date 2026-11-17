(function () {
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const day = (o) => { const d = new Date(now); d.setDate(d.getDate() + o); return d; };
  const at = (o, h, m) => { const d = day(o); d.setHours(h, m, 0, 0); return d; };

  function rng(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
  const BASE = { '^GSPC': 6050, '^IXIC': 19800, 'TA35.TA': 2950, 'ILS=X': 3.68, 'BTC-USD': 96500, 'NVDA': 145, 'AAPL': 232, 'GC=F': 2650 };
  function chart(sym) {
    const r = rng(sym); const base = BASE[sym] || 100; const n = 78; const closes = []; let v = base;
    const drift = (r() - 0.45) * 0.0016;
    for (let i = 0; i < n; i++) { v = v * (1 + drift + (r() - 0.5) * 0.004); closes.push(+v.toFixed(4)); }
    const open = sym === 'BTC-USD';
    return { chart: { result: [{ meta: { symbol: sym, currency: sym === 'TA35.TA' ? 'ILS' : sym === 'ILS=X' ? 'ILS' : 'USD', regularMarketPrice: closes[n - 1], chartPreviousClose: base, currentTradingPeriod: { regular: { start: sec - (open ? 100 : 90000), end: sec + (open ? 100 : -60000) } } }, indicators: { quote: [{ close: closes }] } }], error: null } };
  }

  const rss = (items) => '<?xml version="1.0" encoding="UTF-8"?><rss><channel><title>x</title>' +
    items.map((it, i) => '<item><title><![CDATA[' + it + ']]></title><link>https://example.com/' + i + '</link><pubDate>' + new Date(now - (i * 37 + 4) * 60000).toUTCString() + '</pubDate></item>').join('') + '</channel></rss>';
  const FEEDS = {
    'ynet': ['הכנסת אישרה בקריאה ראשונה את הצעת התקציב לשנה הבאה', 'גשם ראשון בסוף השבוע: צפויות הצפות בדרום'],
    'walla': ['משרד הבריאות מעדכן את ההנחיות לקראת החורף', 'מחקר חדש: שינה של 7 שעות משפרת את הזיכרון'],
    'geektime': ['סטארט-אפ ישראלי גייס 120 מיליון דולר בסבב C', 'אפל משיקה עדכון macOS חדש עם ווידג׳טים משופרים'],
    'bbci': ['World leaders gather for climate summit in Brazil'],
    'globes': ['מדד ת"א 35 ננעל בעלייה של 1.2%, מחזור ער במניות הבנקים', 'הדולר נחלש מול השקל לרמה הנמוכה ביותר מאז הקיץ'],
    'calcalist': ['קרנות הפנסיה הניבו תשואה של 9% מתחילת השנה'],
    'cnbc': ['Nvidia shares climb ahead of quarterly earnings report', 'Fed officials signal patience on further rate cuts'],
    'yahoo': ['Oil prices slip as supply concerns ease'],
  };

  const claudeOut = [
    '@@NOW ' + sec,
    '@@TODO ' + (sec - 40) + ' /Users/me/.claude/todos/s1-agent-s1.json',
    JSON.stringify([
      { content: 'Build weather widget', status: 'completed', activeForm: 'Building weather widget' },
      { content: 'Parse Claude Code sessions', status: 'in_progress', activeForm: 'Parsing Claude Code sessions' },
      { content: 'Render preview screenshots', status: 'pending', activeForm: 'Rendering previews' },
      { content: 'Write the README', status: 'pending', activeForm: 'Writing the README' },
    ]),
    '@@SESSION ' + (sec - 20) + ' /Users/me/.claude/projects/-Users-me-code-desk-widgets/s1.jsonl',
    JSON.stringify({ type: 'user', cwd: '/Users/me/code/desk-widgets', gitBranch: 'main', message: { role: 'user', content: 'תבנה לי ווידג׳טים מותאמים אישית למאק' } }),
    '@@SESSION ' + (sec - 7300) + ' /Users/me/.claude/projects/-Users-me-code-shop/s2.jsonl',
    JSON.stringify({ type: 'summary', summary: 'Fix checkout flow on mobile' }),
    JSON.stringify({ type: 'user', cwd: '/Users/me/code/shop', gitBranch: 'fix/checkout', message: { role: 'user', content: 'checkout breaks on iPhone' } }),
    '@@SESSION ' + (sec - 100000) + ' /Users/me/.claude/projects/-Users-me-code-blog/s3.jsonl',
    JSON.stringify({ type: 'user', cwd: '/Users/me/code/blog', gitBranch: 'main', message: { role: 'user', content: 'Write a blog post about desktop widgets' } }),
    '@@TODAY 2',
  ].join('\n');

  let netIn = 81234567, netOut = 9234567;
  const systemOut = () => {
    netIn += 1800000 + Math.floor(Math.random() * 400000); netOut += 260000;
    return ['cpu=18.4', 'memtotal=17179869184', 'memused=10737418240', 'disk=482797652 230000000 245000000', "battsrc=Battery Power", 'batt=78', 'battstate=discharging', 'battleft=6:42', 'boot=' + (sec - 3 * 86400 - 5 * 3600), 'now=' + sec, 'net=' + netIn + ' ' + netOut, 'top=24.1|Google Chrome Helper;9.8|Xcode;4.2|WindowServer'].join('\n');
  };

  const ical = [
    iso(day(0)) + ' at ' + pad(at(0, new Date(now).getHours() + 1, 0).getHours()) + ':00 ~~ פגישת צוות שבועית',
    iso(day(0)) + ' at ' + pad(Math.min(23, new Date(now).getHours() + 3)) + ':30 ~~ שיחה עם הלקוח',
    iso(day(1)) + ' ~~ יום הולדת לנועה 🎂',
    iso(day(1)) + ' at 09:15 ~~ Dentist',
    iso(day(2)) + ' at 18:00 ~~ אימון ריצה',
  ].join('\n');

  const tasks = '# עבודה\n- [ ] לסיים את המצגת לפגישת הדירקטוריון\n- [x] לשלוח את הדו״ח החודשי\n- [ ] לקבוע שיחה עם הספק\n\n# בית\n- [ ] לקנות מתנה ליום ההולדת\n- [x] לשלם חשבון חשמל\n';

  const weather = {
    current: { temperature_2m: 22.4, apparent_temperature: 23.1, relative_humidity_2m: 58, weather_code: 1, wind_speed_10m: 13.2, is_day: 1 },
    daily: {
      time: [0, 1, 2, 3, 4].map((o) => iso(day(o))),
      weather_code: [1, 2, 61, 3, 0],
      temperature_2m_max: [24.2, 23.1, 19.4, 21, 25.3],
      temperature_2m_min: [16.1, 15.4, 13.2, 14, 16.8],
      precipitation_probability_max: [0, 10, 75, 30, 0],
      sunrise: [at(0, 6, 21).toISOString()], sunset: [at(0, 16, 39).toISOString()],
    },
  };

  const fri = day((5 - new Date(now).getDay() + 7) % 7); const sat = new Date(fri.getTime() + 86400000);
  const shabbat = { location: { title: '32.0853, 34.7818' }, items: [
    { category: 'candles', title: 'הדלקת נרות: 16:17', hebrew: 'הדלקת נרות', date: iso(fri) + 'T16:17:00+02:00' },
    { category: 'parashat', title: 'פרשת תולדות', hebrew: 'פרשת תולדות', date: iso(sat) },
    { category: 'havdalah', title: 'הבדלה: 17:16', hebrew: 'הבדלה', date: iso(sat) + 'T17:16:00+02:00' },
  ] };
  const holidays = { items: [
    { category: 'holiday', title: 'Chanukah: 1 Candle', hebrew: 'חנוכה: א׳ נר', date: iso(day(17)) },
    { category: 'holiday', title: "Asara B'Tevet", hebrew: 'עשרה בטבת', date: iso(day(33)) },
    { category: 'holiday', title: 'Tu BiShvat', hebrew: 'ט״ו בשבט', date: iso(day(67)) },
  ] };

  window.__mockRun = function (cmd) {
    let out = '';
    let m;
    if ((m = cmd.match(/finance\/chart\/([^?']+)/))) out = JSON.stringify(chart(decodeURIComponent(m[1])));
    else if (/open-meteo\.com\/v1\/forecast/.test(cmd)) out = JSON.stringify(weather);
    else if (/status\.claude\.com/.test(cmd)) out = JSON.stringify({ status: { indicator: 'none', description: 'All Systems Operational' }, incidents: [], components: [] });
    else if (/hebcal\.com\/shabbat/.test(cmd)) out = JSON.stringify(shabbat);
    else if (/hebcal\.com\/hebcal/.test(cmd)) out = JSON.stringify(holidays);
    else if (/@@NOW/.test(cmd)) out = claudeOut;
    else if (/top -l 2/.test(cmd)) out = systemOut();
    else if (/icalBuddy/.test(cmd)) out = ical;
    else if (/widget-tasks\.md/.test(cmd)) out = tasks;
    else if (/@@ITEM/.test(cmd)) out = "@@ITEM 0\n192.168.1.23\n@@ITEM 1\n203.0.113.7\n@@ITEM 2\n9\n@@ITEM 3\n26.1\n";
    else if (/pgrep -xq Spotify/.test(cmd)) out = 'Spotify|||playing|||Sunset Drive|||The Midnight Waves|||Neon Roads|||83.4|||214.6|||';
    else {
      const key = Object.keys(FEEDS).find((k) => cmd.indexOf(k) !== -1);
      if (key) out = rss(FEEDS[key]);
    }
    return new Promise((res) => setTimeout(() => res(out), 30));
  };
})();
