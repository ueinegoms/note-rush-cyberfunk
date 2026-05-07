# Architecture — Module Map & Dependency Graph

## Entry Point
`index.html` → `<script type="module" src="js/main.js">`

## Module Dependency Graph (after Phase 1 refactor)

```
main.js
  ├── session.js            (sessionIntroduced Set)
  ├── keyboard-scroll.js    (piano scroll sync)
  ├── lightning.js          (canvas bolt effect)
  ├── combo-timer.js        (timer RAF, updateComboDisplay)
  ├── renderer.js           (render, stamps, page transitions)
  │     ├── session.js
  │     ├── combo-timer.js
  │     ├── keyboard-scroll.js
  │     ├── game.js
  │     ├── leaderboard.js
  │     ├── piano.js
  │     └── stages/*.js  ←→  main.js  (circular, safe — live bindings)
  ├── game.js               (state transitions, phase logic)
  ├── leaderboard.js        (scores, name entry, Supabase)
  └── stages/onboarding.js

stages/phase1-learn.js
stages/phase2-identify.js
stages/phase3-place.js
stages/phase4-play.js
stages/phase5-listen.js
stages/phase6-scale.js
stages/game-over.js
stages/onboarding.js
  — all import from: constants, state, game, audio, staff/piano, haptics
  — all import UI helpers from: '../main.js'  (re-exported from renderer/lightning/combo-timer/keyboard-scroll)

state.js         — G object, lockAnswer/unlockAnswer (no deps)
constants.js     — AN[], SCALE_TYPES, geometry constants (no deps)
utils.js         — shuf() (no deps)
audio.js         — Web Audio API (no deps)
haptics.js       — vibration API (no deps)
staff.js         — SVG renderer (imports constants)
piano.js         — keyboard builder (imports constants)
```

## Key Exports Per Module

### main.js (re-exports + app init)
- `sessionIntroduced` (re-export from session.js)
- `getTop5Threshold()`
- `DIF_LABELS`
- `togglePhase(cbId, rowId)`
- `updateRowStyle(cbId, rowId)`
- `startGame(keepUnlocked)`
- Re-exports from renderer.js: `render, advancePhaseWithRender, stampQuestion, stampSelection, selectionElapsed, reactionDelay, getEpoch`
- Re-exports from lightning.js: `lightning, lightningIntensity`
- Re-exports from combo-timer.js: `updateComboDisplay, stopComboTimer, startComboTimer`
- Re-exports from keyboard-scroll.js: `registerKbWrapper, resetKbScroll`

### renderer.js
- `render()` — clears ct, dispatches to phase render fn
- `advancePhaseWithRender(oldPhase)` — calls game.goNextPhase, then render
- `stampQuestion()` — records question start time, optionally arms timer
- `stampSelection()` — records selection time, fires armed timer
- `selectionElapsed()` — ms from question to selection
- `reactionDelay()` — capped at 800ms, used for post-answer delays
- `getEpoch()` — render counter, guards stale async callbacks
- `setFreshStart()` — called by startGame() to skip immediate timer arm

### combo-timer.js
- `startComboTimer()` — RAF loop, fires timeout handler on expiry
- `stopComboTimer()` — cancels RAF, hides timer bar
- `updateComboDisplay()` — updates #combo-disp from G.combo
- `setComboTimeoutHandler(fn)` — injected by renderer.js to call renderGameOver

### keyboard-scroll.js
- `registerKbWrapper(el)` — adds piano wrapper, attaches touch/mouse scroll handlers
- `resetKbScroll()` — saves current scroll, clears wrappers
- `clearKbSavedScroll()` — called by startGame(false) for fresh start

### lightning.js
- `lightning(t)` — canvas bolt from last click → #combo-disp, t=0..1 intensity
- `lightningIntensity(ms)` — maps reaction time (ms) to t value

### session.js
- `sessionIntroduced` — Set of note IDs shown in Phase 1 this session

### game.js
- `getActivePhases()` — reads phase toggle checkboxes
- `firstActivePhase()` / `nextActivePhase(current)`
- `gn()` — full note set for current scale/octave settings
- `ga()` — unlocked subset (gn().slice(0, G.unlocked))
- `getDistractors(exclude, count)` — random wrong answers
- `buildSOpts()` — populates G.sopts for Phase 5
- `S()` — reads { sfp, sni } from DOM sliders
- `startGame()` — resets G fields
- `pickNew()` — picks G.cur from ga()
- `goNextPhase(current)` — advances G.phase or calls advanceNote()
- `advanceNote()` — increments G.unlocked, triggers async phase reset
- `nextQ()` — calls pickNew() + buildSOpts()
- `onOk(ms)` / `onErr()` — score updates

### state.js
- `G` — global state object (phase, streak, unlocked, combo, bestCombo, cur, ans, sopts, li, pendingUnlock, _lastCombo, _lastBonus, lastNote, scaleIdx, scaleDir, scalePrev, scaleTarget)
- `lockAnswer()` → bool (false if already locked)
- `unlockAnswer()`

### constants.js
- `LS=33` — staff line spacing (px)
- `BY=173` — staff baseline Y
- `SW=500` — staff width
- `SH=345` — staff height
- `NX=270` — note X position
- `AN[]` — 37 natural notes + 25 flats, Dó2 to Dó7, each: {id, s (staff pos), lb, lB, f (Hz), acc?}
- `nd(id)` — find note by id
- `SCALE_TYPES[]` — 8 types: Maior, Menor Natural, Pentatônica, Menor Harmônica, Menor Melódica, Maior com 7, Dominante, Cromática
- `buildScale(typeIdx, octaves)` — returns note id array
- `scaleName(typeIdx, octaves)` — display string

## HTML Structure
```
<header id="game-header">
  .header-logo-text "NOTE RUSH"
  #combo-timer-bar     ← timer progress bar
  #combo-disp          ← "x0" combo counter

<div id="intro-main">     ← home screen
  #lb-intro              ← leaderboard render target
  .intro-actions
    #start-btn           ← JOGAR button
    #skip-ob-btn

<div id="game-page">      ← game screen
  #ct                    ← stage card render target

<div #config-panel>       ← always accessible below fold
  sliders: #sdif, #sfp, #sni, #snr, #soct
  toggles: #ph1..#ph6 (checkboxes), #row-ph1..#row-ph6 (label rows)
```

## Notes on Circular Dependencies
Stage files import from `'../main.js'`. main.js re-exports from renderer.js etc.
renderer.js imports from stage files. This creates:
  `renderer.js → stages/*.js → main.js → renderer.js`
ES modules resolve this via live bindings — safe because all cross-module
values are only accessed inside function bodies, never at module evaluation time.
