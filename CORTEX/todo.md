# TODO — Note Rush Cyberfunk

## In Progress
- [x] Phase 0: CORTEX brain setup
- [x] Phase 1: main.js decomposition — COMMITTED (162307f)

## Phases

### Phase 1 — main.js Decomposition (DONE)
- [x] Create js/session.js
- [x] Create js/keyboard-scroll.js
- [x] Create js/lightning.js
- [x] Create js/combo-timer.js
- [x] Create js/renderer.js
- [x] Slim js/main.js to init + re-exports

### Phase 2 — Decouple game.js from DOM
- [ ] Create js/settings.js with getSettings()
- [ ] Update game.js gn(), ga(), S() to use getSettings()
- [ ] Remove hidden <select id="nr"> from index.html (if confirmed unused)

### Phase 3 — CSS Variant System
- [ ] Refactor css/components/buttons.css to data-variant pattern
- [ ] Update index.html + stage HTML to use data-variant="..." on buttons
- [ ] Refactor staff CSS for ledger line variants
- [ ] Keep old selectors as aliases until Phase 6

### Phase 4 — JS UI Component Library
- [ ] js/components/PhaseCard.js
- [ ] js/components/FeedbackDisplay.js
- [ ] js/components/OptionGrid.js
- [ ] js/components/SliderRow.js
- [ ] Migrate stages one by one: ph1 → ph2 → ph5 → ph4 → ph3 → ph6

### Phase 5 — Phase 3 (Posição) UX Rebuild
- [ ] New drag strip design (vertical handle on side of staff)
- [ ] Audio on every step during drag
- [ ] CSS: .drag-strip, .drag-handle, .drag-ghost + ledger line transitions
- [ ] buildStaffDragV2() in staff.js OR enhance buildStaffDrag()
- [ ] Mobile: better confirm button placement
- [ ] Desktop: drag strip available + direct click still works

### Phase 6 — Final Cleanup
- [ ] Remove old CSS alias selectors from Phase 3
- [ ] Remove dead code (hidden #nr select, commented blocks)
- [ ] Sweep magic numbers → constants.js
- [ ] Update CORTEX knowledge files to final state

## Backlog (out of current scope)
- [ ] localStorage settings persistence
- [ ] Test runner / unit tests for game.js
- [ ] Phase 7+ ideas: rhythm mode, chord identification, sight-reading
- [ ] PWA service worker / offline mode
- [ ] Dark/light theme toggle
- [ ] Accessibility: ARIA labels for piano keys
