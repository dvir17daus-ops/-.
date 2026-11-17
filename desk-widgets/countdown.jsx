// Countdown to dates you care about. "repeat": "yearly" makes birthdays roll over.
import { css } from "uebersicht";
import { widget } from "./lib/config";
import { Card, Message, widgetClass, Nothing, ellipsis } from "./lib/ui";
import { t, locale } from "./lib/i18n";
import { parseLocal, startOfDay } from "./lib/format";

const cfg = widget("countdown");
const enabled = cfg.enabled !== false && (cfg.events || []).length > 0;

export const className = widgetClass(cfg);
export const refreshFrequency = 60 * 1000;
export const initialState = { now: Date.now() };
export const command = enabled ? (dispatch) => dispatch({ type: "TICK", now: Date.now() }) : undefined;
export const updateState = (event, prev) => (event.type === "TICK" ? { now: event.now } : prev);

export function nextOccurrence(ev, now) {
  const base = parseLocal(ev.date);
  if (!base) return null;
  if (ev.repeat !== "yearly") return base;
  const today = startOfDay(new Date(now));
  const d = new Date(today.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), base.getMinutes());
  if (d < today) d.setFullYear(d.getFullYear() + 1);
  return d;
}

const row = css({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  borderTop: "1px solid var(--dw-line)",
  ":first-of-type": { borderTop: "none", paddingTop: 0 },
});
const emoji = css({ fontSize: "1.5em", width: 28, textAlign: "center", flex: "none" });
const titleCls = css({ fontWeight: 600, fontSize: "0.92em" });
const dateCls = css({ fontSize: "0.72em", color: "var(--dw-faint)" });
const big = css({ marginInlineStart: "auto", textAlign: "center", flex: "none", minWidth: 48 });
const bigNum = css({ fontSize: "1.55em", fontWeight: 300, lineHeight: 1, fontVariantNumeric: "tabular-nums" });
const unit = css({ fontSize: "0.66em", color: "var(--dw-muted)" });

const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });

function renderCountdown({ now }) {
  const today = startOfDay(new Date(now)).getTime();
  const items = (cfg.events || [])
    .map((ev) => {
      const when = nextOccurrence(ev, now);
      if (!when) return null;
      const days = Math.round((startOfDay(when).getTime() - today) / 86400000);
      return { ev, when, days, hours: Math.max(0, Math.round((when.getTime() - now) / 3600000)) };
    })
    .filter((i) => i && (cfg.showPast || i.days >= 0))
    .sort((a, b) => a.when - b.when);

  return (
    <Card icon="⏳" title={t("countdown")}>
      {!items.length ? <Message text="—" /> : null}
      {items.map((i) => {
        let n = i.days;
        let u = i.days === 1 ? t("day") : t("days");
        if (i.days === 0) {
          n = null;
        } else if (i.days < 0) {
          n = -i.days;
          u = t("passed");
        } else if (i.hours < 48 && i.when.getHours() !== 0) {
          n = i.hours;
          u = t("hours");
        }
        return (
          <div className={row} key={i.ev.title + i.ev.date}>
            <span className={emoji}>{i.ev.emoji || "📌"}</span>
            <div style={{ minWidth: 0 }}>
              <div className={titleCls + " " + ellipsis} dir="auto">
                {i.ev.title}
              </div>
              <div className={dateCls}>{dateFmt.format(i.when)}</div>
            </div>
            <div className={big}>
              {n === null ? (
                <div className={titleCls}>{t("itsToday")}</div>
              ) : (
                <div>
                  <div className={bigNum}>{n}</div>
                  <div className={unit}>{u}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

export const render = enabled ? renderCountdown : Nothing;
