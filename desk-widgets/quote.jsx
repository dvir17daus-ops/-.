// A rotating quote from your own list in config.json → "quote".
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, widgetClass, Nothing } from "./lib/ui";

const cfg = widget("quote");
const quotes = (cfg.quotes || []).filter((q) => q && q.text);
const enabled = cfg.enabled !== false && quotes.length > 0;

export const className = widgetClass(cfg);
export const refreshFrequency = 60 * 1000;
export const initialState = { now: Date.now() };
export const command = enabled ? (dispatch) => dispatch({ type: "TICK", now: Date.now() }) : undefined;
export const updateState = (event, prev) => (event.type === "TICK" ? { now: event.now } : prev);

const text = css({ fontSize: "1.02em", lineHeight: 1.5, fontWeight: 500 });
const author = css({ marginTop: 6, fontSize: "0.8em", color: "var(--dw-muted)" });
const mark = css({ color: "var(--dw-accent)", fontSize: "1.6em", lineHeight: 0, verticalAlign: "-0.35em", marginInlineEnd: 4 });

function renderQuote({ now }) {
  const period = Math.max(1, cfg.rotateMinutes || 60) * 60000;
  // Offset by timezone so the rotation lines up with local hours/days.
  const local = now - new Date(now).getTimezoneOffset() * 60000;
  const q = quotes[Math.floor(local / period) % quotes.length];
  return (
    <Card>
      <div className={text} dir="auto">
        <span className={mark}>“</span>
        {q.text}
      </div>
      {q.author ? (
        <div className={author} dir="auto">
          — {q.author}
        </div>
      ) : null}
    </Card>
  );
}

export const render = enabled ? renderQuote : Nothing;
