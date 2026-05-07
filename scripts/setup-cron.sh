#!/usr/bin/env bash
# setup-cron.sh — One-time setup: generate secret, start gate server, install cron job.
# Run once (or re-run to refresh — idempotent).
#
# Usage: bash scripts/setup-cron.sh

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE_PORT=8081
SECRET_FILE="$REPO_ROOT/.gate-secret"
GITIGNORE="$REPO_ROOT/.gitignore"
GATE_SCRIPT="$REPO_ROOT/scripts/copilot_gate.py"

echo "── Note Rush Copilot Gate Setup ─────────────────────────────"

# ── 1. Generate secret ───────────────────────────────────────────────────────
if [ ! -f "$SECRET_FILE" ]; then
  openssl rand -hex 16 > "$SECRET_FILE"
  echo "✓ Secret generated → .gate-secret"
else
  echo "  .gate-secret already exists (keeping)"
fi
SECRET="$(cat "$SECRET_FILE")"

# ── 2. Gitignore ─────────────────────────────────────────────────────────────
if ! grep -qxF '.gate-secret' "$GITIGNORE" 2>/dev/null; then
  echo '.gate-secret' >> "$GITIGNORE"
  echo "✓ .gate-secret added to .gitignore"
fi

# ── 3. Chmod scripts ─────────────────────────────────────────────────────────
chmod +x "$REPO_ROOT/scripts/reprompt.sh"
chmod +x "$GATE_SCRIPT"

# ── 4. Stop any existing gate server ─────────────────────────────────────────
if lsof -ti ":$GATE_PORT" &>/dev/null; then
  echo "  Stopping existing gate server on port $GATE_PORT..."
  lsof -ti ":$GATE_PORT" | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi

# ── 5. Start gate server ──────────────────────────────────────────────────────
nohup python3 "$GATE_SCRIPT" >> /tmp/gate.log 2>&1 &
GATE_PID=$!
sleep 0.8

if kill -0 "$GATE_PID" 2>/dev/null; then
  echo "✓ Gate server started (PID $GATE_PID) — http://127.0.0.1:$GATE_PORT"
else
  echo "✗ Gate server failed to start. Check /tmp/gate.log"
  exit 1
fi

# ── 6. Install cron job ────────────────────────────────────────────────────────
# Remove any stale entries for our gate
CRON_MARKER="# note-rush-reprompt"
(crontab -l 2>/dev/null | grep -v "$CRON_MARKER") | crontab -
# Add new entry
(crontab -l 2>/dev/null; echo "*/30 * * * * curl -sf -X POST \"http://localhost:$GATE_PORT/resume/$SECRET\" >> /tmp/reprompt.log 2>&1 $CRON_MARKER") | crontab -
echo "✓ Cron job installed (every 30 min)"

# ── 7. Print summary ──────────────────────────────────────────────────────────
echo ""
echo "── Trigger manually ─────────────────────────────────────────"
echo "  curl -X POST http://localhost:$GATE_PORT/resume/$SECRET"
echo ""
echo "── Gate logs ────────────────────────────────────────────────"
echo "  tail -f /tmp/gate.log"
echo "  tail -f /tmp/reprompt.log"
echo ""
echo "── Change the prompt ────────────────────────────────────────"
echo "  edit CORTEX/resume-message.txt"
echo ""
echo "Setup complete."
