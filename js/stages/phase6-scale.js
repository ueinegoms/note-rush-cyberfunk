import { nd, AN, SCALE_TYPES, buildScale, scaleName } from '../constants.js';
import { G, lockAnswer, unlockAnswer } from '../state.js';
import * as game from '../game.js';
import { onErr } from '../game.js';
import { playNote, jOkChord, jErrChord } from '../audio.js';
import { buildRefPiano } from '../piano.js';
import { hapticSuccess, hapticError } from '../haptics.js';
import { renderGameOver } from './game-over.js';
import {
  render, advancePhaseWithRender,
  lightning, updateComboDisplay, stopComboTimer,
  stampQuestion, stampSelection, reactionDelay,
  registerKbWrapper, getEpoch, getTop5Threshold
} from '../main.js';

const ct = document.getElementById('ct');

// ── PHASE 6 — SCALE DRILL (piano builder) ──
export function rScale() {
  // Random scale type each round, 1 octave for drill
  const typeIdx = Math.floor(Math.random() * SCALE_TYPES.length);
  const octaves = 1;
  const drillNotes = buildScale(typeIdx, octaves);
  // Pick a contiguous slice of G.unlocked notes from the full scale
  const fullSeq = [...drillNotes].sort((a, b) => nd(a).f - nd(b).f);
  const count = Math.min(G.unlocked, fullSeq.length);
  const maxStart = fullSeq.length - count;
  const start = Math.floor(Math.random() * (maxStart + 1));
  const targetSeq = fullSeq.slice(start, start + count);
  G.scaleTarget = targetSeq;
  G.cur = targetSeq[0] || null;
  G.ans = false;
  stampQuestion();

  const freqs = drillNotes.map(id => nd(id).f);
  const minF = Math.min(...freqs), maxF = Math.max(...freqs);
  const rangeIds = AN.filter(n => n.f >= minF * 0.97 && n.f <= maxF * 1.03).map(n => n.id);
  const sName = scaleName(typeIdx, octaves);

  const slotCount = targetSeq.length;
  const card = document.createElement('div'); card.className = 'panel pop-in piano-card'; card.id = 'acard';
  card.innerHTML = `<div class="ptag">Fase 6 — Monte a escala</div>
    <button class="btn btn-ghost" id="scale-listen-target">OUVIR ESCALA ${sName.toUpperCase()}</button>
    <div id="scale-built" class="scale-built-grid"></div>
    <div id="pia"></div>
    <div class="scale-actions">
      <button class="btn" id="scale-confirm" disabled>✓ Confirmar</button>
    </div>
    <div id="fb"></div>`;
  ct.appendChild(card);

  const builtArr = [];
  const builtEl = document.getElementById('scale-built');
  const confirmBtn = document.getElementById('scale-confirm');

  function renderBuilt() {
    let html = '';
    for (let i = 0; i < slotCount; i++) {
      const id = builtArr[i];
      html += id
        ? `<span class="scale-slot filled">${nd(id).lB}</span>`
        : `<span class="scale-slot empty"></span>`;
    }
    builtEl.innerHTML = html;
    confirmBtn.disabled = builtArr.length < slotCount;
  }
  renderBuilt();

  // Piano keyboard — show all notes in the scale's octave range (no highlighting clue)
  const pianoWrap = buildRefPiano(rangeIds, rangeIds, (cid) => {
    stampSelection();
    if (builtArr.length >= slotCount) {
      builtArr.shift(); // drop leftmost
    }
    builtArr.push(cid);
    renderBuilt();
  });
  card.querySelector('#pia').appendChild(pianoWrap);
  registerKbWrapper(pianoWrap);

  // Listen to target scale
  function playSeq(seq) {
    const ms = Math.max(40, Math.round(1200 / seq.length));
    seq.forEach((nid, i) => setTimeout(() => playNote(nd(nid).f, 0.6), i * ms));
  }
  document.getElementById('scale-listen-target').addEventListener('click', () => playSeq(targetSeq));
  setTimeout(() => playSeq(targetSeq), 300);

  // Confirm
  confirmBtn.addEventListener('click', () => hScale(builtArr, targetSeq));
}

function hScale(builtArr, targetSeq) {
  if (G.ans || !lockAnswer()) return;
  const fb = document.getElementById('fb');
  const correct = builtArr.length === targetSeq.length && builtArr.every((id, i) => id === targetSeq[i]);
  if (correct) {
    stopComboTimer();
    fb.textContent = 'CERTO!'; fb.className = 'ok';
    const seq = targetSeq;
    const ms = Math.max(40, Math.round(800 / seq.length));
    seq.forEach((nid, i) => setTimeout(() => playNote(nd(nid).f, 0.5), i * ms));
    // Scale drill reward: double current combo
    G.combo = Math.max(1, G.combo * 2);
    G._lastBonus = G.combo;
    if (G.combo > G.bestCombo) G.bestCombo = G.combo;
    G.streak++;
    G.ans = true;
    unlockAnswer();
    jOkChord(nd(targetSeq[0]).f);
    hapticSuccess(); lightning(1);
    updateComboDisplay();
    const rd = reactionDelay();
    // Phase 6: always advance after 1 correct (no need to repeat)
    setTimeout(() => advancePhaseWithRender(G.phase), rd); return;
  } else {
    fb.textContent = 'ERROU — tente de novo!'; fb.className = 'err';
    playNote(nd(targetSeq[0]).f, .8); onErr();
    jErrChord(nd(targetSeq[0]).f); if (G._lastCombo <= getTop5Threshold()) hapticError(); updateComboDisplay();
    stopComboTimer();
    const c = document.getElementById('acard');
    if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
    const _eg = getEpoch(); setTimeout(() => { if (getEpoch() === _eg) renderGameOver(); }, 800);
  }
}
