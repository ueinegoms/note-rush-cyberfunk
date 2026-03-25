import { nd, LS, BY } from '../constants.js';
import { G, lockAnswer } from '../state.js';
import * as game from '../game.js';
import { onOk, onErr } from '../game.js';
import { playNote, jOkChord, jErrChord } from '../audio.js';
import { buildStaffDrag } from '../staff.js';
import { hapticSuccess, hapticError, hapticNudge, hapticBoundary, hapticRevolution } from '../haptics.js';
import { renderGameOver } from './game-over.js';
import {
  render, advancePhaseWithRender,
  lightning, lightningIntensity,
  updateComboDisplay, stopComboTimer,
  stampQuestion, stampSelection, selectionElapsed, reactionDelay,
  getEpoch, getTop5Threshold
} from '../main.js';

const ct = document.getElementById('ct');

let _dragSp = null;
let _dragMinSp = 0, _dragMaxSp = 8;

// ── PHASE 3 — PLACE ──
export function rPlace() {
  if (!G.cur || G.ans) game.pickNew();
  stampQuestion();
  const note = G.cur, n = nd(note);
  const card = document.createElement('div'); card.className = 'panel pop-in'; card.id = 'acard';
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hint = isTouchDevice ? 'Arraste ↕ pra posicionar, confirme' : 'Clique na posição correta na pauta';
  card.innerHTML = `<div class="ptag">Fase 3 — Posicione a nota</div>
    <div class="nname">${n.lB}</div>
    <div class="drag-hint" id="drag-hint">${hint}</div>
    <div class="drag-staffw" id="drag-staff"></div>
    <div id="fb"></div>
    <button class="btn" id="drag-confirm" style="display:none">✓ Confirmar posição</button>`;
  ct.appendChild(card);
  setTimeout(() => playNote(n.f), 300);
  initDragStaff(note);
  const confirmBtn = document.getElementById('drag-confirm');
  if (confirmBtn) confirmBtn.addEventListener('click', hPlaceDrag);
}

function initDragStaff(note) {
  const staffEl = document.getElementById('drag-staff');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const validSps = game.ga().map(nid => nd(nid).s + 5);
  const minSp = Math.min(...validSps), maxSp = Math.max(...validSps);
  _dragMinSp = minSp; _dragMaxSp = maxSp;
  _dragSp = validSps[Math.floor(validSps.length / 2)];
  function renderDrag(ghostSp = null, revealId = null) { staffEl.innerHTML = buildStaffDrag(_dragSp, revealId, ghostSp, minSp, maxSp); }
  if (isTouchDevice) {
    document.getElementById('drag-confirm').style.display = 'block';
    renderDrag();
    let _prevY = null, _prevTime = null, _subStep = 0, _lastDragSp = _dragSp;
    let _totalSteps = 0, _atBoundary = false, _lastRevCount = 0;
    const PX_PER_STEP = LS / 2;
    const _revSteps = Math.max(1, validSps.length);
    function snapToValid(sp) { return validSps.reduce((b, v) => Math.abs(v - sp) < Math.abs(b - sp) ? v : b, validSps[0]); }
    staffEl.addEventListener('touchstart', e => { if (G.ans) return; e.preventDefault(); _prevY = e.touches[0].clientY; _prevTime = performance.now(); _subStep = 0; }, { passive: false });
    staffEl.addEventListener('touchmove', e => {
      if (G.ans || _prevY === null) return; e.preventDefault();
      const now = performance.now(); const curY = e.touches[0].clientY;
      const rawDy = _prevY - curY; const dt = Math.max(1, now - _prevTime);
      const vel = Math.abs(rawDy) / dt;
      // Velocity acceleration: slow drag = 1:1 fine control, fast swipe = up to 3x
      const accel = Math.max(1, Math.min(3, 1 + Math.max(0, vel - 0.3) / 0.4));
      _subStep += (rawDy / PX_PER_STEP) * accel;
      const steps = _subStep >= 0 ? Math.floor(_subStep) : Math.ceil(_subStep); _subStep -= steps;
      if (steps !== 0) { _totalSteps += steps; const revNow = Math.floor(Math.abs(_totalSteps) / _revSteps); if (revNow > _lastRevCount) { hapticRevolution(); _lastRevCount = revNow; } const newSp = snapToValid(Math.max(minSp, Math.min(maxSp, _dragSp + steps))); if (newSp !== _lastDragSp) { _atBoundary = false; _dragSp = newSp; renderDrag(); hapticNudge(); const mn = game.ga().find(nid => nd(nid).s + 5 === _dragSp); if (mn) playNote(nd(mn).f, 0.4); _lastDragSp = _dragSp; } else { const _isAtBnd = (steps > 0 && _dragSp >= maxSp) || (steps < 0 && _dragSp <= minSp); if (_isAtBnd && !_atBoundary) { hapticBoundary(); _atBoundary = true; } } }
      _prevY = curY; _prevTime = now;
    }, { passive: false });
    staffEl.addEventListener('touchend', e => { if (G.ans || _prevY === null) return; e.preventDefault(); stampSelection(); const mn = game.ga().find(nid => nd(nid).s + 5 === _dragSp); if (mn) playNote(nd(mn).f, 0.4); _prevY = null; }, { passive: false });
  } else {
    let _hoverSp = null;
    renderDrag(null);
    staffEl.addEventListener('mousemove', e => { if (G.ans) return; const svg = staffEl.querySelector('svg'); if (!svg) return; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const sp2 = pt.matrixTransform(svg.getScreenCTM().inverse()); const rawSp = (BY - sp2.y) / (LS / 2); const snapped = validSps.reduce((b, v) => Math.abs(v - rawSp) < Math.abs(b - rawSp) ? v : b, validSps[0]); if (snapped !== _hoverSp) { _hoverSp = snapped; _dragSp = snapped; renderDrag(_hoverSp); } });
    staffEl.addEventListener('mouseleave', () => { if (G.ans) return; _hoverSp = null; renderDrag(null); });
    staffEl.addEventListener('click', e => { if (G.ans || _hoverSp === null) return; stampSelection(); const corSp = nd(G.cur).s + 5; const chosen = _hoverSp === corSp ? G.cur : game.ga().find(nid => nd(nid).s + 5 === _hoverSp); if (chosen) hPlace(chosen); });
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
