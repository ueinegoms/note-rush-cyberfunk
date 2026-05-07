import { G, unlockAnswer } from './state.js';
import * as game from './game.js';
import * as lb from './leaderboard.js';
import { startComboTimer, stopComboTimer, updateComboDisplay, setComboTimeoutHandler } from './combo-timer.js';
import { resetKbScroll, registerKbWrapper } from './keyboard-scroll.js';
import { buildRefPiano } from './piano.js';
import { sessionIntroduced } from './session.js';
import { rLearn } from './stages/phase1-learn.js';
import { rIdentify } from './stages/phase2-identify.js';
import { rPlace } from './stages/phase3-place.js';
import { rPlay } from './stages/phase4-play.js';
import { rListen } from './stages/phase5-listen.js';
import { rScale } from './stages/phase6-scale.js';
import { rRhythm } from './stages/phase7-rhythm.js';
import { renderGameOver } from './stages/game-over.js';

// Wire the combo timeout handler here to break:
//   combo-timer.js → game-over.js → main.js → combo-timer.js (circular)
setComboTimeoutHandler(() => renderGameOver());

// ── Render epoch — incremented on every render(), guards stale async callbacks ──
let _epoch = 0;
export function getEpoch() { return _epoch; }

// ── Timestamp / reaction tracking ──
const ct = document.getElementById('ct');
let _questionStart = 0;
let _selectionTime = 0;
let _freshStart = true;  // true until player makes first input after startGame()
let _timerArmed = false;

// Called by startGame() to flag that the next stampQuestion should defer the timer
export function setFreshStart() { _freshStart = true; }

export function stampQuestion() {
  _questionStart = Date.now(); _selectionTime = 0;
  // Phase 6 always waits; fresh start waits for first input;
  // active mid-game questions: start timer immediately.
  if (G.phase === 6 || _freshStart) { _timerArmed = true; }
  else { _timerArmed = false; startComboTimer(); }
}

export function stampSelection() {
  _selectionTime = Date.now();
  _freshStart = false; // player is now active
  if (_timerArmed) { _timerArmed = false; startComboTimer(); }
}

export function selectionElapsed() { return (_selectionTime || Date.now()) - _questionStart; }
export function reactionDelay()    { return Math.min(Date.now() - _questionStart, 800); }

// ── Page transitions ──
function showGamePage() {
  document.getElementById('intro-main').style.display = 'none';
  document.getElementById('game-header').classList.add('show');
  document.getElementById('game-page').classList.add('show');
  window.scrollTo(0, 0);
}

function showIntroPage() {
  sessionIntroduced.clear();
  document.getElementById('intro-main').style.display = '';
  document.getElementById('game-header').classList.remove('show');
  document.getElementById('game-page').classList.remove('show');
  window.scrollTo(0, 0);
  lb.renderLeaderboard(document.getElementById('lb-intro'));
}

// ── Reference piano (shown below phase cards) ──
function appendRefPiano() {
  const active = game.ga(), allScale = game.gn();
  const outer = document.createElement('div');
  outer.className = 'ref-piano-outer';
  const lbl = document.createElement('div');
  lbl.className = 'ref-piano-lbl';
  lbl.textContent = 'teclado de referência (use o seu instrumento de base, se puder)';
  outer.appendChild(lbl);
  const pianoWrap = buildRefPiano(active, allScale);
  outer.appendChild(pianoWrap);
  ct.appendChild(outer);
  registerKbWrapper(pianoWrap);
}

// Keep the note count slider in sync with G.unlocked
function syncNoteSlider() {
  const sni = document.getElementById('sni');
  const sniV = document.getElementById('sni-v');
  if (!sni) return;
  sni.value = G.unlocked;
  if (sniV) sniV.textContent = G.unlocked;
}

// ── Main render dispatcher ──
export function render() {
  _epoch++;
  ct.innerHTML = '';
  document.querySelectorAll('.ref-piano-outer').forEach(el => el.remove());
  resetKbScroll();
  unlockAnswer();
  stopComboTimer();
  updateComboDisplay();
  syncNoteSlider();
  if (G.phase === 0) { showIntroPage(); return; }

  showGamePage();

  if      (G.phase === 1) rLearn();
  else if (G.phase === 2) rIdentify();
  else if (G.phase === 3) rPlace();
  else if (G.phase === 4) rPlay();
  else if (G.phase === 5) rListen();
  else if (G.phase === 6) rScale();
  else if (G.phase === 7) rRhythm();
}

// Safe phase advance — waits for pendingUnlock async delay when needed
export function advancePhaseWithRender(oldPhase) {
  const hadPending = G.pendingUnlock;
  game.goNextPhase(oldPhase);
  if (G.pendingUnlock && !hadPending) {
    setTimeout(() => render(), 900);
  } else {
    render();
  }
}
