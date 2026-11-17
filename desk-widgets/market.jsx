// Market watchlist: indices, stocks, FX, crypto, commodities with intraday sparklines.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, Sparkline, Dot, widgetClass, Nothing, ellipsis as ellipsisCls } from "./lib/ui";
import { t } from "./lib/i18n";
import { num, signedPct, timeOf } from "./lib/format";
import { normalizeSymbols, fetchQuotes, priceDigits, currencySign } from "./lib/market";

const cfg = widget("market");
const symbols = normalizeSymbols(cfg.symbols);
const enabled = cfg.enabled !== false && symbols.length > 0;

export const className = widgetClass(cfg);
export const refreshFrequency = Math.max(1, cfg.refreshMinutes || 2) * 60 * 1000;
export const initialState = { rows: null };

export const command = enabled
  ? (dispatch) =>
      fetchQuotes(symbols, cfg.range, cfg.interval).then((rows) => dispatch({ type: "DATA", rows, at: Date.now() }))
  : undefined;

export const updateState = (event, prev) => {
  if (event.type === "DATA") {
    // Keep the last good value for a symbol if one request fails.
    const old = {};
    (prev.rows || []).forEach((r) => {
      if (!r.error) old[r.symbol] = r;
    });
    const rows = event.rows.map((r) => (r.error && old[r.symbol] ? old[r.symbol] : r));
    return { rows, at: event.at };
  }
  return prev;
};

const row = css({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 46px auto 58px",
  alignItems: "center",
  gap: 7,
  padding: "5px 0",
  borderTop: "1px solid var(--dw-line)",
  ":first-of-type": { borderTop: "none", paddingTop: 0 },
});
const nameCls = css({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 600,
  fontSize: "0.92em",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  minWidth: 0,
});
const priceCls = css({
  fontSize: "0.9em",
  fontVariantNumeric: "tabular-nums",
  textAlign: "end",
  direction: "ltr",
  whiteSpace: "nowrap",
});
const pctCls = css({
  fontSize: "0.76em",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
  padding: "2px 0",
  borderRadius: 6,
  direction: "ltr",
  color: "#fff",
});

function renderMarket({ rows, at }) {
  const title = cfg.title || t("market");
  if (!rows) {
    return (
      <Card icon="💹" title={title}>
        <Message text={t("loading")} />
      </Card>
    );
  }
  return (
    <Card icon="💹" title={title} right={at ? timeOf(new Date(at)) : null}>
      {rows.map((r) => {
        if (r.error) {
          return (
            <div className={row} key={r.symbol}>
              <span className={nameCls}>{r.name}</span>
              <span />
              <span className={priceCls}>—</span>
              <span />
            </div>
          );
        }
        const up = r.change >= 0;
        const color = up ? "var(--dw-up)" : "var(--dw-down)";
        return (
          <div className={row} key={r.symbol} title={r.symbol}>
            <span className={nameCls}>
              <Dot color={r.open ? "var(--dw-up)" : "var(--dw-faint)"} size={5} />
              <span className={ellipsisCls} dir="auto">
                {r.name}
              </span>
            </span>
            <Sparkline data={r.closes} baseline={r.prev} color={up ? "#30D158" : "#FF453A"} width={46} height={20} />
            <span className={priceCls}>
              {currencySign(r.currency)}
              {num(r.price, priceDigits(r.price))}
            </span>
            <span className={pctCls} style={{ background: color }}>
              {signedPct(r.pct)}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

export const render = enabled ? renderMarket : Nothing;
