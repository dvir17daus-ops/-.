const React = require('react');
const { css } = require('emotion');
module.exports = {
  run: (cmd) => window.__mockRun(cmd),
  css,
  styled: () => () => null,
  React,
};
