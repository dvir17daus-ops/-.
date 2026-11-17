// General news headlines from RSS feeds. Feeds are set in config.json → "news".
import { makeFeedWidget } from "./lib/feed";
import { t } from "./lib/i18n";

const w = makeFeedWidget("news", { title: t("news"), icon: "📰" });

export const className = w.className;
export const refreshFrequency = w.refreshFrequency;
export const initialState = w.initialState;
export const command = w.command;
export const updateState = w.updateState;
export const render = w.render;
