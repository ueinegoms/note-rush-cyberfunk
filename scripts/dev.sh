#!/usr/bin/env bash
# dev.sh — Start the Note Rush dev server + Copilot gate, and optionally ngrok tunnels
# Usage: bash scripts/dev.sh

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8080
GATE_PORT=8081
SECRET_FILE="$REPO_ROOT/.gate-secret"

# ── Kill any existing server on the port ───────────────────────────────────
if lsof -ti ":$PORT" &>/dev/null; then
  echo "Killing existing process on port $PORT..."
  lsof -ti ":$PORT" | xargs kill -9
  sleep 0.5
fi

# ── Start Python HTTP server ────────────────────────────────────────────────
cd "$REPO_ROOT"
python3 -m http.server "$PORT" &>/tmp/note-rush-server.log &
SERVER_PID=$!
sleep 0.5

if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Local:  http://localhost:$PORT"
else
  echo "ERROR: server failed to start. Check /tmp/note-rush-server.log"
  exit 1
fi

# ── Start Copilot gate server (if .gate-secret exists) ─────────────────────
if [ -f "$SECRET_FILE" ]; then
  if ! lsof -ti ":$GATE_PORT" &>/dev/null; then
    nohup python3 "$REPO_ROOT/scripts/copilot_gate.py" >> /tmp/gate.log 2>&1 &
    sleep 0.5
  fi
  SECRET="$(cat "$SECRET_FILE")"
  echo "Gate:   http://localhost:$GATE_PORT/resume/$SECRET"
else
  echo "Gate:   (run 'bash scripts/setup-cron.sh' to enable)"
fi

# ── Optionally start ngrok ──────────────────────────────────────────────────
if command -v ngrok &>/dev/null; then
  # Kill existing ngrok instances on our ports
  pkill -f "ngrok http $PORT" 2>/dev/null || true
  pkill -f "ngrok http $GATE_PORT" 2>/dev/null || true
  ngrok http "$PORT" &>/tmp/note-rush-ngrok.log &
  # If gate secret exists, also tunnel the gate
  if [ -f "$SECRET_FILE" ]; then
    ngrok http "$GATE_PORT" &>/tmp/note-rush-ngrok-gate.log &
  fi
  sleep 2

  # Query ngrok local API for both public URLs
  PUBLIC_URL=$(python3 -c "
import urllib.request, json, sys
try:
  data = urllib.request.urlopen('http://localhost:4040/api/tunnels', timeout=3).read()
  tunnels = json.loads(data)['tunnels']
  for t in tunnels:
    print(t['config']['addr'].split(':')[-1], t['public_url'])
except Exception as e:
  print('err', str(e), file=sys.stderr)
  sys.exit(1)
" 2>/dev/null)

  GAME_PUBLIC=""
  GATE_PUBLIC=""
  while IFS= read -r line; do
    port_part="${line%% *}"
    url_part="${line#* }"
    if [ "$port_part" = "$PORT" ]; then GAME_PUBLIC="$url_part"; fi
    if [ "$port_part" = "$GATE_PORT" ]; then GATE_PUBLIC="$url_part"; fi
  done <<< "$PUBLIC_URL"

  [ -n "$GAME_PUBLIC" ] && echo "Public: $GAME_PUBLIC"
  if [ -n "$GATE_PUBLIC" ] && [ -f "$SECRET_FILE" ]; then
    SECRET="$(cat "$SECRET_FILE")"
    echo "Gate:   $GATE_PUBLIC/resume/$SECRET"
  fi
else
  echo ""
  echo "Tip: install ngrok (https://ngrok.com) to get public URLs for remote access."
fi
else
  echo ""
  echo "Tip: install ngrok (https://ngrok.com) to get a public URL for remote testing."
fi

echo ""
echo "Server PID: $SERVER_PID  (log: /tmp/note-rush-server.log)"
echo "Press Ctrl+C or run: kill $SERVER_PID"
