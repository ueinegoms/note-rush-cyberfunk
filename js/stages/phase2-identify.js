import { nd } from '../constants.js';
import { shuf } from '../utils.js';
import { G, lockAnswer } from '../state.js';
import * as game from '../game.js';
import { onOk, onErr } from '../game.js';
import { playNote, jOkChord, jErrChord } from '../audio.js';
import { buildStaff } from '../staff.js';
import { hapticSuccess, hapticError } from '../haptics.js';
import { renderGameOver } from './game-over.js';
import {
  render, advancePhaseWithRender,
  lightning, lightningIntensity,
  updateComboDisplay, stopComboTimer,
  stampQuestion, stampSelection, selectionElapsed, reactionDelay,
  getEpoch, getTop5Threshold
} from '../main.js';

const ct = document.getElementById('ct');

// ── PHASE 2 — IDENTIFY ──
export function rIdentify() {
  if (!G.cur || G.ans) game.pickNew();
  stampQuestion();
  const validSps = game.ga().map(nid => nd(nid).s + 5);
  const rangeMinSp = Math.min(...validSps), rangeMaxSp = Math.max(...validSps);
  const distractorCount = Math.min(2, game.ga().length - 1);
  const note = G.cur, dist = game.getDistractors([note], distractorCount), ch = shuf([note, ...dist]);
  const card = document.createElement('div'); card.className = 'panel pop-in'; card.id = 'acard';
  card.innerHTML = `<div class="ptag">Fase 2 — Qual é esta nota?</div>
    <div class="staffw" id="sd">${buildStaff({ showNote: note, rangeMinSp, rangeMaxSp })}</div>
    <div class="opts">${ch.map(nid => `<button class="btn-option" id="ob-${nid}">${nd(nid).lB}</button>`).join('')}</div>
    <div id="fb"></div>`;
  ct.appendChild(card);
  setTimeout(() => playNote(nd(note).f), 300);
  ch.forEach(nid => {
    document.getElementById('ob-' + nid).addEventListener('click', () => { stampSelection(); hId(nid); });
  });
}

// Shared identification handler (also used by phase 5)
export function hId(chosen) {
  if (G.ans || !lockAnswer()) return;
  const cor = G.cur;
  document.querySelectorAll('.btn-option').forEach(b => b.disabled = true);
  document.getElementById('ob-' + cor)?.classList.add('correct');
  const fb = document.getElementById('fb');
  if (chosen === cor) {
    stopComboTimer();
    fb.textContent = 'CERTO!'; fb.className = 'ok';
    if (G.phase !== 5) playNote(nd(cor).f, .8);
    onOk(selectionElapsed());
    jOkChord(nd(cor).f); hapticSuccess(); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
    const { sfp } = game.S(); const rd = reactionDelay();
    if (G.streak >= sfp) { setTimeout(() => advancePhaseWithRender(G.phase), rd); return; }
    setTimeout(() => { game.nextQ(); render(); }, rd);
  } else {
    document.getElementById('ob-' + chosen)?.classList.add('wrong');
    fb.textContent = 'ERROU — era ' + nd(cor).lB; fb.className = 'err';
    playNote(nd(cor).f, .8); onErr();
    jErrChord(nd(cor).f); if (G._lastCombo <= getTop5Threshold()) hapticError(); updateComboDisplay();
    const c = document.getElementById('acard'); if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
    const _eg = getEpoch(); setTimeout(() => { if (getEpoch() === _eg) renderGameOver(); }, 800);
  }
}
