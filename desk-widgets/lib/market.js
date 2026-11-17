// Quotes from Yahoo Finance's public chart endpoint (no API key).
// Symbols use Yahoo's format: AAPL, ^GSPC, TA35.TA, ILS=X, BTC-USD, GC=F ...
import { fetchJSON } from "./shell";

export const normalizeSymbols = (list) =>
  (list || []).map((s) => (typeof s === "string" ? { symbol: s } : s)).filter((s) => s && s.symbol);

export const chartUrl = (symbol, range, interval) =>
  "https://query1.finance.yahoo.com/v8/finance/chart/" +
  encodeURIComponent(symbol) +
  "?range=" +
  encodeURIComponent(range || "1d") +
  "&interval=" +
  encodeURIComponent(interval || "5m") +
  "&includePrePost=false";

const isNum = (v) => v !== null && v !== undefined && !isNaN(v);

export function parseChart(json, sym, nowMs) {
  const r = json && json.chart && json.chart.result && json.chart.result[0];
  if (!r) throw new Error("no data for " + sym.symbol);
  const meta = r.meta || {};
  const quote = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  const closes = (quote.close || []).filter(isNum);
  const price = isNum(meta.regularMarketPrice) ? meta.regularMarketPrice : closes[closes.length - 1];
  const prev = isNum(meta.chartPreviousClose) ? meta.chartPreviousClose : meta.previousClose;
  const change = isNum(price) && isNum(prev) ? price - prev : 0;
  const pct = isNum(prev) && prev !== 0 ? (change / prev) * 100 : 0;
  const now = (nowMs || Date.now()) / 1000;
  const reg = meta.currentTradingPeriod && meta.currentTradingPeriod.regular;
  return {
    symbol: sym.symbol,
    name: sym.name || meta.shortName || meta.symbol || sym.symbol,
    price,
    prev,
    change,
    pct,
    closes,
    currency: meta.currency || "",
    open: reg ? now >= reg.start && now < reg.end : null,
  };
}

export function fetchQuotes(symbols, range, interval) {
  return Promise.all(
    symbols.map((s) =>
      fetchJSON(chartUrl(s.symbol, range, interval))
        .then((json) => parseChart(json, s))
        .catch(() => ({ symbol: s.symbol, name: s.name || s.symbol, error: true }))
    )
  );
}

export const priceDigits = (p) => (p >= 10000 ? 0 : p >= 10 ? 2 : p >= 1 ? 3 : 4);

const SYMBOLS = { USD: "$", ILS: "₪", EUR: "€", GBP: "£", JPY: "¥" };
export const currencySign = (c) => SYMBOLS[c] || "";
