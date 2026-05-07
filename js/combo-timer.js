import { G, lockAnswer } from './state.js';
import { onErr } from './game.js';
import { jErrChord } from './audio.js';
import { hapticError } from './haptics.js';

// ══════════════════════════════════════════════
//  COMBO TIMER
//  Drives the #combo-timer-bar progress bar and triggers game-over on expiry.
//  renderGameOver is injected via setComboTimeoutHandler() from renderer.js
//  to avoid a circular import (renderer → game-over → main → renderer).
// ══════════════════════════════════════════════

let _onTimeoutFn = null;
export function setComboTimeoutHandler(fn) { _onTimeoutFn = fn; }

let _comboTimerRaf = 0;
let _comboTimerStart = 0;

// Timer duration from sdif slider — DOM read, will be moved to settings.js in Phase 2
function getTimerDuration() {
  const el = document.getElementById('sdif');
  const v = el ? +el.value : 1;
  const base = 7000 - v * 1000; // 1→6s, 2→5s, 3→4s, 4→3s, 5→2s
  return G.phase === 6 ? base + 10000 : base;
}

export function startComboTimer() {
  stopComboTimer();
  const dur = getTimerDuration();
  if (dur <= 0) { _hideTimerBar(); return; }
  _comboTimerStart = Date.now();
  _showTimerBar();
  function tick() {
    const elapsed = Date.now() - _comboTimerStart;
    const frac = Math.max(0, 1 - elapsed / dur);
    _updateTimerBar(frac);
    if (frac <= 0) {
      // Guard against race with a just-submitted correct answer
      if (!lockAnswer()) return;
      onErr();
      jErrChord(261.63);
      hapticError();
      updateComboDisplay();
      stopComboTimer();
      _onTimeoutFn?.();
      return;
    }
    _comboTimerRaf = requestAnimationFrame(tick);
  }
  _comboTimerRaf = requestAnimationFrame(tick);
}

export function stopComboTimer() {
  cancelAnimationFrame(_comboTimerRaf);
  _comboTimerRaf = 0;
  _hideTimerBar();
}

export function updateComboDisplay() {
  const el = document.getElementById('combo-disp');
  if (!el) return;
  el.textContent = 'x' + G.combo;
}

function _showTimerBar() {
  const bar = document.getElementById('combo-timer-bar');
  if (bar) bar.style.display = '';
}

function _hideTimerBar() {
  const bar = document.getElementById('combo-timer-bar');
  if (bar) { bar.style.display = 'none'; bar.style.width = '100%'; }
}

function _updateTimerBar(frac) {
  const bar = document.getElementById('combo-timer-bar');
  if (!bar) return;
  bar.style.width = (frac * 100) + '%';
  if (frac > 0.5)      bar.style.background = 'var(--ok)';
  else if (frac > 0.2) bar.style.background = 'var(--plus2)';
  else                 bar.style.background = 'var(--err)';
}
