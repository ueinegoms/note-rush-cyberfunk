import {LS,BY,SW,SH,NX,AN,nd,SCALE_TYPES,buildScale,scaleName} from './constants.js';
import {shuf} from './utils.js';
import {playNote,jOkChord,jErrChord,unlockAudio} from './audio.js';
import {G, lockAnswer, unlockAnswer} from './state.js';
import * as game from './game.js';
import {onOk, onErr} from './game.js';
import * as lb from './leaderboard.js';
import {buildStaff, buildStaffDrag, NY} from './staff.js';
import {buildRefPiano} from './piano.js';
import {hapticNudge, hapticSuccess, hapticError, hapticBuzz, hapticRevolution, hapticBoundary} from './haptics.js';
import { rLearn } from './stages/phase1-learn.js';
import { rIdentify } from './stages/phase2-identify.js';
import { rPlace } from './stages/phase3-place.js';
import { rPlay } from './stages/phase4-play.js';
import { rListen } from './stages/phase5-listen.js';
import { rScale } from './stages/phase6-scale.js';
import { renderGameOver } from './stages/game-over.js';
import { startOnboarding } from './stages/onboarding.js';

// Notes already shown in Phase 1 this session — persists across restarts
export const sessionIntroduced = new Set();

// Top-5 leaderboard threshold — fetched once at init, updated when player enters top 5
let _top5Threshold = Infinity;
export function getTop5Threshold() { return _top5Threshold; }

// Render epoch — incremented on every render(); guards stale async callbacks (e.g. lb.getLeaderboard)
let _epoch = 0;
export function getEpoch() { return _epoch; }

// Track last click/tap position for lightning origin
let _lastClickX = 0, _lastClickY = 0;
document.addEventListener('pointerdown', e => { _lastClickX = e.clientX; _lastClickY = e.clientY; }, true);

// Mobile detection
const _isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ══════════════════════════════════════════════
//  SHARED KEYBOARD SCROLL MANAGER
//  Both .pianow elements (ref + answer) share one scrollLeft value so they
//  stay perfectly aligned on the X axis.  No native scrollbar is shown;
//  dragging anywhere on the piano background moves both.
// ══════════════════════════════════════════════
let _kbScrollX = 0;
let _kbSavedScroll = null;   // persists user scroll across render cycles
const _kbWrappers = [];
let _kbDragEl = null, _kbDragStartX = 0, _kbDragStartScroll = 0;

export function resetKbScroll() {
  // Save current scroll position before clearing wrappers
  if (_kbWrappers.length > 0) _kbSavedScroll = _kbScrollX;
  _kbWrappers.length = 0;
  _kbScrollX = 0;
}

function syncKbScroll(left) {
  const max = _kbWrappers.reduce((m, el) => Math.max(m, el.scrollWidth - el.clientWidth), 0);
  _kbScrollX = Math.max(0, Math.min(left, max));
  _kbWrappers.forEach(el => { el.scrollLeft = _kbScrollX; });
}

export function registerKbWrapper(el) {
  _kbWrappers.push(el);
  // Ensure the wrapper has explicit height matching the piano inside
  const piano = el.querySelector('.piano');
  if (piano) el.style.height = piano.style.height;
  // Apply saved scroll position, or center if first time
  if (_kbWrappers.length === 1) {
    requestAnimationFrame(() => {
      const target = _kbSavedScroll !== null
        ? _kbSavedScroll
        : (el.scrollWidth - el.clientWidth) / 2;
      syncKbScroll(target);
      // Double-RAF for mobile layout timing reliability
      if (_isMobile) requestAnimationFrame(() => syncKbScroll(target));
    });
  } else {
    el.scrollLeft = _kbScrollX;
  }

  // Touch drag — works even when starting on a key (distinguishes tap vs swipe).
  let _t0 = null, _ts = 0, _isDrag = false;
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    _t0 = e.touches[0].clientX; _ts = _kbScrollX; _isDrag = false;
    el.dataset.scrolling = '';
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    if (_t0 === null) return;
    e.preventDefault();
    const dx = _t0 - e.touches[0].clientX;
    if (!_isDrag && Math.abs(dx) < 10) return;  // dead zone
    _isDrag = true;
    el.dataset.scrolling = '1';
    syncKbScroll(_ts + dx);
  }, { passive: false });
  el.addEventListener('touchend', () => { _t0 = null; _isDrag = false; el.dataset.scrolling = ''; }, { passive: true });
  el.addEventListener('touchcancel', () => { _t0 = null; _isDrag = false; el.dataset.scrolling = ''; }, { passive: true });

  // Mouse drag (desktop).
  el.addEventListener('mousedown', e => {
    if (e.target.closest('.wkey,.bkey')) return;
    _kbDragEl = el; _kbDragStartX = e.clientX; _kbDragStartScroll = _kbScrollX;
    e.preventDefault();
  });
}
// Global mouse handlers — registered once so fast drags don’t lose tracking.
window.addEventListener('mousemove', e => {
  if (!_kbDragEl) return;
  syncKbScroll(_kbDragStartScroll + (_kbDragStartX - e.clientX));
});
window.addEventListener('mouseup', () => { _kbDragEl = null; });

