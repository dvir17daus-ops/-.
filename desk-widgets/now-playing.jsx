// Now playing in Spotify or Apple Music, with play/pause/next controls.
// macOS asks once for permission to let Übersicht control the music app.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Bar, widgetClass, Nothing, ellipsis } from "./lib/ui";
import { t } from "./lib/i18n";
import { sh, osascript } from "./lib/shell";
import { mmss } from "./lib/format";

const cfg = widget("nowPlaying");
const enabled = cfg.enabled !== false;
const D = "|||";

const trackScript = (app, durationExpr, artExpr) => [
  'tell application "' + app + '"',
  "if player state is not stopped then",
  "set t to current track",
  'return (player state as text) & "' + D + '" & (name of t) & "' + D + '" & (artist of t) & "' + D +
    '" & (album of t) & "' + D + '" & (player position as text) & "' + D + '" & (' + durationExpr + ') & "' + D +
    '" & ' + artExpr,
  "end if",
  "end tell",
];

export const CMD = [
  "if pgrep -xq Spotify; then",
  "printf 'Spotify" + D + "'; " + osascript(trackScript("Spotify", "((duration of t) / 1000) as text", "(artwork url of t)")) + ";",
  "elif pgrep -xq Music; then",
  "printf 'Music" + D + "'; " + osascript(trackScript("Music", "(duration of t) as text", '""')) + ";",
  "fi",
].join(" ");

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(1, cfg.refreshSeconds || 3) * 1000;
export const initialState = { track: null, loaded: false };
export const command = enabled ? () => sh(CMD) : undefined;

const toNum = (s) => parseFloat(String(s || "").replace(",", "."));

export function parseTrack(output) {
  const p = String(output || "").trim().split(D);
  if (p.length < 7 || !p[2]) return null;
  return {
    app: p[0],
    playing: p[1] === "playing",
    title: p[2],
    artist: p[3],
    album: p[4],
    position: toNum(p[5]),
    duration: toNum(p[6]),
    artwork: p[7] || "",
  };
}

export const updateState = (event, prev) => {
  if (event.type !== "UB/COMMAND_RAN" || event.error) return prev;
  return { track: parseTrack(event.output), loaded: true };
};

const control = (app, action) =>
  sh(osascript(['tell application "' + app + '" to ' + action]));

const wrap = css({ display: "flex", gap: 12, alignItems: "center" });
const art = css({
  width: 52,
  height: 52,
  flex: "none",
  borderRadius: 9,
  background: "var(--dw-track)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.5em",
});
const info = css({ flex: 1, minWidth: 0 });
const titleCls = css({ fontWeight: 600, fontSize: "0.95em" });
const artistCls = css({ fontSize: "0.8em", color: "var(--dw-muted)", marginBottom: 6 });
const times = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.68em",
  color: "var(--dw-faint)",
  marginTop: 3,
  direction: "ltr",
  fontVariantNumeric: "tabular-nums",
});
const btns = css({ display: "flex", gap: 2, direction: "ltr", flex: "none" });
const btn = css({
  cursor: "pointer",
  width: 26,
  height: 26,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.9em",
  ":hover": { background: "var(--dw-hover)" },
});

function renderNowPlaying({ track, loaded }) {
  if (!track) {
    if (cfg.hideWhenIdle && loaded) return null;
    return (
      <Card>
        <div className={wrap}>
          <div className={art}>🎵</div>
          <div className={info}>
            <div className={titleCls}>{t("nowPlaying")}</div>
            <div className={artistCls}>{t("nothingPlaying")}</div>
          </div>
        </div>
      </Card>
    );
  }
  const pct = track.duration ? (track.position / track.duration) * 100 : 0;
  return (
    <Card>
      <div className={wrap}>
        <div className={art} style={track.artwork ? { backgroundImage: "url(" + track.artwork + ")" } : null}>
          {track.artwork ? "" : "🎵"}
        </div>
        <div className={info}>
          <div className={titleCls + " " + ellipsis} dir="auto">
            {track.title}
          </div>
          <div className={artistCls + " " + ellipsis} dir="auto">
            {track.playing ? track.artist : t("paused") + " · " + track.artist}
          </div>
          <Bar value={pct} height={3} />
          <div className={times}>
            <span>{mmss(track.position)}</span>
            <span>{mmss(track.duration)}</span>
          </div>
        </div>
        <div className={btns}>
          <span className={btn} onClick={() => control(track.app, "previous track")}>
            ⏮
          </span>
          <span className={btn} onClick={() => control(track.app, "playpause")}>
            {track.playing ? "⏸" : "▶️"}
          </span>
          <span className={btn} onClick={() => control(track.app, "next track")}>
            ⏭
          </span>
        </div>
      </div>
    </Card>
  );
}

export const render = enabled ? renderNowPlaying : Nothing;
