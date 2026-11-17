// Shared look & feel: glass cards, rings, bars, sparklines.
// JSX here compiles to Übersicht's global `html` (React.createElement).
import { css } from "uebersicht";
import config, { theme } from "./config";
import { dir } from "./i18n";

const op = Number(theme.opacity);
const opacity = isNaN(op) ? 0.55 : Math.max(0, Math.min(1, op));

const DARK = {
  "--dw-bg": "rgba(24, 24, 28, " + opacity + ")",
  "--dw-fg": "#f5f5f7",
  "--dw-muted": "rgba(235, 235, 245, 0.62)",
  "--dw-faint": "rgba(235, 235, 245, 0.32)",
  "--dw-line": "rgba(255, 255, 255, 0.09)",
  "--dw-track": "rgba(255, 255, 255, 0.13)",
  "--dw-hover": "rgba(255, 255, 255, 0.08)",
  "--dw-up": "#30D158",
  "--dw-down": "#FF453A",
  "--dw-warn": "#FFD60A",
  "--dw-info": "#64D2FF",
  "--dw-shadow": "0 10px 30px rgba(0, 0, 0, 0.28)",
};

const LIGHT = {
  "--dw-bg": "rgba(255, 255, 255, " + Math.min(0.95, opacity + 0.2) + ")",
  "--dw-fg": "#1d1d1f",
  "--dw-muted": "rgba(60, 60, 67, 0.68)",
  "--dw-faint": "rgba(60, 60, 67, 0.36)",
  "--dw-line": "rgba(0, 0, 0, 0.08)",
  "--dw-track": "rgba(0, 0, 0, 0.09)",
  "--dw-hover": "rgba(0, 0, 0, 0.05)",
  "--dw-up": "#248A3D",
  "--dw-down": "#D70015",
  "--dw-warn": "#B25000",
  "--dw-info": "#0071E3",
  "--dw-shadow": "0 10px 30px rgba(0, 0, 0, 0.12)",
};

function colorVars() {
  if (theme.mode === "light") return LIGHT;
  if (theme.mode === "dark") return DARK;
  return Object.assign({}, DARK, { "@media (prefers-color-scheme: light)": LIGHT });
}

// Root className for a widget: position from config + theme variables.
export function widgetClass(cfg, extra) {
  const base = Object.assign(
    {
      position: "absolute",
      width: cfg.width || theme.width,
      fontFamily: theme.font,
      fontSize: theme.fontSize,
      lineHeight: 1.35,
      color: "var(--dw-fg)",
      WebkitFontSmoothing: "antialiased",
      "--dw-accent": theme.accent,
    },
    colorVars()
  );
  const pos = Object.assign({}, cfg.position || {});
  // When the bottom ticker bar is on, lift bottom-anchored widgets above it.
  const ticker = config.ticker || {};
  if (ticker.enabled && cfg !== ticker && typeof pos.bottom === "number") pos.bottom += 34;
  return Object.assign(base, extra || {}, pos);
}

export const accent = theme.accent;

const keyframes =
  "@keyframes dwPulse{0%{box-shadow:0 0 0 0 rgba(48,209,88,.55)}70%{box-shadow:0 0 0 6px rgba(48,209,88,0)}100%{box-shadow:0 0 0 0 rgba(48,209,88,0)}}" +
  "@keyframes dwSpin{to{transform:rotate(360deg)}}" +
  "@keyframes dwMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}";

const cardCls = css({
  position: "relative",
  boxSizing: "border-box",
  padding: "13px 15px",
  borderRadius: theme.radius,
  background: "var(--dw-bg)",
  border: "1px solid var(--dw-line)",
  boxShadow: "var(--dw-shadow)",
  WebkitBackdropFilter: "blur(" + theme.blur + "px) saturate(170%)",
  backdropFilter: "blur(" + theme.blur + "px) saturate(170%)",
  overflow: "hidden",
});

const headerCls = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 10,
  fontSize: "0.82em",
  fontWeight: 600,
  color: "var(--dw-muted)",
  letterSpacing: "0.01em",
});

const titleCls = css({ display: "flex", alignItems: "center", gap: 6, minWidth: 0 });
const iconCls = css({ fontSize: "1.1em", lineHeight: 1 });
const rightCls = css({ fontWeight: 500, color: "var(--dw-faint)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" });