// ══════════════════════════════════════════════
//  TOGGLE ROW HELPERS
// ══════════════════════════════════════════════
export function togglePhase(cbId, rowId) {
  const cb = document.getElementById(cbId);
  cb.checked = !cb.checked;
  updateRowStyle(cbId, rowId);
}
export function updateRowStyle(cbId, rowId) {
  const cb = document.getElementById(cbId);
  const row = document.getElementById(rowId);
  if (cb.checked) row.classList.remove('off');
  else row.classList.add('off');
}

// ══════════════════════════════════════════════
//  PAGE TRANSITIONS
// ══════════════════════════════════════════════
function showGamePage() {
  document.getElementById('intro-main').style.display = 'none';
  document.getElementById('game-header').classList.add('show');
  document.getElementById('game-page').classList.add('show');
  window.scrollTo(0, 0);
}
function showIntroPage() {
  sessionIntroduced.clear(); // fresh session when returning to menu
  document.getElementById('intro-main').style.display = '';
  document.getElementById('game-header').classList.remove('show');
  document.getElementById('game-page').classList.remove('show');
  window.scrollTo(0, 0);
  lb.renderLeaderboard(document.getElementById('lb-intro'));
}

// ══════════════════════════════════════════════
//  LIGHTNING
// ══════════════════════════════════════════════
export function lightningIntensity(ms) {
  const MIN_T = 1000, MAX_T = 5000;
  if (ms <= MIN_T) return 1;
  if (ms >= MAX_T) return 0;
  return 1 - (ms - MIN_T) / (MAX_T - MIN_T);
}

