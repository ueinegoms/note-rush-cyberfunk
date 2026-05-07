#!/usr/bin/env bash
# review-feedback.sh — Aggregate feedback exports for AI review
# 
# Usage:
#   mkdir -p CORTEX/feedback
#   # copy exported .json files from admin panel into CORTEX/feedback/
#   bash scripts/review-feedback.sh
#   # paste output into a new Copilot chat for analysis

set -euo pipefail

FEEDBACK_DIR="${1:-CORTEX/feedback}"

if [[ ! -d "$FEEDBACK_DIR" ]]; then
  echo "No feedback directory found at $FEEDBACK_DIR"
  echo "Export feedback from ?admin=1 and save files to $FEEDBACK_DIR/"
  exit 0
fi

JSON_FILES=("$FEEDBACK_DIR"/*.json)
if [[ ! -e "${JSON_FILES[0]}" ]]; then
  echo "No .json files found in $FEEDBACK_DIR"
  exit 0
fi

echo "═══════════════════════════════════════"
echo " NOTE RUSH — Feedback Review"
echo " $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════"
echo ""

# Combine all JSON arrays into one, then aggregate with Python
python3 - "$FEEDBACK_DIR"/*.json << 'PYEOF'
import sys, json, statistics
from collections import defaultdict

entries = []
for path in sys.argv[1:]:
    with open(path) as f:
        data = json.load(f)
        if isinstance(data, list):
            entries.extend(data)

if not entries:
    print("No entries found.")
    sys.exit(0)

print(f"Total entries: {len(entries)}\n")

groups = defaultdict(list)
for e in entries:
    key = f"{e.get('testId','general')}/{e.get('variant') or '-'}"
    groups[key].append(e)

for key, items in sorted(groups.items()):
    rated = [e['stars'] for e in items if e.get('stars', 0) > 0]
    avg = f"{statistics.mean(rated):.1f}" if rated else "—"
    print(f"── {key}  ({len(items)} responses, ★{avg} avg) ──")
    messages = [(e.get('stars',0), e['msg']) for e in items if e.get('msg','').strip()]
    if messages:
        for stars, msg in messages:
            print(f"  ★{stars}  \"{msg}\"")
    else:
        print("  (no text comments)")
    print()

PYEOF
