import { nd, LS, BY } from '../constants.js';
import { G, lockAnswer } from '../state.js';
import * as game from '../game.js';
import { onOk, onErr } from '../game.js';
import { playNote, jOkChord, jErrChord } from '../audio.js';
import { buildStaffDrag } from '../staff.js';
import { hapticSuccess, hapticError, hapticNudge, hapticBoundary } from '../haptics.js';
import { renderGameOver } from './game-over.js';
import {
  render, advancePhaseWithRender,
  lightning, lightningIntensity,
  updateComboDisplay, stopComboTimer,
  stampQuestion, stampSelection, selectionElapsed, reactionDelay,
  getEpoch, getTop5Threshold
} from '../main.js';

import { makeCard, makeFeedback } from '../components.js';

const ct = document.getElementById('ct');

let _dragSp = null;
let _dragMinSp = 0, _dragMaxSp = 8;

// ── PHASE 3 — PLACE ──
export function rPlace() {
  if (!G.cur || G.ans) game.pickNew();
  stampQuestion();
  const note = G.cur, n = nd(note);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const card = makeCard({ phase: 3, label: 'Posicione a nota' });
  const nname = document.createElement('div'); nname.className = 'nname'; nname.textContent = n.lB;

  // drag layout: staff SVG + side strip (▲ label ▼)
  const dragLayout = document.createElement('div'); dragLayout.className = 'drag-layout';
  const dragStaff = document.createElement('div'); dragStaff.className = 'drag-staffw'; dragStaff.id = 'drag-staff';
  const dragStrip = document.createElement('div'); dragStrip.className = 'drag-strip';
  const upBtn = document.createElement('button'); upBtn.className = 'drag-btn'; upBtn.id = 'drag-up'; upBtn.textContent = '▲'; upBtn.setAttribute('aria-label', 'Subir nota');
  const stripLabel = document.createElement('div'); stripLabel.className = 'drag-strip-label'; stripLabel.id = 'drag-strip-label';
  const downBtn = document.createElement('button'); downBtn.className = 'drag-btn'; downBtn.id = 'drag-down'; downBtn.textContent = '▼'; downBtn.setAttribute('aria-label', 'Descer nota');
  dragStrip.append(upBtn, stripLabel, downBtn);
  dragLayout.append(dragStaff, dragStrip);

  const hintText = isTouchDevice ? 'Toque ▲▼ para mover, confirme' : 'Clique na pauta ou use ▲▼ para posicionar';
  const dragHint = document.createElement('div'); dragHint.className = 'drag-hint'; dragHint.id = 'drag-hint'; dragHint.textContent = hintText;
  const fb = makeFeedback();
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn'; confirmBtn.id = 'drag-confirm'; confirmBtn.textContent = '✓ Confirmar posição';
  if (!isTouchDevice) confirmBtn.style.display = 'none';

  card.append(nname, dragLayout, dragHint, fb, confirmBtn);
  ct.appendChild(card);
  setTimeout(() => playNote(n.f), 300);
  initDragStaff(note);
  confirmBtn.addEventListener('click', () => { stampSelection(); hPlaceDrag(); });
}

