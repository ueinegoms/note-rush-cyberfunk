# How to Resume an AI Session

## The Problem
AI coding assistants don't have memory across browser sessions. When you close the tab, context is lost.

## The Solution: handoff.sh

Run this from the repo root:
```bash
bash scripts/handoff.sh
```

This generates a context block with:
- Current git status + last 5 commits
- Full `CORTEX/todo.md` (shows exactly what's done and what's next)
- Dev server status

It automatically copies to clipboard.

## Steps

1. Run `bash scripts/handoff.sh`  
2. Open a new Copilot Chat (any session, any device)  
3. Paste the clipboard content  
4. Say: **"resume implementation"**

The AI will:
- Check the CORTEX/todo.md to find the next incomplete item
- Read the relevant files before touching them
- Continue exactly where the last session left off

## Dev Server

```bash
bash scripts/dev.sh
```

- Starts Python HTTP server on port 8080
- If `ngrok` is installed: prints a public HTTPS URL for testing on other devices
- Install ngrok at https://ngrok.com/download (it's free for personal use)

## Remote Test + Work Flow

```
Home machine:
  bash scripts/dev.sh          → prints: Public: https://abc123.ngrok.io

Work machine:
  Open https://abc123.ngrok.io → tests the live app on your home machine
  bash scripts/handoff.sh      → clipboard → paste → Copilot continues
```

No credentials, no shell access, no security risk — ngrok only exposes the static HTML/JS.
