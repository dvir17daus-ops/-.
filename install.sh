#!/usr/bin/env bash
# Installs the desk-widgets pack into Übersicht's widgets folder.
#
#   ./install.sh                 install / update (keeps your config.json)
#   ./install.sh "<folder>"      install into a custom Übersicht widgets folder
#
# Safe to run again after `git pull`: your config.json is never overwritten.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/desk-widgets"
WIDGETS_DIR="${1:-$HOME/Library/Application Support/Übersicht/widgets}"
DEST="$WIDGETS_DIR/desk-widgets"
TASKS_FILE="$HOME/Documents/widget-tasks.md"

say() { printf '%s\n' "$*"; }
ask() { # ask "question" -> returns 0 for yes (default yes, no prompt when not interactive)
  [ -t 0 ] || return 1
  local ans
  read -r -p "$1 [Y/n] " ans || return 1
  [[ ! "$ans" =~ ^[Nn] ]]
}

if [ "$(uname)" != "Darwin" ]; then
  say "This installer is for macOS only."
  exit 1
fi

# 1) Übersicht itself
if ! osascript -e 'id of application id "tracesOf.Uebersicht"' >/dev/null 2>&1; then
  say "⚠️  Übersicht is not installed."
  if command -v brew >/dev/null 2>&1 && ask "Install it now with Homebrew (brew install --cask ubersicht)?"; then
    brew install --cask ubersicht
  else
    say "   Get it from https://tracesof.net/uebersicht/ or run: brew install --cask ubersicht"
  fi
fi

# 2) Copy the widgets (your config.json is kept)
mkdir -p "$DEST"
KEEP_CONFIG=""
if [ -f "$DEST/config.json" ]; then
  cp "$DEST/config.json" "$DEST/config.backup.json"
  KEEP_CONFIG=1
fi
# Remove old widget files (so renamed/deleted widgets don't linger), then copy fresh ones.
find "$DEST" -mindepth 1 -maxdepth 1 ! -name 'config.json' ! -name 'config.backup.json' -exec rm -rf {} +
cp -R "$SRC/." "$DEST/"
if [ -n "$KEEP_CONFIG" ]; then
  cp "$DEST/config.backup.json" "$DEST/config.json"
  say "✅ Updated widgets in: $DEST (kept your config.json, backup in config.backup.json)"
else
  say "✅ Installed widgets to: $DEST"
fi

# 3) Starter tasks file for the "tasks" widget
if [ ! -f "$TASKS_FILE" ]; then
  mkdir -p "$(dirname "$TASKS_FILE")"
  cp "$HERE/examples/widget-tasks.md" "$TASKS_FILE"
  say "📝 Created a starter tasks file: $TASKS_FILE"
fi

# 4) Optional: icalBuddy for calendar events
if ! command -v icalBuddy >/dev/null 2>&1 && [ ! -x /opt/homebrew/bin/icalBuddy ] && [ ! -x /usr/local/bin/icalBuddy ]; then
  if command -v brew >/dev/null 2>&1 && ask "Install icalBuddy so the calendar widget can show your events?"; then
    brew install ical-buddy
  else
    say "ℹ️  For calendar events later run: brew install ical-buddy"
  fi
fi

# 5) Start or refresh Übersicht
if osascript -e 'application id "tracesOf.Uebersicht" is running' 2>/dev/null | grep -q true; then
  osascript -e 'tell application id "tracesOf.Uebersicht" to refresh' >/dev/null 2>&1 || true
else
  open -b tracesOf.Uebersicht >/dev/null 2>&1 || true
fi

say ""
say "Done! Edit your settings here (saving updates the widgets live):"
say "  $DEST/config.json"
