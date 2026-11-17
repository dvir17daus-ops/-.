// RSS / Atom headline widgets. A tolerant regex parser is used on purpose:
// many news feeds aren't valid XML, and strict parsers reject them.
import { css } from "uebersicht";
import { widget } from "./config";
import { Card, Message, Pressable, widgetClass, Nothing, clamp2 } from "./ui";
import { t } from "./i18n";
import { sh, feedCmd, openUrl } from "./shell";
import { relTime, timeOf } from "./format";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (ENTITIES[n.toLowerCase()] !== undefined ? ENTITIES[n.toLowerCase()] : m))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, names) {
  for (let i = 0; i < names.length; i++) {
    const re = new RegExp("<" + names[i] + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + names[i] + ">", "i");
    const m = block.match(re);
    if (m) return m[1];
  }
  return "";
}

function linkOf(block) {
  const atom = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
    block.match(/<link[^>]*href=["']([^"']+)["']/i);
  const rss = tag(block, ["link"]);
  const url = decode(rss) || (atom ? atom[1] : "") || decode(tag(block, ["guid"]));
  return /^https?:/i.test(url) ? url.replace(/&amp;/g, "&") : "";
}

export function parseFeed(xml, source) {
  const text = String(xml || "");
  const blocks = text.split(/<item[\s>]|<entry[\s>]/i).slice(1);
  return blocks
    .map((b) => {
      const title = decode(tag(b, ["title"]));
      const dateStr = decode(tag(b, ["pubDate", "published", "updated", "dc:date"]));
      const ts = dateStr ? Date.parse(dateStr) : NaN;
      return { title, link: linkOf(b), date: isNaN(ts) ? null : ts, source: source.name || "" };
    })
    .filter((i) => i.title);
}

export function mergeItems(lists, opts) {
  const seen = {};
  const keywords = (opts.keywords || []).map((k) => String(k).toLowerCase()).filter(Boolean);
  const maxAge = opts.maxAgeHours ? opts.maxAgeHours * 3600000 : 0;
  const now = opts.now || Date.now();
  let items = [];
  lists.forEach((list) => {
    list.forEach((item, idx) => {
      const key = item.title.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      if (keywords.length && !keywords.some((k) => item.title.toLowerCase().indexOf(k) !== -1)) return;
      if (maxAge && item.date && now - item.date > maxAge) return;
      items.push(Object.assign({ order: idx }, item));
    });
  });
  // Newest first; undated items keep their feed order after dated ones.
  items.sort((a, b) => {
    if (a.date && b.date) return b.date - a.date;
    if (a.date) return -1;
    if (b.date) return 1;
    return a.order - b.order;
  });
  return items.slice(0, opts.maxItems || 6);
}

const itemTitle = css({ fontSize: "0.92em", fontWeight: 500, lineHeight: 1.35 });
const itemMeta = css({ fontSize: "0.72em", color: "var(--dw-faint)", marginTop: 2, display: "flex", gap: 6 });
const srcCls = css({ color: "var(--dw-accent)", fontWeight: 600 });
const sep = css({ borderTop: "1px solid var(--dw-line)", margin: "3px 0" });

// Build the exports for a feed widget from its config section name.
export function makeFeedWidget(name, defaults) {
  const cfg = widget(name);
  const feeds = (cfg.feeds || []).filter((f) => f && f.url);
  const enabled = cfg.enabled !== false && feeds.length > 0;
  const title = cfg.title || defaults.title;
  const icon = cfg.icon || defaults.icon;

  const command = enabled
    ? (dispatch) =>
        Promise.all(
          feeds.map((f) =>
            sh(feedCmd(f.url))
              .then((xml) => parseFeed(xml, f))
              .catch(() => [])
          )
        ).then((lists) =>
          dispatch({
            type: "DATA",
            at: Date.now(),
            items: mergeItems(lists, {
              keywords: cfg.keywords,
              maxAgeHours: cfg.maxAgeHours,
              maxItems: cfg.maxItems || 5,
            }),
          })
        )
    : undefined;

  const updateState = (event, prev) => {
    if (event.type !== "DATA") return prev;
    // Don't blank the widget if the network was briefly down.
    if (!event.items.length && prev.items && prev.items.length) return prev;
    return { items: event.items, at: event.at };
  };

  const renderFeed = ({ items, at }) => {
    if (!items) {
      return (
        <Card icon={icon} title={title}>
          <Message text={t("loading")} />
        </Card>
      );
    }
    return (
      <Card icon={icon} title={title} right={at ? timeOf(new Date(at)) : null}>
        {items.length === 0 ? <Message text={t("noNews")} /> : null}
        {items.map((item, i) => (
          <div key={i + ":" + (item.link || item.title)}>
            {i > 0 ? <div className={sep} /> : null}
            <Pressable onClick={() => openUrl(item.link)} title={item.link}>
              <div className={itemTitle + " " + clamp2} dir="auto">
                {item.title}
              </div>
              <div className={itemMeta}>
                {item.source ? <span className={srcCls}>{item.source}</span> : null}
                {item.date ? <span>{relTime(item.date)}</span> : null}
              </div>
            </Pressable>
          </div>
        ))}
      </Card>
    );
  };

  return {
    className: widgetClass(cfg),
    refreshFrequency: Math.max(2, cfg.refreshMinutes || 10) * 60 * 1000,
    initialState: { items: null },
    command,
    updateState,
    render: enabled ? renderFeed : Nothing,
  };
}
