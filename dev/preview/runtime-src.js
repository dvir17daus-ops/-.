// Browser stand-in for Übersicht's client runtime: exposes the `uebersicht` module.
const React = require('react');
const ReactDOM = require('react-dom');
const { css } = require('emotion');
window.html = React.createElement;
window.React = React;
window.ReactDOM = ReactDOM;
window.emotionCss = css;
