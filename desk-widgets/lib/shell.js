// Helpers for running shell commands from widgets.
//
// Übersicht runs commands with a minimal PATH and treats *any* stderr output as
// an error, so every command goes through sh(): it adds Homebrew to PATH and
// silences stderr. A failed command simply resolves to an empty string.
import { run } from "uebersicht";

const PREFIX = 'export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH";';

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// Single-quote a value for bash.
export const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

// Quote a file path, expanding a leading "~" to $HOME.
export function qpath(p) {
  const s = String(p || "");
  if (s === "~") return '"$HOME"';
  if (s.indexOf("~/") === 0) return '"$HOME"' + q(s.slice(1));
  return q(s);
}

// LC_ALL is set inside the braces so a missing-locale warning can't leak to stderr.
export const sh = (cmd) => run(PREFIX + " { export LC_ALL=en_US.UTF-8; " + cmd + "\n} 2>/dev/null");

export const curlCmd = (url) => "curl -sL --compressed -m 20 -A " + q(UA) + " " + q(url);

export const fetchText = (url) => sh(curlCmd(url));

export const fetchJSON = (url) =>
  fetchText(url).then((txt) => {
    if (!txt || !txt.trim()) throw new Error("empty response");
    return JSON.parse(txt);
  });

// Fetch an RSS/Atom feed and convert it to UTF-8 when the feed declares
// another encoding (some Israeli sites still use windows-1255).
export const feedCmd = (url) =>
  [
    'f=$(mktemp "${TMPDIR:-/tmp}/dw.XXXXXX")',
    curlCmd(url) + ' -o "$f"',
    "e=$(head -c 400 \"$f\" | grep -io 'encoding=.[a-z0-9_-]*' | head -n 1 | cut -c11- | tr 'A-Z' 'a-z')",
    'if [ -n "$e" ] && [ "$e" != "utf-8" ] && [ "$e" != "utf8" ]; then iconv -f "$e" -t utf-8 "$f" || cat "$f"; else cat "$f"; fi',
    'rm -f "$f"',
  ].join("; ");

export const openUrl = (url) => (url ? sh("open " + q(url)) : Promise.resolve(""));

export const osascript = (lines) => "osascript " + lines.map((l) => "-e " + q(l)).join(" ");
