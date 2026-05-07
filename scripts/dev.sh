#!/usr/bin/env bash
# dev.sh — Start the Note Rush dev server (and optionally ngrok tunnel)
# Usage: bash scripts/dev.sh

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8080

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

# ── Optionally start ngrok ──────────────────────────────────────────────────
if command -v ngrok &>/dev/null; then
  # Kill existing ngrok on this port
  pkill -f "ngrok http $PORT" 2>/dev/null || true
  ngrok http "$PORT" &>/tmp/note-rush-ngrok.log &
  sleep 2

  # Query ngrok local API for the public URL
  PUBLIC_URL=$(python3 -c "
import urllib.request, json, sys
try:
  data = urllib.request.urlopen('http://localhost:4040/api/tunnels', timeout=3).read()
  tunnels = json.loads(data)['tunnels']
  https = [t['public_url'] for t in tunnels if t['public_url'].startswith('https')]
  print(https[0] if https else tunnels[0]['public_url'])
except Exception as e:
  print('(could not read ngrok URL: ' + str(e) + ')', file=sys.stderr)
  sys.exit(1)
" 2>/dev/null)

  if [ -n "$PUBLIC_URL" ]; then
    echo "Public: $PUBLIC_URL"
    echo ""
    echo "Share the Public URL to test from another device or network."
  else
    echo "ngrok started but URL unavailable — check http://localhost:4040"
  fi
else
  echo ""
  echo "Tip: install ngrok (https://ngrok.com) to get a public URL for remote testing."
fi

echo ""
echo "Server PID: $SERVER_PID  (log: /tmp/note-rush-server.log)"
echo "Press Ctrl+C or run: kill $SERVER_PID"