export function lightning(t) {
  if (t === undefined) t = 1;
  if (t <= 0) return;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const COLOR = '#FFFF5E';

  const mix = (lo, hi) => lo + t * (hi - lo);

  const glowWidth  = mix(0.5, 2);
  const coreWidth  = mix(0.3, 0.8);
  const glowBlur   = mix(2, 10);
  const coreBlur   = mix(0.5, 3);
  const rayBlur    = mix(1, 6);
  const stepBase   = mix(0.03, 0.2);
  const stepCount  = Math.round(mix(5, 20));
  const rayMin     = Math.round(mix(0, 2));
  const rayExtra   = Math.round(mix(0, 2));
  const rayLenMin  = mix(2, 8);
  const rayLenRand = mix(3, 12);

  // Origin = last click (exact), target = combo display with slight displacement
  const comboEl = document.getElementById('combo-disp');
  const comboRect = comboEl ? comboEl.getBoundingClientRect() : null;
  const ox = _lastClickX || W / 2;
  const oy = _lastClickY || H / 2;
  const comboW = comboRect ? comboRect.width : 40;
  const comboH = comboRect ? comboRect.height : 30;
  const maxSpread = mix(0.01, 0.15);

  function genBolt(spreadFrac) {
    // Start exactly at click
    const sx = ox;
    const sy = oy;
    // End with slight random displacement around combo element area
    const etx = (comboRect ? comboRect.left + comboRect.width / 2 : W / 2) + (Math.random() - 0.5) * comboW * 0.6;
    const ety = (comboRect ? comboRect.top + comboRect.height / 2 : 30) + (Math.random() - 0.5) * comboH * 0.5;
    const pts = [{x:sx, y:sy, rays:[]}];
    let cx = sx, cy = sy;
    let ang = Math.atan2(ety - sy, etx - sx) + (Math.random() - 0.5) * 0.3;
    const base = Math.min(W, H) * stepBase;
    for (let i = 0; i < stepCount; i++) {
      // Stop bolt once it reaches near the target
      const distToTarget = Math.hypot(etx - cx, ety - cy);
      if (distToTarget < base * 1.5) {
        pts.push({x: etx, y: ety, rays: []});
        break;
      }
      // Re-steer toward target with random jitter
      const toTarget = Math.atan2(ety - cy, etx - cx);
      ang = ang + (toTarget - ang) * 0.5 + (Math.random() - 0.5) * 0.8;
      let nx = cx + Math.cos(ang) * base * (0.5 + Math.random() * 0.9);
      let ny = cy + Math.sin(ang) * base * (0.5 + Math.random() * 0.9);
      let hit = false;
      // Wall-slide: project current direction onto the wall's axis (no target steering, no rays)
      if (nx < 0)  { nx = 0; ang = Math.sin(ang) >= 0 ?  Math.PI/2 : -Math.PI/2; ang += (Math.random()-0.5)*0.12; hit = true; }
      if (nx > W)  { nx = W; ang = Math.sin(ang) >= 0 ?  Math.PI/2 : -Math.PI/2; ang += (Math.random()-0.5)*0.12; hit = true; }
      if (ny < 0)  { ny = 0; ang = Math.cos(ang) >= 0 ?  0         :  Math.PI;   ang += (Math.random()-0.5)*0.12; hit = true; }
      if (ny > H)  { ny = H; ang = Math.cos(ang) >= 0 ?  0         :  Math.PI;   ang += (Math.random()-0.5)*0.12; hit = true; }
      pts.push({x:nx, y:ny, rays:[]});
      cx = nx; cy = ny;
    }
    return pts;
  }

  function drawBolt(pts, alpha, reveal, pulseBlur) {
    const n = Math.max(2, Math.ceil(pts.length * reveal));
    const vis = pts.slice(0, n);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLOR;
    ctx.shadowColor = COLOR;
    ctx.lineWidth = glowWidth; ctx.shadowBlur = glowBlur * pulseBlur;
    ctx.beginPath();
    vis.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();
    ctx.lineWidth = coreWidth; ctx.shadowBlur = coreBlur * pulseBlur;
    ctx.beginPath();
    vis.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();
    vis.forEach(p => {
      p.rays.forEach(ray => {
        ctx.lineWidth = coreWidth; ctx.shadowBlur = rayBlur * pulseBlur;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ray.a)*ray.len, p.y + Math.sin(ray.a)*ray.len);
        ctx.stroke();
      });
    });
  }

  const numBolts = Math.max(1, G._lastBonus || 1);
  const TOTAL_MS = 320;
  const SPREAD_MS = 200;  // reveal segments over first 200ms
  const FADE_MS = TOTAL_MS - SPREAD_MS; // fade everything over last 120ms
  const PULSE_MS = 140;
  const bolts = [];
  for (let i = 0; i < numBolts; i++) {
    const spreadFrac = i / Math.max(1, numBolts - 1);
    bolts.push(genBolt(spreadFrac));
  }

  let t0 = -1;
  function tick(now) {
    if (t0 < 0) t0 = now; // capture start from first actual frame
    const elapsed = now - t0;
    if (elapsed >= TOTAL_MS) { cv.remove(); return; }
    const reveal = Math.min(1, elapsed / SPREAD_MS);
    let alpha = 1;
    if (elapsed > SPREAD_MS) {
      alpha = Math.max(0, 1 - (elapsed - SPREAD_MS) / FADE_MS);
    }
    const pulsePhase = (elapsed % PULSE_MS) / PULSE_MS;
    const pulseBlur = 0.4 + 0.6 * (pulsePhase < 0.5 ? pulsePhase * 2 : 2 - pulsePhase * 2);
    ctx.clearRect(0, 0, W, H);
    bolts.forEach(pts => drawBolt(pts, alpha, reveal, pulseBlur));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Safe phase advance with proper render timing
export function advancePhaseWithRender(oldPhase) {
  const hadPending = G.pendingUnlock;
  game.goNextPhase(oldPhase);
  // If pendingUnlock is true, we called advanceNote which has a 1-second delay
  if (G.pendingUnlock && !hadPending) {
    setTimeout(() => render(), 900);
  } else {
    // Normal phase advance, render immediately
    render();
  }
}

// ══════════════════════════════════════════════
//  COMBO TIMER
// ══════════════════════════════════════════════
let _comboTimerId = 0;
let _comboTimerRaf = 0;
let _comboTimerStart = 0;

function getTimerDuration() {
  // sdif slider: 1 = 6s, 2 = 5s, 3 = 4s, 4 = 3s, 5 = 2s
  const el = document.getElementById('sdif');
  const v = el ? +el.value : 1;
  const base = 7000 - v * 1000; // 1→6s, 2→5s, 3→4s, 4→3s, 5→2s
  return G.phase === 6 ? base + 10000 : base;
}

export function startComboTimer() {
  stopComboTimer();
  const dur = getTimerDuration();
  if (dur <= 0) { hideTimerBar(); return; }
  _comboTimerStart = Date.now();
  showTimerBar();
  // Animate the bar
  function tick() {
    const elapsed = Date.now() - _comboTimerStart;
    const frac = Math.max(0, 1 - elapsed / dur);
    updateTimerBar(frac);
    if (frac <= 0) {
      // Guard against race with a just-submitted correct answer
      if (!lockAnswer()) return;
      // Time's up — lose combo
      onErr();
      jErrChord(261.63);
      hapticError();
      updateComboDisplay();
      stopComboTimer();
      renderGameOver();
      return;
    }
    _comboTimerRaf = requestAnimationFrame(tick);
  }
  _comboTimerRaf = requestAnimationFrame(tick);
}

export function stopComboTimer() {
  cancelAnimationFrame(_comboTimerRaf);
  _comboTimerRaf = 0;
  hideTimerBar();
}

function showTimerBar() {
  const bar = document.getElementById('combo-timer-bar');
  if (bar) bar.style.display = '';
}

function hideTimerBar() {
  const bar = document.getElementById('combo-timer-bar');
  if (bar) { bar.style.display = 'none'; bar.style.width = '100%'; }
}

function updateTimerBar(frac) {
  const bar = document.getElementById('combo-timer-bar');
  if (!bar) return;
  bar.style.width = (frac * 100) + '%';
  // Color transitions: green → yellow → red
  if (frac > 0.5) bar.style.background = 'var(--ok)';
  else if (frac > 0.2) bar.style.background = 'var(--plus2)';
  else bar.style.background = 'var(--err)';
}

// ══════════════════════════════════════════════
//  RENDER / UI
// ══════════════════════════════════════════════
const ct = document.getElementById('ct');
let _questionStart = 0;
let _selectionTime = 0;
let _freshStart = true; // true until player makes first input after startGame()
export function stampQuestion() {
  _questionStart = Date.now(); _selectionTime = 0;
  // Phase 6 always waits; fresh start (just restarted) waits for first input;
  // active mid-game combo questions: start timer immediately.
  if (G.phase === 6 || _freshStart) { _timerArmed = true; }
  else { _timerArmed = false; startComboTimer(); }
}
export function stampSelection() {
  _selectionTime = Date.now();
  _freshStart = false; // player is now active
  if (_timerArmed) { _timerArmed = false; startComboTimer(); }
}
let _timerArmed = false;
export function selectionElapsed() { return (_selectionTime || Date.now()) - _questionStart; }
export function reactionDelay() { return Math.min(Date.now() - _questionStart, 800); }

export function updateComboDisplay() {
  const el = document.getElementById('combo-disp'); if(!el) return;
  el.textContent = 'x'+G.combo;
}

// Keep the "quantidade de notas" slider in sync with G.unlocked
function syncNoteSlider() {
  const sni = document.getElementById('sni');
  const sniV = document.getElementById('sni-v');
  if (!sni) return;
  sni.value = G.unlocked;
  if (sniV) sniV.textContent = G.unlocked;
}

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

  if      (G.phase===1) rLearn();
  else if (G.phase===2) rIdentify();
  else if (G.phase===3) rPlace();
  else if (G.phase===4) rPlay();
  else if (G.phase===5) rListen();
  else if (G.phase===6) rScale();
}

