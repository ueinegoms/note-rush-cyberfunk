import { G, lockAnswer } from './state.js';
import { onErr } from './game.js';
import { jErrChord } from './audio.js';
import { hapticError } from './haptics.js';
import { getTimerDuration } from './settings.js';

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

export function startComboTimer() {
  stopComboTimer();
  const dur = getTimerDuration(G.phase);
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
