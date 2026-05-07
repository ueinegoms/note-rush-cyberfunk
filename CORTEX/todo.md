# TODO — Note Rush Cyberfunk

## COMPLETED — Session 2 Roadmap (all committed)

### Group 0 — Dev Workflow [✅]
- [x] scripts/dev.sh — start server + optional ngrok
- [x] scripts/handoff.sh — generate AI context block → clipboard
- [x] CORTEX/skills/resume-session.md — handoff protocol

### Phase 1 — main.js Decomposition [✅ 162307f]
- [x] js/session.js, keyboard-scroll.js, lightning.js, combo-timer.js, renderer.js

### Phase 2 — settings.js [✅ 75e6666]
- [x] js/settings.js — getSettings(), getBpm(), getTimerDuration(), etc.
- [x] game.js / combo-timer.js updated to use settings.js

### Phase 3 — CSS data-variant system [✅ f21f822]
- [x] buttons.css — [data-variant="ghost|option|replay|cta"] attribute selectors added

### Phase 4 — JS component library [✅ f21f822]
- [x] js/components.js — makeCard, makeFeedback, makeOptionGrid, makeSliderRow
- [x] phases 1, 2, 3, 5 migrated

### Phase 5 — Phase 3 posição drag-strip V2 [✅ 83d1ec1]
- [x] ▲/▼ buttons with hold-to-repeat replacing SVG touch-drag
- [x] Audio feedback on every step; hapticNudge + hapticBoundary
- [x] Desktop hover + click-to-place still works
- [x] CSS: .drag-layout, .drag-strip, .drag-btn, .drag-strip-label

### Group 2 — A/B + Feedback [✅ e6e27bb]
- [x] js/ab-test.js — getVariant(), setVariant(), clearVariants()
- [x] js/feedback.js — showFeedbackWidget(), getFeedback(), clearFeedback()
- [x] js/admin.js — admin panel at ?admin=1 with export + A/B override
- [x] scripts/review-feedback.sh — aggregate CORTEX/feedback/*.json
- [x] CORTEX/ab-tests/phase3-drag-v2.json — first test manifest
- [x] game-over.js wired; feedback.css styles added

### Group 3 — Phase 7 Ritmo [✅ ef215fa]
- [x] constants.js: DURATIONS array + DEFAULT_BPM
- [x] staff.js: buildStaffRhythm(sp, durationType)
- [x] js/stages/phase7-rhythm.js — tap timing mechanic
- [x] index.html: phase 7 toggle + BPM slider (#sbpm)
- [x] game.js: PHASE_ORDER includes 7, PHASE_BONUS[7]=12
- [x] renderer.js: rRhythm() case added

### Phase 6 — Final Cleanup [✅]
- [x] Remove appendRefPiano dead code from renderer.js
- [x] Remove dead buildRefPiano + registerKbWrapper imports from renderer.js
- [x] CORTEX/todo.md updated to reflect completed state

---

## Backlog
- [ ] localStorage settings persistence
- [ ] Unit tests for game.js / scoring logic
- [ ] PWA service worker / offline mode
- [ ] Accessibility: ARIA labels on interactive elements
- [ ] Wire A/B variant selection into rPlace() once feedback data is collected
- [ ] Phase 8+ ideas: chord identification, sight-reading melodies