export const DIF_LABELS = ['tranquilo (6s)','fácil (5s)','médio (4s)','difícil (3s)','insano (2s)'];
// ══════════════════════════════════════════════
//  START & INITIALIZATION
// ══════════════════════════════════════════════
// keepUnlocked=true: auto-restart after loss (preserve note count + sessionIntroduced)
// keepUnlocked=false: fresh start from menu (reset note count, clear sessionIntroduced)
export function startGame(keepUnlocked = false) {
  const prevUnlocked = keepUnlocked ? (G.unlocked || 0) : 0;
  if (!keepUnlocked) { sessionIntroduced.clear(); _kbSavedScroll = null; }
  _freshStart = true; // wait for first input before starting timer
  game.startGame();
  if (prevUnlocked > G.unlocked) G.unlocked = prevUnlocked;
  render();
}

// ══════════════════════════════════════════════
//  MOBILE SILENT-MODE WARNING
// ══════════════════════════════════════════════
let _silentModalShown = false;
function ensureAudioReady(callback) {
  if (!_isMobile || _silentModalShown) {
    unlockAudio();
    callback();
    return;
  }
  _silentModalShown = true;
  const overlay = document.createElement('div');
  overlay.className = 'silent-modal-overlay';
  overlay.innerHTML = `
    <div class="silent-modal">
      <div class="silent-modal-icon">🔊</div>
      <div class="silent-modal-text">Ei, você tá no celular, né?<br>Pro som do jogo funcionar<br><strong>TIRE DO SILENCIOSO</strong></div>
      <button class="btn" id="silent-modal-ok">OK, já tirei!</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('silent-modal-ok').addEventListener('click', () => {
    overlay.remove();
    unlockAudio();
    callback();
  });
}

// hook UI controls loaded from HTML
function initUI() {
  document.getElementById('start-btn').addEventListener('click', () => { ensureAudioReady(() => startOnboarding()); });
  document.getElementById('skip-ob-btn').addEventListener('click', () => { ensureAudioReady(() => startGame(false)); });

  // Unlock audio on any first interaction (covers play-again etc.)
  const _unlockOnce = () => { unlockAudio(); document.removeEventListener('click', _unlockOnce); document.removeEventListener('touchstart', _unlockOnce); };
  document.addEventListener('click', _unlockOnce);
  document.addEventListener('touchstart', _unlockOnce);

  // sliders
  const sfp = document.getElementById('sfp');
  const sfpV = document.getElementById('sfp-v');
  sfp.addEventListener('input', ()=>{sfpV.textContent = sfp.value;});
  const sni = document.getElementById('sni');
  const sniV = document.getElementById('sni-v');
  sni.addEventListener('input', ()=>{
    const v = +sni.value;
    sniV.textContent = v;
    // Live mid-game adjustment
    if (G.phase > 0) {
      const allN = game.gn();
      G.unlocked = Math.min(v, allN.length);
      render();
    }
  });

  const snr = document.getElementById('snr');
  const snrV = document.getElementById('snr-v');
  const soct = document.getElementById('soct');
  const soctV = document.getElementById('soct-v');

  function updateConfigScale() {
    const typeIdx = Math.max(0, Math.min(SCALE_TYPES.length - 1, (+snr.value) - 1));
    const octaves = Math.max(1, Math.min(5, +soct.value));
    snrV.textContent = SCALE_TYPES[typeIdx].name;
    soctV.textContent = octaves;
    const scaleLen = buildScale(typeIdx, octaves).length;
    sni.max = scaleLen;
    if (+sni.value > scaleLen) { sni.value = scaleLen; sniV.textContent = scaleLen; }
  }
  snr.addEventListener('input', updateConfigScale);
  soct.addEventListener('input', updateConfigScale);
  updateConfigScale(); // set initial sni max based on defaults

  // difficulty (timer) slider
  const sdif = document.getElementById('sdif');
  const sdifV = document.getElementById('sdif-v');
  sdif.addEventListener('input', ()=>{ sdifV.textContent = DIF_LABELS[+sdif.value - 1]; });

  // toggle rows (label click)
  document.querySelectorAll('.ptoggle-row').forEach(row=>{
    row.addEventListener('click', e=>{
      const phase = row.dataset.phase;
      if(!phase) return;
      const cb = document.getElementById(phase);
      cb.checked = !cb.checked;
      updateRowStyle(phase, row.id);
    });
  });
  // checkbox change
  document.querySelectorAll('.ptoggle-row input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change', e=>{
      const row = cb.closest('.ptoggle-row');
      if(row) updateRowStyle(cb.id, row.id);
    });
  });
}

// kick things off
document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  // Fetch top-5 threshold so lightning color reflects leaderboard status
  try {
    const rows = await lb.getLeaderboard();
    if (rows && rows.length >= 5) _top5Threshold = rows[rows.length - 1].score;
    else _top5Threshold = 0; // fewer than 5 entries — any score qualifies
  } catch { _top5Threshold = Infinity; }
  lb.renderLeaderboard(document.getElementById('lb-intro'));
});
