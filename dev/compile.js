// Bundle every widget exactly like Übersicht's server/src/bundleWidget.js does.
const browserify = require('browserify');
const babelify = require('babelify');
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'desk-widgets'));
const out = path.join(__dirname, '.build');
fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(root).filter((f) => f.endsWith('.jsx'));
let failed = 0;
const ids = [];
(async () => {
  for (const f of files) {
    const filePath = path.join(root, f);
    const id = 'desk-widgets-' + f.replace(/\./g, '-');
    const b = browserify(filePath, { detectGlobals: false, cache: {}, packageCache: {}, debug: false });
    b.require(filePath, { expose: id });
    b.external('uebersicht');
    b.transform(babelify, {
      presets: [
        [require.resolve('@babel/preset-env'), { targets: 'last 4 Safari versions', modules: 'commonjs' }],
        [require.resolve('@babel/preset-react'), { pragma: 'html' }],
      ],
      plugins: [require.resolve('@babel/plugin-proposal-object-rest-spread'), require.resolve('babel-plugin-emotion')],
    });
    await new Promise((res) => b.bundle((err, buf) => {
      if (err) { failed++; console.log('FAIL', f, err.message); }
      else { fs.writeFileSync(path.join(out, id + '.js'), buf); ids.push(id); console.log('ok  ', f, buf.length, 'bytes'); }
      res();
    }));
  }
  fs.writeFileSync(path.join(out, 'ids.json'), JSON.stringify(ids));
  process.exit(failed ? 1 : 0);
})();
