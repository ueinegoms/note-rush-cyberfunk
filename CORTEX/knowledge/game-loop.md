# Game Loop & State Machine

## State Object (G) — js/state.js
```js
G = {
  phase: 0,          // 0=menu, 1=learn, 2=identify, 3=place, 4=play, 5=listen, 6=scale
  streak: 0,         // correct answers this phase streak
  unlocked: 2,       // how many notes are active (unlocked difficulty curve)
  combo: 0,          // current combo score
  bestCombo: 0,
  cur: null,         // current target note ID (e.g. 'Dó4')
  ans: false,        // true after answer submitted (prevents double-tap)
  sopts: [],         // shuffled options for phase 5 listen
  li: 0,             // learn index (phase 1 pagination)
  pendingUnlock: true/false,  // an advanceNote() is in-flight (800ms async)
  _lastCombo: 0,     // combo value before this answer (for leaderboard check)
  _lastBonus: 0,     // G.combo value set for lightning intensity
  lastNote: null,    // previous note (avoid immediate repeat)
  scaleIdx: 0,       // current scale note index (phase 6)
  scaleDir: 1,       // scale direction (phase 6)
  scalePrev: null,
  scaleTarget: []    // target sequence for phase 6
}
```

## Phase Flow
```
0 (Menu) → startOnboarding() or startGame()
         → G.phase = firstActivePhase() (usually 1)

Phase loop per note:
  Phase 1 (Learn)    → show staff + note name → Praticar →
  Phase 2 (Identify) → show staff, pick name from options →
  Phase 3 (Place)    → show name, drag/click note position on staff →
  Phase 4 (Play)     → show staff, play note on piano keyboard →
  Phase 5 (Listen)   → hear note, pick name from options →
  Phase 6 (Scale)    → hear scale, build it on piano keyboard →

  After sfp correct answers in a phase → advance to next active phase
  After completing all active phases for current note → advanceNote()
  advanceNote() → unlock next note, loop back to first active phase
  All notes unlocked → loop first active phase forever

Game Over: wrong answer in any phase → renderGameOver()
```

## Scoring
```
onOk(reactionMs):
  G.streak++
  const bonus = PHASE_BONUS[G.phase]  // {1:1, 2:2, 3:3, 4:4, 5:5, 6:10}
  const timeMult = lightningIntensity(reactionMs)  // 0..1 based on speed
  G._lastBonus = bonus (used for lightning bolt count)
  G._lastCombo = G.combo
  G.combo += bonus
  if G.combo > G.bestCombo → G.bestCombo = G.combo
  G.ans = true

onErr():
  G._lastCombo = G.combo
  G.combo = 0
  G.streak = 0
  G.ans = true
  // triggers renderGameOver after 800ms
```

## Note Unlock Curve
Notes are ordered CENTER-OUT from B4 (the easiest, most central note):
- Start: G.unlocked = sni (from config, default 3)
- Each time all phases complete for current notes: G.unlocked++
- sessionIntroduced tracks which notes have been shown in Phase 1 this session
  (cleared on fresh startGame, not on keepUnlocked restart)

## Timer Behavior
- Timer starts when `stampQuestion()` is called (or deferred to first input if fresh start / phase 6)
- Duration: 7000 - sdif*1000 ms (6s default), +10000ms for phase 6
- On expiry: onErr() + renderGameOver() (via setComboTimeoutHandler callback)
- Disarmed on: stopComboTimer() (called in render() and every answer handler)
- Visual: #combo-timer-bar fills width 100%→0%, color green→yellow→red

## Phase Toggle Config
- Checkboxes #ph1..#ph6 in config panel control which phases are active
- getActivePhases() reads them; if none checked, all 6 are active
- Phase 5 and 6 are OFF by default

## Answer Lock Pattern
- lockAnswer() → sets _answerLock=true, returns false if already locked
- unlockAnswer() → clears _answerLock
- render() always calls unlockAnswer() on entry (reset between questions)
- All answer handlers: `if (G.ans || !lockAnswer()) return;`