function initDragStaff(note) {
  const staffEl    = document.getElementById('drag-staff');
  const stripLabel = document.getElementById('drag-strip-label');
  const confirmBtn = document.getElementById('drag-confirm');
  const upBtn      = document.getElementById('drag-up');
  const downBtn    = document.getElementById('drag-down');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // sorted ascending so index arithmetic works cleanly
  const validSps = game.ga().map(nid => nd(nid).s + 5).sort((a, b) => a - b);
  const minSp = validSps[0], maxSp = validSps[validSps.length - 1];
  _dragMinSp = minSp; _dragMaxSp = maxSp;
  _dragSp = validSps[Math.floor(validSps.length / 2)];

  function getNoteAtSp(sp) { return game.ga().find(nid => nd(nid).s + 5 === sp); }
  function updateLabel(sp) { const mn = getNoteAtSp(sp); stripLabel.textContent = mn ? nd(mn).lB : '—'; }
  function renderDrag(ghostSp = null, revealId = null) { staffEl.innerHTML = buildStaffDrag(_dragSp, revealId, ghostSp, minSp, maxSp); }

  renderDrag();
  updateLabel(_dragSp);

  // ── step by index: move one position up/down in validSps
  function step(delta) {
    if (G.ans) return;
    const idx = validSps.indexOf(_dragSp);
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= validSps.length) { hapticBoundary(); return; }
    _dragSp = validSps[nextIdx];
    hapticNudge();
    renderDrag();
    updateLabel(_dragSp);
    const mn = getNoteAtSp(_dragSp);
    if (mn) playNote(nd(mn).f, 0.4);
    // reveal confirm button on desktop once user interacts with ▲/▼
    if (!isTouchDevice && confirmBtn.style.display === 'none') confirmBtn.style.display = 'block';
  }

  // ── hold-to-repeat: tap once, or hold for continuous stepping
  let _holdTimer = null, _holdInterval = null;
  function startHold(delta) {
    step(delta);
    _holdTimer = setTimeout(() => { _holdInterval = setInterval(() => step(delta), 110); }, 380);
  }
  function stopHold() {
    clearTimeout(_holdTimer); clearInterval(_holdInterval);
    _holdTimer = null; _holdInterval = null;
  }
  function bindHold(btn, delta) {
    btn.addEventListener('mousedown',   e => { e.preventDefault(); startHold(delta); });
    btn.addEventListener('touchstart',  e => { e.preventDefault(); startHold(delta); }, { passive: false });
    btn.addEventListener('mouseup',     stopHold);
    btn.addEventListener('mouseleave',  stopHold);
    btn.addEventListener('touchend',    stopHold);
    btn.addEventListener('touchcancel', stopHold);
  }
  bindHold(upBtn, 1);
  bindHold(downBtn, -1);

  // ── desktop: hover shows ghost position; click confirms instantly
  if (!isTouchDevice) {
    let _hoverSp = null;
    staffEl.addEventListener('mousemove', e => {
      if (G.ans) return;
      const svg = staffEl.querySelector('svg'); if (!svg) return;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const sp2 = pt.matrixTransform(svg.getScreenCTM().inverse());
      const rawSp = (BY - sp2.y) / (LS / 2);
      const snapped = validSps.reduce((b, v) => Math.abs(v - rawSp) < Math.abs(b - rawSp) ? v : b, validSps[0]);
      if (snapped !== _hoverSp) { _hoverSp = snapped; _dragSp = snapped; renderDrag(_hoverSp); updateLabel(_dragSp); }
    });
    staffEl.addEventListener('mouseleave', () => {
      if (G.ans) return; _hoverSp = null; renderDrag(); updateLabel(_dragSp);
    });
    staffEl.addEventListener('click', e => {
      if (G.ans || _hoverSp === null) return;
      stampSelection();
      const corSp = nd(G.cur).s + 5;
      const chosen = _hoverSp === corSp ? G.cur : game.ga().find(nid => nd(nid).s + 5 === _hoverSp);
      if (chosen) hPlace(chosen);
    });
  }
}

function hPlaceDrag() {
  if (G.ans || !lockAnswer()) return;
  const cor = G.cur, corSp = nd(cor).s + 5, staffEl = document.getElementById('drag-staff'), fb = document.getElementById('fb'), confirmBtn = document.getElementById('drag-confirm');
  if (confirmBtn) confirmBtn.disabled = true;
  if (_dragSp === corSp) {
    stopComboTimer(); staffEl.innerHTML = buildStaffDrag(_dragSp, null, null, _dragMinSp, _dragMaxSp); fb.textContent = 'CERTO!'; fb.className = 'ok'; playNote(nd(cor).f, .8); onOk(selectionElapsed());
    jOkChord(nd(cor).f); hapticSuccess(); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
    const { sfp } = game.S(); const rd = reactionDelay();
    if (G.streak >= sfp) { setTimeout(() => advancePhaseWithRender(G.phase), rd); return; }
    setTimeout(() => { game.nextQ(); render(); }, rd);
  } else {
    staffEl.innerHTML = buildStaffDrag(_dragSp, cor, null, _dragMinSp, _dragMaxSp); fb.textContent = 'ERROU — era ' + nd(cor).lB; fb.className = 'err'; playNote(nd(cor).f, .8); onErr();
    jErrChord(nd(cor).f); if (G._lastCombo <= getTop5Threshold()) hapticError(); updateComboDisplay();
    const c = document.getElementById('acard'); if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
    const _eg = getEpoch(); setTimeout(() => { if (getEpoch() === _eg) renderGameOver(); }, 800);
  }
}

function hPlace(chosen) {
  if (G.ans || !lockAnswer()) return;
  const cor = G.cur, staffEl = document.getElementById('drag-staff'), fb = document.getElementById('fb');
  if (chosen === cor) {
    stopComboTimer(); staffEl.innerHTML = buildStaffDrag(nd(cor).s + 5, null, null, _dragMinSp, _dragMaxSp); fb.textContent = 'CERTO!'; fb.className = 'ok'; playNote(nd(cor).f, .8); onOk(selectionElapsed());
    jOkChord(nd(cor).f); hapticSuccess(); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
    const { sfp } = game.S(); const rd = reactionDelay();
    if (G.streak >= sfp) { setTimeout(() => advancePhaseWithRender(G.phase), rd); return; }
    setTimeout(() => { game.nextQ(); render(); }, rd);
  } else {
    staffEl.innerHTML = buildStaffDrag(nd(chosen).s + 5, cor, null, _dragMinSp, _dragMaxSp); fb.textContent = 'ERROU — era ' + nd(cor).lB; fb.className = 'err'; playNote(nd(cor).f, .8); onErr();
    jErrChord(nd(cor).f); if (G._lastCombo <= getTop5Threshold()) hapticError(); updateComboDisplay();
    const c = document.getElementById('acard'); if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
    const _eg = getEpoch(); setTimeout(() => { if (getEpoch() === _eg) renderGameOver(); }, 800);
  }
}
