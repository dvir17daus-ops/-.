// Scrolling stock ticker bar along the bottom of the screen (off by default).
// Turn it on in config.json → "ticker": { "enabled": true }.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { widgetClass, Nothing } from "./lib/ui";
import { num, signedPct } from "./lib/format";
import { normalizeSymbols, fetchQuotes, priceDigits } from "./lib/market";

const cfg = widget("ticker");
const market = widget("market");
const symbols = normalizeSymbols(cfg.useMarketSymbols !== false && !(cfg.symbols || []).length ? market.symbols : cfg.symbols);
const enabled = cfg.enabled !== false && symbols.length > 0;

export const className = widgetClass(cfg, { width: "auto" });
export const refreshFrequency = Math.max(1, cfg.refreshMinutes || 2) * 60 * 1000;
export const initialState = { rows: [] };
export const command = enabled
  ? (dispatch) => fetchQuotes(symbols, "1d", "15m").then((rows) => dispatch({ type: "DATA", rows }))
  : undefined;
export const updateState = (event, prev) => (event.type === "DATA" ? { rows: event.rows.filter((r) => !r.error) } : prev);

const bar = css({
  overflow: "hidden",
  whiteSpace: "nowrap",
  background: "var(--dw-bg)",
  WebkitBackdropFilter: "blur(20px) saturate(170%)",
  backdropFilter: "blur(20px) saturate(170%)",
  borderTop: "1px solid var(--dw-line)",
  height: 30,
  display: "flex",
  alignItems: "center",
  direction: "ltr",
});
const track = css({ display: "inline-flex", gap: 28, paddingInlineStart: 28 });
const item = css({ display: "inline-flex", gap: 7, fontSize: "0.86em", fontVariantNumeric: "tabular-nums" });

function renderTicker({ rows }) {
  if (!rows.length) return null;
  const items = rows.map((r, i) => (
    <span className={item} key={i}>
      <b>{r.name}</b>
      <span>{num(r.price, priceDigits(r.price))}</span>
      <span style={{ color: r.change >= 0 ? "var(--dw-up)" : "var(--dw-down)" }}>
        {r.change >= 0 ? "▲" : "▼"} {signedPct(r.pct)}
      </span>
    </span>
  ));
  return (
    <div className={bar}>
      <style>{"@keyframes dwMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}"}</style>
      <div style={{ display: "inline-flex", animation: "dwMarquee " + (cfg.speedSeconds || 60) + "s linear infinite" }}>
        <div className={track}>{items}</div>
        <div className={track}>{items}</div>
      </div>
    </div>
  );
}

export const render = enabled ? renderTicker : Nothing;
