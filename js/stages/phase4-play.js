import { nd, AN } from '../constants.js';
import { G, lockAnswer } from '../state.js';
import * as game from '../game.js';
import { onOk, onErr } from '../game.js';
import { playNote, jOkChord, jErrChord } from '../audio.js';
import { buildRefPiano } from '../piano.js';
import { hapticSuccess, hapticError } from '../haptics.js';
import { renderGameOver } from './game-over.js';
import {
  render, advancePhaseWithRender,
  lightning, lightningIntensity,
  updateComboDisplay, stopComboTimer,
  stampQuestion, stampSelection, selectionElapsed, reactionDelay,
  registerKbWrapper, getEpoch, getTop5Threshold
} from '../main.js';

const ct = document.getElementById('ct');

// ── PHASE 4 — PIANO ──
export function rPlay() {
  if (!G.cur || G.ans) game.pickNew();
  stampQuestion();
  const note = G.cur, n = nd(note), active = game.ga();
  // Range covers only the octaves of currently active (unlocked) notes
  const freqs = active.map(id => nd(id).f);
  const minF = Math.min(...freqs), maxF = Math.max(...freqs);
  const rangeIds = AN.filter(k => k.f >= minF * 0.97 && k.f <= maxF * 1.03).map(k => k.id);
  const card = document.createElement('div'); card.className = 'panel pop-in piano-card'; card.id = 'acard';
  card.innerHTML = `<div class="ptag">Fase 4 — Toque no teclado</div>
    <div class="play-row">
      <button class="btn" id="play-play">♩ Tocar nota</button>
    </div>
    <div id="pia"></div>
    <div id="fb"></div>
    <button class="btn" id="play-confirm" style="display:none">✓ Confirmar</button>`;
  ct.appendChild(card);
  document.getElementById('play-play').addEventListener('click', () => playNote(n.f, 1.2));
  let pendingKey = null;
  const answerWrap = buildRefPiano(active, rangeIds, (cid, btn) => {
    stampSelection();
    pendingKey = cid;
    card.querySelectorAll('.wkey').forEach(k => k.classList.remove('selected-key'));
    btn.classList.add('selected-key');
    document.getElementById('play-confirm').style.display = '';
  });
  card.querySelector('#pia').appendChild(answerWrap);
  registerKbWrapper(answerWrap);
  document.getElementById('play-confirm').addEventListener('click', () => {
    if (pendingKey) hPiano(pendingKey, card.querySelector(`[data-note="${pendingKey}"]`));
  });
  setTimeout(() => playNote(n.f, 1.2), 300);
}

function hPiano(chosen, btn) {
  if (G.ans || !lockAnswer()) return;
  const cor = G.cur;
  document.querySelectorAll('.wkey:not(.inactive),.bkey').forEach(k => { k.classList.add('dis'); k.style.pointerEvents = 'none'; });
  document.querySelector('.wkey[data-note="' + cor + '"]')?.classList.add('ck');
  const fb = document.getElementById('fb');
  if (chosen === cor) {
    stopComboTimer(); fb.textContent = 'CERTO!'; fb.className = 'ok'; onOk(selectionElapsed());
    jOkChord(nd(cor).f); hapticSuccess(); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
    const { sfp } = game.S(); const rd = reactionDelay();
    if (G.streak >= sfp) { setTimeout(() => advancePhaseWithRender(G.phase), rd); return; }
    setTimeout(() => { game.nextQ(); render(); }, rd);
  } else {
    btn.classList.add('wk'); fb.textContent = 'ERROU — era ' + nd(cor).lB; fb.className = 'err'; playNote(nd(cor).f, .8); onErr();
    jErrChord(nd(cor).f); if (G._lastCombo <= getTop5Threshold()) hapticError(); updateComboDisplay();
    const c = document.getElementById('acard'); if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
    const _eg = getEpoch(); setTimeout(() => { if (getEpoch() === _eg) renderGameOver(); }, 800);
  }
}
