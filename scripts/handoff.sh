#!/usr/bin/env bash
# handoff.sh — Generate an AI session-resume context block
# Usage: bash scripts/handoff.sh
# Then paste the copied text into a new Copilot chat and say: "resume implementation"

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUTPUT=""
SEP="════════════════════════════════════════"

OUTPUT+="$SEP
NOTE RUSH CYBERFUNK — AI SESSION HANDOFF
$(date '+%Y-%m-%d %H:%M')
$SEP

## GIT STATUS
$(git status --short)

## LAST 5 COMMITS
$(git log --oneline -5)

## CORTEX/todo.md
$(cat CORTEX/todo.md 2>/dev/null || echo '(file not found)')

## INSTRUCTIONS
Paste this block into a new GitHub Copilot Chat and say:
  \"resume implementation\"
The AI will read the todo, check the codebase, and continue from where it left off.

## DEV SERVER
$(lsof -ti :8080 &>/dev/null && echo 'Running at http://localhost:8080' || echo 'Not running — start with: bash scripts/dev.sh')
"

echo "$OUTPUT"

# ── Copy to clipboard (try multiple tools) ─────────────────────────────────
if command -v xclip &>/dev/null; then
  echo "$OUTPUT" | xclip -selection clipboard
  echo ""
  echo "✓ Copied to clipboard via xclip"
elif command -v xsel &>/dev/null; then
  echo "$OUTPUT" | xsel --clipboard --input
  echo ""
  echo "✓ Copied to clipboard via xsel"
elif command -v wl-copy &>/dev/null; then
  echo "$OUTPUT" | wl-copy
  echo ""
  echo "✓ Copied to clipboard via wl-copy"
else
  echo ""
  echo "⚠ No clipboard tool found (install xclip, xsel, or wl-clipboard)"
  echo "  Copy the text above manually."
fi
