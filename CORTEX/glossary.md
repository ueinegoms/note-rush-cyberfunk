# Glossary

## Domain Terms
| Term | Meaning |
|---|---|
| **Pauta** | Music staff (the 5 lines) |
| **Nota** | Note |
| **Clave de Sol** | Treble clef (G clef), symbol at start of staff |
| **Clave** | Clef symbol in general |
| **Linha suplementar** | Ledger line (extra lines above/below staff) |
| **Oitava** | Octave |
| **Escala** | Scale |
| **Dó/Ré/Mi/Fá/Sol/Lá/Si** | Solfège: C D E F G A B |
| **Bemol (♭)** | Flat accidental |
| **Compasso** | Measure/bar |
| **Fase** | Phase/stage of the game (1-6) |
| **Acerto** | Correct answer |
| **Erro** | Wrong answer |
| **Combo** | Score multiplier chain |
| **Streak** | Consecutive correct answers in one phase |

## Code Terms
| Term | Meaning |
|---|---|
| **G** | Global game state object (state.js) |
| **AN[]** | Array of all notes (constants.js) |
| **nd(id)** | Find note by id in AN[] |
| **sp** | Staff position = n.s + 5 (render offset) |
| **s** | Raw staff position from note data (n.s) |
| **LS** | Line spacing in pixels (33) |
| **BY** | Staff baseline Y coordinate (173) |
| **sfp** | Streak for phase advance (config slider) |
| **sni** | Starting note count (config slider) |
| **snr** | Scale type index (config slider, 1-based) |
| **soct** | Octave count (config slider) |
| **sdif** | Difficulty = timer speed (config slider) |
| **ct** | `document.getElementById('ct')` render target |
| **acard** | Active phase card element (#acard) |
| **fb** | Feedback element (#fb) inside acard |
| **rLearn/rIdentify/rPlace/rPlay/rListen/rScale** | Phase render functions |
| **onOk(ms)** | Score update for correct answer |
| **onErr()** | Score update for wrong answer |
| **ga()** | Get active (unlocked) notes |
| **gn()** | Get all notes for current scale settings |
| **nextQ()** | Pick next question (pickNew + buildSOpts) |
| **stampQuestion()** | Record question start time |
| **stampSelection()** | Record user interaction time |
| **lockAnswer()** | One-time lock to prevent double-tap |
| **_epoch** | Render counter — guards stale async callbacks |
| **keepUnlocked** | startGame flag: true=auto-restart, false=fresh |
| **pendingUnlock** | G flag: advanceNote() async in-flight |
| **sessionIntroduced** | Set of note IDs shown in Phase 1 this session |
| **validSps** | Array of staff positions for current note set |
| **dragSp** | Current ghost note staff position in Phase 3 drag |
| **_kbScrollX** | Shared scroll position of both piano wrappers |
| **PHASE_BONUS** | Points per correct answer per phase: {1:1, 2:2, 3:3, 4:4, 5:5, 6:10} |

## File Nicknames
| Nickname | Path |
|---|---|
| **main.js** | js/main.js (app init + re-exports) |
| **renderer** | js/renderer.js |
| **kb-scroll** | js/keyboard-scroll.js |
| **lightning** | js/lightning.js |
| **combo-timer** | js/combo-timer.js |
| **session** | js/session.js |
| **phase1..6** | js/stages/phase1-learn.js .. phase6-scale.js |
| **game-over** | js/stages/game-over.js |
| **onboarding** | js/stages/onboarding.js |