export function Card(props) {
  const hasHeader = props.title || props.right;
  return (
    <div className={cardCls} dir={props.dir || dir} style={props.style}>
      <style>{keyframes}</style>
      {hasHeader ? (
        <div className={headerCls}>
          <div className={titleCls}>
            {props.icon ? <span className={iconCls}>{props.icon}</span> : null}
            <span>{props.title}</span>
          </div>
          {props.right ? <div className={rightCls}>{props.right}</div> : null}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

const msgCls = css({ color: "var(--dw-muted)", fontSize: "0.92em", padding: "4px 0" });
export const Message = ({ text, children }) => <div className={msgCls}>{text}{children}</div>;

const sectionCls = css({
  margin: "12px 0 6px",
  fontSize: "0.76em",
  fontWeight: 600,
  color: "var(--dw-faint)",
  letterSpacing: "0.02em",
  display: "flex",
  justifyContent: "space-between",
});
export const Section = ({ title, right, first }) => (
  <div className={sectionCls} style={first ? { marginTop: 0 } : null}>
    <span>{title}</span>
    {right ? <span>{right}</span> : null}
  </div>
);

export const muted = css({ color: "var(--dw-muted)" });
export const faint = css({ color: "var(--dw-faint)" });
export const tabular = css({ fontVariantNumeric: "tabular-nums" });
export const ellipsis = css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 });
export const clamp2 = css({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const pressCls = css({
  cursor: "pointer",
  borderRadius: 8,
  margin: "0 -6px",
  padding: "4px 6px",
  transition: "background 120ms",
  ":hover": { background: "var(--dw-hover)" },
});
export const Pressable = ({ onClick, children, title, style }) => (
  <div className={pressCls} onClick={onClick} title={title} style={style}>
    {children}
  </div>
);

const dotCls = css({ display: "inline-block", width: 7, height: 7, borderRadius: "50%", flex: "none" });
export const Dot = ({ color, pulse, size }) => (
  <span
    className={dotCls}
    style={{
      background: color,
      width: size || 7,
      height: size || 7,
      animation: pulse ? "dwPulse 1.8s infinite" : "none",
    }}
  />
);

const pillCls = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: "0.78em",
  fontWeight: 600,
  background: "var(--dw-hover)",
  whiteSpace: "nowrap",
});
export const Pill = ({ color, children }) => (
  <span className={pillCls} style={color ? { color } : null}>
    {children}
  </span>
);

const trackCls = css({ height: 5, borderRadius: 3, background: "var(--dw-track)", overflow: "hidden" });
export const Bar = ({ value, color, height }) => (
  <div className={trackCls} style={height ? { height } : null}>
    <div
      style={{
        width: Math.max(0, Math.min(100, value || 0)) + "%",
        height: "100%",
        borderRadius: 3,
        background: color || "var(--dw-accent)",
        transition: "width 400ms ease",
      }}
    />
  </div>
);

const ringWrap = css({ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 });
const ringBox = css({ position: "relative" });
const ringCenter = css({
  position: "absolute",
  inset: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.82em",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
});
const ringLabel = css({ fontSize: "0.74em", color: "var(--dw-muted)", whiteSpace: "nowrap" });

export function Ring({ value, size, stroke, color, label, center }) {
  const s = size || 54;
  const w = stroke || 5;
  const r = (s - w) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={ringWrap}>
      <div className={ringBox} style={{ width: s, height: s }}>
        <svg width={s} height={s} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="var(--dw-track)" strokeWidth={w} />
          <circle
            cx={s / 2}
            cy={s / 2}
            r={r}
            fill="none"
            stroke={color || "var(--dw-accent)"}
            strokeWidth={w}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v / 100)}
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div className={ringCenter}>{center !== undefined ? center : Math.round(v) + "%"}</div>
      </div>
      {label ? <div className={ringLabel}>{label}</div> : null}
    </div>
  );
}

export function Sparkline({ data, width, height, color, baseline }) {
  const w = width || 64;
  const h = height || 22;
  const pts = (data || []).filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (pts.length < 2) return <svg width={w} height={h} />;
  let min = Math.min.apply(null, pts);
  let max = Math.max.apply(null, pts);
  const hasBase = baseline !== null && baseline !== undefined && !isNaN(baseline);
  if (hasBase) {
    min = Math.min(min, baseline);
    max = Math.max(max, baseline);
  }
  const range = max - min || 1;
  const x = (i) => ((i / (pts.length - 1)) * w).toFixed(1);
  const y = (v) => (h - 2 - ((v - min) / range) * (h - 4)).toFixed(1);
  const line = pts.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ");
  const area = line + " L" + w + " " + h + " L0 " + h + " Z";
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} style={{ display: "block", overflow: "visible" }}>
      {hasBase ? (
        <line x1="0" x2={w} y1={y(baseline)} y2={y(baseline)} stroke="var(--dw-faint)" strokeWidth="1" strokeDasharray="2 3" />
      ) : null}
      <path d={area} fill={color} opacity="0.13" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Use as `render` when a widget is disabled in config.json.
export const Nothing = () => null;
