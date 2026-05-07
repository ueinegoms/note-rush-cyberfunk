#!/usr/bin/env bash
# reprompt.sh — Trigger the Copilot Chat inside VS Code to receive a new prompt.
# Uses xdotool (X11 only).
# Called by setup-cron.sh crontab or directly by copilot_gate.py via an HTTP POST.
#
# Usage:
#   bash scripts/reprompt.sh
#   # or via gate: curl -X POST http://localhost:8081/resume/<secret>

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="/tmp/reprompt.log"
MSG_FILE="$REPO_ROOT/CORTEX/resume-message.txt"

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

echo "[$(timestamp)] reprompt.sh invoked" >> "$LOG"

# ── Guard: X11 required ─────────────────────────────────────────────────────
if [ -z "$DISPLAY" ]; then
  export DISPLAY=:0
fi

if ! command -v xdotool &>/dev/null; then
  echo "[$(timestamp)] ERROR: xdotool not found. Install with: sudo apt install xdotool" >> "$LOG"
  exit 1
fi

# ── Find VS Code window ─────────────────────────────────────────────────────
WID=$(xdotool search --class "Code" 2>/dev/null | head -1)
if [ -z "$WID" ]; then
  echo "[$(timestamp)] ERROR: VS Code window not found (xdotool search --class Code returned nothing)" >> "$LOG"
  exit 1
fi

echo "[$(timestamp)] Found VS Code WID=$WID" >> "$LOG"

# ── Focus the window ─────────────────────────────────────────────────────────
xdotool windowraise "$WID"
xdotool windowfocus --sync "$WID"
sleep 0.6

# ── Open Copilot Chat panel ──────────────────────────────────────────────────
# Default VS Code Copilot Chat shortcut: Ctrl+Alt+I
# Edit this line if your keybinding is different.
xdotool key --window "$WID" ctrl+alt+i
sleep 1.2

# ── Type the prompt ──────────────────────────────────────────────────────────
if [ -f "$MSG_FILE" ]; then
  MSG="$(cat "$MSG_FILE" | tr -d '\r\n' | head -c 500)"
else
  MSG="resume implementation"
fi

echo "[$(timestamp)] Typing: $MSG" >> "$LOG"
xdotool type --window "$WID" --clearmodifiers --delay 18 "$MSG"
sleep 0.3
xdotool key --window "$WID" Return

echo "[$(timestamp)] Done." >> "$LOG"
