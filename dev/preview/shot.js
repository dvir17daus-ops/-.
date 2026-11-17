const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', '.build');
const ids = JSON.parse(fs.readFileSync(path.join(dist, 'ids.json')));
// Usage: node preview/shot.js [width] [height] [menuBar] [dark|light] [out.png] [scale]
// Run `node compile.js` first (npm run preview does both).
const args = process.argv.slice(2);
const W = args[0] || 1512, H = args[1] || 982, MENU = args[2] || 37, scheme = args[3] || 'dark';
const out = path.resolve(args[4] || path.join(__dirname, 'preview.png'));
const scale = args[5] || 2;

// Bundle the fake Übersicht runtime and copy the mock data + loader next to the widgets.
function buildRuntime() {
  const browserify = require('browserify');
  return new Promise((resolve, reject) => {
    const b = browserify(path.join(__dirname, 'runtime-src.js'));
    b.require(path.join(__dirname, 'uebersicht-mock.js'), { expose: 'uebersicht' });
    b.bundle((err, buf) => {
      if (err) return reject(err);
      fs.writeFileSync(path.join(dist, 'runtime.js'), buf);
      fs.copyFileSync(path.join(__dirname, 'fixtures.js'), path.join(dist, 'fixtures.js'));
      fs.copyFileSync(path.join(__dirname, 'loader.js'), path.join(dist, 'loader.js'));
      resolve();
    });
  });
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;overflow:hidden;font-family:-apple-system,sans-serif}
body{background:radial-gradient(1200px 800px at 15% 20%, #3a2a8a 0%, transparent 60%),
 radial-gradient(1000px 700px at 85% 30%, #b2456e 0%, transparent 55%),
 radial-gradient(1100px 700px at 50% 100%, #e08a3c 0%, transparent 60%), #1b1030}
#menubar{height:${MENU}px;background:rgba(20,20,30,.35);backdrop-filter:blur(20px);color:#fff;font-size:13px;display:flex;align-items:center;padding:0 16px;gap:18px}
#desk{position:absolute;top:${MENU}px;left:0;right:0;bottom:0}
</style></head><body><div id="menubar"><b></b><span>Finder</span><span>File</span><span>Edit</span><span>View</span></div><div id="desk"></div>
<script src="runtime.js"></script><script src="fixtures.js"></script>
${ids.map((id) => `<script src="${id}.js"></script>`).join('\n')}
<script>window.__ids=${JSON.stringify(ids)};</script><script src="loader.js"></script></body></html>`;
fs.writeFileSync(path.join(dist, 'index.html'), html);
(async () => {
  await buildRuntime();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +W, height: +H }, colorScheme: scheme, deviceScaleFactor: +(scale || 1) });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(dist, 'index.html'));
  await page.waitForTimeout(2200);
  const errors = await page.evaluate(() => window.__errors);
  // Report widget boxes and overlaps
  const boxes = await page.evaluate(() => Array.from(document.querySelectorAll('.widget')).map((el) => {
    const r = el.getBoundingClientRect(); return { id: el.id.replace('desk-widgets-', ''), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter((b) => b.h > 0));
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(a.id + ' x ' + b.id);
  }
  const offscreen = boxes.filter((b) => b.y < +MENU || b.y + b.h > +H || b.x < 0 || b.x + b.w > +W).map((b) => b.id);
  await page.screenshot(/\.jpe?g$/i.test(out) ? { path: out, quality: 88 } : { path: out });
  console.log('screenshot:', out);
  console.log('errors:', JSON.stringify(errors), '| console:', logs.length ? JSON.stringify(logs.slice(0, 5)) : 'clean');
  console.log('overlapping widgets:', overlaps.length ? overlaps.join(', ') : 'none', '| off-screen:', offscreen.length ? offscreen.join(', ') : 'none');
  process.exitCode = errors.length || logs.length ? 1 : 0;
  await browser.close();
})();
