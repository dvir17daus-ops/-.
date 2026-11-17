#!/usr/bin/env bash
# Removes the desk-widgets pack from Übersicht (saves a copy of your config first).
set -euo pipefail

WIDGETS_DIR="${1:-$HOME/Library/Application Support/Übersicht/widgets}"
DEST="$WIDGETS_DIR/desk-widgets"

if [ ! -d "$DEST" ]; then
  echo "Nothing to remove: $DEST does not exist."
  exit 0
fi

if [ -f "$DEST/config.json" ]; then
  cp "$DEST/config.json" "$HOME/desk-widgets-config.backup.json"
  echo "Saved your settings to ~/desk-widgets-config.backup.json"
fi

rm -rf "$DEST"
osascript -e 'tell application id "tracesOf.Uebersicht" to refresh' >/dev/null 2>&1 || true
echo "Removed $DEST"
