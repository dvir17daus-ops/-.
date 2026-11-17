const { execFileSync } = require('child_process');
const React = require('react');
global.html = React.createElement;
let counter = 0;
module.exports = {
  run: (cmd) => new Promise((resolve, reject) => {
    try {
      // Mimic Übersicht: bash reads the command from stdin; stderr => error.
      const r = require('child_process').spawnSync('bash', [], { input: cmd + '\n', env: process.env, encoding: 'utf8' });
      if (r.stderr && r.stderr.length) return reject(new Error(r.stderr));
      resolve(r.stdout);
    } catch (e) { reject(e); }
  }),
  css: () => 'c' + (counter++),
  styled: () => () => null,
  React,
};
