import {LS,BY,SW,SH,NX,AN,nd,SCALE_TYPES,buildScale,scaleName} from './constants.js';
import {shuf} from './utils.js';
import {playNote,jOkChord,jErrChord,unlockAudio} from './audio.js';
import {G, lockAnswer, unlockAnswer} from './state.js';
import * as game from './game.js';
import {onOk, onErr} from './game.js';
import * as lb from './leaderboard.js';
import {buildStaff, buildStaffDrag, NY} from './staff.js';
import {buildRefPiano} from './piano.js';

// Notes already shown in Phase 1 this session — persists across restarts
const sessionIntroduced = new Set();

// Top-5 leaderboard threshold — fetched once at init, updated when player enters top 5
let _top5Threshold = Infinity;

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

function resetKbScroll() {
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

function registerKbWrapper(el) {
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
function lightningIntensity(ms) {
  const MIN_T = 1000, MAX_T = 5000;
  if (ms <= MIN_T) return 1;
  if (ms >= MAX_T) return 0;
  return 1 - (ms - MIN_T) / (MAX_T - MIN_T);
}

function lightning(t) {
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
      if (nx < 0)  { nx = 0; ang = Math.PI - ang; hit = true; }
      if (nx > W)  { nx = W; ang = Math.PI - ang; hit = true; }
      if (ny < 0)  { ny = 0; ang = -ang;           hit = true; }
      if (ny > H)  { ny = H; ang = -ang;           hit = true; }
      const rays = [];
      if (hit) {
        const count = rayMin + Math.floor(Math.random() * rayExtra);
        for (let rr = 0; rr < count; rr++) {
          const a = (rr / count) * Math.PI * 2;
          const len = rayLenMin + Math.random() * rayLenRand;
          rays.push({ a, len });
        }
      }
      pts.push({x:nx, y:ny, rays});
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
function advancePhaseWithRender(oldPhase) {
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

function startComboTimer() {
  stopComboTimer();
  const dur = getTimerDuration();
  if (dur <= 0 || G.combo === 0) { hideTimerBar(); return; }
  _comboTimerStart = Date.now();
  showTimerBar();
  // Animate the bar
  function tick() {
    const elapsed = Date.now() - _comboTimerStart;
    const frac = Math.max(0, 1 - elapsed / dur);
    updateTimerBar(frac);
    if (frac <= 0) {
      // Time's up — lose combo
      onErr();
      jErrChord(261.63);
      updateComboDisplay();
      stopComboTimer();
      renderGameOver();
      return;
    }
    _comboTimerRaf = requestAnimationFrame(tick);
  }
  _comboTimerRaf = requestAnimationFrame(tick);
}

function stopComboTimer() {
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
function stampQuestion() {
  _questionStart = Date.now(); _selectionTime = 0;
  // Always wait for first player input before starting the timer
  _timerArmed = true;
}
function stampSelection() {
  _selectionTime = Date.now();
  // Start the combo timer on the first player action, not on question appear
  if (_timerArmed) { _timerArmed = false; startComboTimer(); }
}
let _timerArmed = false;
function selectionElapsed() { return (_selectionTime || Date.now()) - _questionStart; }
function reactionDelay() { return Math.min(Date.now() - _questionStart, 800); }

function updateComboDisplay() {
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

function render() {
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

// ── PHASE 1 — LEARN ──
function rLearn() {
  const allNotes = game.ga();
  const newNotes = allNotes.filter(id => !sessionIntroduced.has(id));
  // Nothing new to show — skip straight to practicing
  if (newNotes.length === 0) { game.goNextPhase(1); render(); return; }

  const li = Math.min(G.li, newNotes.length - 1);
  const note = newNotes[li], n = nd(note);
  // Do NOT add to sessionIntroduced on render — we mark notes only when the
  // user finishes the batch (clicks "Praticar →"), so prev/next navigation
  // doesn't corrupt the list.

  const card = document.createElement('div'); card.className='panel pop-in';
  const uBanner = G.pendingUnlock?`<div class="unlock-banner">🔓 Nova nota: ${n.lB}!<span>Veja onde ela fica antes de continuar</span></div>`:'';
  const noteCount = newNotes.length>1?`<div class="linfo">${li+1} / ${newNotes.length} notas</div>`:'';
  card.innerHTML=`<div class="ptag">Fase 1 — Memorize</div>
    ${uBanner}
    <div class="nname">${n.lB}</div>
    <div class="staffw">${buildStaff({showNote:note})}</div>
    <button class="btn" id="learn-play">♩ Ouvir nota</button>
    ${noteCount}
    <div class="lnav">
      ${li>0?`<button class="btn btn-ghost" id="lprev">← Ant</button>`:'<span></span>'}
      ${li<newNotes.length-1
        ?`<button class="btn btn-ghost" id="lnext">Próx →</button>`
        :`<button class="btn" id="go-next">Praticar →</button>`}
    </div>`;
  ct.appendChild(card);
  setTimeout(()=>playNote(n.f),300);
  document.getElementById('learn-play').addEventListener('click',()=>playNote(n.f));
  if (li>0) document.getElementById('lprev').addEventListener('click',()=>{G.li=Math.max(0,li-1); render();});
  if (li<newNotes.length-1) document.getElementById('lnext').addEventListener('click',()=>{G.li=Math.min(newNotes.length-1,li+1); render();});
  if (li>=newNotes.length-1) document.getElementById('go-next').addEventListener('click',()=>{
    // Mark every note the user was shown in this batch as introduced before advancing.
    newNotes.forEach(id => sessionIntroduced.add(id));
    G.li = 0;
    game.goNextPhase(1); render();
  });
}

// ── PHASE 2 — IDENTIFY ──
function rIdentify() {
  if (!G.cur||G.ans) game.pickNew();
  stampQuestion();
  const distractorCount = Math.min(2, game.ga().length - 1);
  const note = G.cur, dist = game.getDistractors([note], distractorCount), ch = shuf([note,...dist]);
  const card = document.createElement('div'); card.className='panel pop-in'; card.id='acard';
  card.innerHTML=`<div class="ptag">Fase 2 — Qual é esta nota?</div>
    <div class="staffw" id="sd">${buildStaff({showNote:note})}</div>
    <div class="opts">${ch.map(nid=>`<button class="btn-option" id="ob-${nid}">${nd(nid).lB}</button>`).join('')}</div>
    <div id="fb"></div>`;
  ct.appendChild(card);
  setTimeout(()=>playNote(nd(note).f),300);
  ch.forEach(nid=>{
    document.getElementById('ob-'+nid).addEventListener('click',()=>{ stampSelection(); hId(nid); });
  });
}

// ── PHASE 3 — PLACE ──
function rPlace() {
  if (!G.cur||G.ans) game.pickNew();
  stampQuestion();
  const note=G.cur, n=nd(note);
  const card=document.createElement('div'); card.className='panel pop-in'; card.id='acard';
  const isTouchDevice='ontouchstart' in window||navigator.maxTouchPoints>0;
  const hint=isTouchDevice?'Arraste ↕ pra posicionar, confirme':'Clique na posição correta na pauta';
  card.innerHTML=`<div class="ptag">Fase 3 — Posicione a nota</div>
    <div class="nname">${n.lB}</div>
    <div class="drag-hint" id="drag-hint">${hint}</div>
    <div class="drag-staffw" id="drag-staff"></div>
    <div id="fb"></div>
    <button class="btn" id="drag-confirm" style="display:none">✓ Confirmar posição</button>`;
  ct.appendChild(card);
  setTimeout(()=>playNote(n.f),300);
  initDragStaff(note);
  const confirmBtn = document.getElementById('drag-confirm');
  if (confirmBtn) confirmBtn.addEventListener('click', hPlaceDrag);
}

let _dragSp = null;
function initDragStaff(note) {
  const staffEl=document.getElementById('drag-staff');
  const isTouchDevice='ontouchstart' in window||navigator.maxTouchPoints>0;
  const validSps = game.ga().map(nid=>nd(nid).s+5);
  const minSp=Math.min(...validSps), maxSp=Math.max(...validSps);
  _dragSp = validSps[Math.floor(validSps.length/2)];
  function renderDrag(ghostSp=null,revealId=null){staffEl.innerHTML=buildStaffDrag(_dragSp,revealId,ghostSp);}
  if (isTouchDevice) {
    document.getElementById('drag-confirm').style.display='block';
    renderDrag();
    let startY=null, startSp=null, _lastDragSp=_dragSp;
    const PX_PER_STEP=LS/2;
    function snapToValid(sp){return validSps.reduce((b,v)=>Math.abs(v-sp)<Math.abs(b-sp)?v:b,validSps[0]);}
    staffEl.addEventListener('touchstart',e=>{if(G.ans)return;e.preventDefault();startY=e.touches[0].clientY;startSp=_dragSp;},{passive:false});
    staffEl.addEventListener('touchmove',e=>{if(G.ans||startY===null)return;e.preventDefault();const dy=startY-e.touches[0].clientY;_dragSp=snapToValid(Math.max(minSp,Math.min(maxSp,startSp+Math.round(dy/PX_PER_STEP))));if(_dragSp!==_lastDragSp){renderDrag();const mn=game.ga().find(nid=>nd(nid).s+5===_dragSp);if(mn){const c=playNote(nd(mn).f,0.4);} _lastDragSp=_dragSp;}},{passive:false});
    staffEl.addEventListener('touchend',e=>{if(G.ans||startY===null)return;e.preventDefault();stampSelection();const mn=game.ga().find(nid=>nd(nid).s+5===_dragSp);if(mn)playNote(nd(mn).f,0.4);startY=null;},{passive:false});
  } else {
    let _hoverSp=null;
    renderDrag(null);
    staffEl.addEventListener('mousemove',e=>{if(G.ans)return;const rect=staffEl.getBoundingClientRect();const scale=SH/rect.height;const svgY=(e.clientY-rect.top)*scale;const rawSp=(BY-svgY)/(LS/2);const snapped=validSps.reduce((b,v)=>Math.abs(v-rawSp)<Math.abs(b-rawSp)?v:b,validSps[0]);if(snapped!==_hoverSp){_hoverSp=snapped;_dragSp=snapped;renderDrag(_hoverSp);}});
    staffEl.addEventListener('mouseleave',()=>{if(G.ans)return;_hoverSp=null;renderDrag(null);});
    staffEl.addEventListener('click',e=>{if(G.ans||_hoverSp===null)return;stampSelection();const corSp=nd(G.cur).s+5;const chosen=_hoverSp===corSp?G.cur:game.ga().find(nid=>nd(nid).s+5===_hoverSp);if(chosen)hPlace(chosen);});
  }
}

function hPlaceDrag() {
  if(G.ans||!lockAnswer())return;
  const cor=G.cur, corSp=nd(cor).s+5, staffEl=document.getElementById('drag-staff'), fb=document.getElementById('fb'), confirmBtn=document.getElementById('drag-confirm');
  if(confirmBtn) confirmBtn.disabled=true;
  if(_dragSp===corSp){staffEl.innerHTML=buildStaffDrag(_dragSp,null);fb.textContent='CERTO!';fb.className='ok';playNote(nd(cor).f,.8);onOk(selectionElapsed());
    jOkChord(nd(cor).f); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
    const {sfp}=game.S(); const rd=reactionDelay();
    if(G.streak>=sfp){ setTimeout(()=>advancePhaseWithRender(G.phase),rd);return; }
    setTimeout(()=>{game.nextQ();render();},rd);
  }
  else{staffEl.innerHTML=buildStaffDrag(_dragSp,cor);fb.textContent='ERROU — era '+nd(cor).lB;fb.className='err';playNote(nd(cor).f,.8);onErr();
    jErrChord(nd(cor).f); updateComboDisplay();
    const c=document.getElementById('acard');if(c){c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),360);}
    setTimeout(()=>renderGameOver(),800);
  }
}
function hPlace(chosen) {
  if(G.ans||!lockAnswer())return;
  const cor=G.cur, staffEl=document.getElementById('drag-staff'), fb=document.getElementById('fb');
  if(chosen===cor){staffEl.innerHTML=buildStaffDrag(nd(cor).s+5,null,null);fb.textContent='CERTO!';fb.className='ok';playNote(nd(cor).f,.8);onOk(selectionElapsed());
    jOkChord(nd(cor).f); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
    const {sfp}=game.S(); const rd=reactionDelay();
    if(G.streak>=sfp){ setTimeout(()=>advancePhaseWithRender(G.phase),rd);return; }
    setTimeout(()=>{game.nextQ();render();},rd);
  }
  else{staffEl.innerHTML=buildStaffDrag(nd(chosen).s+5,cor,null);fb.textContent='ERROU — era '+nd(cor).lB;fb.className='err';playNote(nd(cor).f,.8);onErr();
    jErrChord(nd(cor).f); updateComboDisplay();
    const c=document.getElementById('acard');if(c){c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),360);}
    setTimeout(()=>renderGameOver(),800);
  }
}

// ── PHASE 6 — SCALE DRILL (piano builder) ──
function rScale() {
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
    lightning(1);
    updateComboDisplay();
    const rd = reactionDelay();
    // Phase 6: always advance after 1 correct (no need to repeat)
    setTimeout(() => advancePhaseWithRender(G.phase), rd); return;
  } else {
    fb.textContent = 'ERROU — tente de novo!'; fb.className = 'err';
    playNote(nd(targetSeq[0]).f, .8); onErr();
    jErrChord(nd(targetSeq[0]).f); updateComboDisplay();
    stopComboTimer();
    const c = document.getElementById('acard');
    if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
    setTimeout(() => renderGameOver(), 800);
  }
}

// ── PHASE 5 — LISTEN ──
function rListen() {
  if(!G.cur||G.ans){game.pickNew();game.buildSOpts();}
  stampQuestion();
  const note=G.cur, n=nd(note);
  const card=document.createElement('div'); card.className='panel pop-in'; card.id='acard';
  card.innerHTML=`<div class="ptag">Fase 5 — Ouça e identifique</div>
    <div class="play-row">
      <button class="btn" id="listen-play">♩ Tocar nota</button>
    </div>
    <div class="opts">${G.sopts.map(nid=>`<button class="btn-option" id="ob-${nid}">${nd(nid).lB}</button>`).join('')}</div>
    <div id="fb"></div>`;
  ct.appendChild(card);
  document.getElementById('listen-play').addEventListener('click',()=>playNote(n.f,1.2));
  G.sopts.forEach(nid=>{
    document.getElementById('ob-'+nid).addEventListener('click',()=>{ stampSelection(); hId(nid); });
  });
  setTimeout(()=>playNote(n.f,1.2),300);
}

// ── PHASE 4 — PIANO ──
function rPlay() {
  if(!G.cur||G.ans) game.pickNew();
  stampQuestion();
  const note=G.cur, n=nd(note), active=game.ga();
  // Range covers only the octaves of currently active (unlocked) notes
  const freqs = active.map(id => nd(id).f);
  const minF = Math.min(...freqs), maxF = Math.max(...freqs);
  const rangeIds = AN.filter(k => k.f >= minF * 0.97 && k.f <= maxF * 1.03).map(k => k.id);
  const card=document.createElement('div'); card.className='panel pop-in piano-card'; card.id='acard';
  card.innerHTML=`<div class="ptag">Fase 4 — Toque no teclado</div>
    <div class="play-row">
      <button class="btn" id="play-play">♩ Tocar nota</button>
    </div>
    <div id="pia"></div>
    <div id="fb"></div>
    <button class="btn" id="play-confirm" style="display:none">✓ Confirmar</button>`;
  ct.appendChild(card);
  document.getElementById('play-play').addEventListener('click',()=>playNote(n.f,1.2));
  let pendingKey=null;
  const answerWrap=buildRefPiano(active, rangeIds, (cid,btn)=>{
    stampSelection();
    pendingKey=cid;
    card.querySelectorAll('.wkey').forEach(k=>k.classList.remove('selected-key'));
    btn.classList.add('selected-key');
    document.getElementById('play-confirm').style.display='';
  });
  card.querySelector('#pia').appendChild(answerWrap);
  registerKbWrapper(answerWrap);
  document.getElementById('play-confirm').addEventListener('click',()=>{
    if(pendingKey) hPiano(pendingKey, card.querySelector(`[data-note="${pendingKey}"]`));
  });
  setTimeout(()=>playNote(n.f,1.2),300);
}

// ── GAME OVER ──
let _celebrationTimer = 0;
let _celebrationCanvas = null;
let _celebrationRaf = 0;

function stopCelebration() {
  clearTimeout(_celebrationTimer);
  _celebrationTimer = 0;
  cancelAnimationFrame(_celebrationRaf);
  _celebrationRaf = 0;
  if (_celebrationCanvas) { _celebrationCanvas.remove(); _celebrationCanvas = null; }
}

function startCelebrationLightning() {
  stopCelebration();
  const targetEl = document.querySelector('.score-show');
  if (!targetEl) return;

  // Create ONE persistent canvas
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  document.body.appendChild(cv);
  _celebrationCanvas = cv;
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const COLOR = '#FFFF5E';

  let bolts = [];
  let boltStartTimes = [];

  function genCelebBolt() {
    const rect = targetEl.getBoundingClientRect();
    if (!rect.width) return null;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const spreadW = rect.width * 1.5;
    const spreadH = rect.height * 1.2;
    const ox = cx + (Math.random() - 0.5) * spreadW;
    const oy = cy + (Math.random() - 0.5) * spreadH;
    const tx = cx + (Math.random() - 0.5) * spreadW;
    const ty = cy + (Math.random() - 0.5) * spreadH;
    const t = 0.4 + Math.random() * 0.4;
    const stepBase = 0.03 + t * 0.17;
    const stepCount = Math.round(5 + t * 15);
    const base = Math.min(W, H) * stepBase;
    const pts = [{x: ox, y: oy, rays: []}];
    let bx = ox, by = oy;
    let ang = Math.atan2(ty - oy, tx - ox) + (Math.random() - 0.5) * 0.3;
    for (let i = 0; i < stepCount; i++) {
      const dist = Math.hypot(tx - bx, ty - by);
      if (dist < base * 1.5) { pts.push({x: tx, y: ty, rays: []}); break; }
      const toTarget = Math.atan2(ty - by, tx - bx);
      ang = ang + (toTarget - ang) * 0.5 + (Math.random() - 0.5) * 0.8;
      bx += Math.cos(ang) * base * (0.5 + Math.random() * 0.9);
      by += Math.sin(ang) * base * (0.5 + Math.random() * 0.9);
      pts.push({x: bx, y: by, rays: []});
    }
    return { pts, t };
  }

  const BOLT_MS = 320;
  const SPREAD_MS = 200;

  function spawnBolt() {
    if (!_celebrationCanvas) return;
    const b = genCelebBolt();
    if (b) { bolts.push(b); boltStartTimes.push(performance.now()); }
    _celebrationTimer = setTimeout(spawnBolt, 50 + Math.random() * 30);
  }

  function tick(now) {
    if (!_celebrationCanvas) return;
    ctx.clearRect(0, 0, W, H);
    // Draw and age bolts
    for (let i = bolts.length - 1; i >= 0; i--) {
      const elapsed = now - boltStartTimes[i];
      if (elapsed >= BOLT_MS) { bolts.splice(i, 1); boltStartTimes.splice(i, 1); continue; }
      const reveal = Math.min(1, elapsed / SPREAD_MS);
      let alpha = 1;
      if (elapsed > SPREAD_MS) alpha = Math.max(0, 1 - (elapsed - SPREAD_MS) / (BOLT_MS - SPREAD_MS));
      const { pts, t } = bolts[i];
      const glowW = 0.5 + t * 1.5, coreW = 0.3 + t * 0.5;
      const glowB = 2 + t * 8, coreB = 0.5 + t * 2.5;
      const n = Math.max(2, Math.ceil(pts.length * reveal));
      const vis = pts.slice(0, n);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLOR; ctx.shadowColor = COLOR;
      ctx.lineWidth = glowW; ctx.shadowBlur = glowB;
      ctx.beginPath(); vis.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
      ctx.lineWidth = coreW; ctx.shadowBlur = coreB;
      ctx.beginPath(); vis.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    _celebrationRaf = requestAnimationFrame(tick);
  }

  spawnBolt();
  _celebrationRaf = requestAnimationFrame(tick);
}

function renderGameOver() {
  stopComboTimer();
  stopCelebration();
  const final=G._lastCombo||0;
  ct.innerHTML='';
  // Check leaderboard first — only show the score screen if they qualify
  lb.getLeaderboard().then(rows=>{
    const qualifies=!rows||rows.length<5||(rows[rows.length-1]&&final>rows[rows.length-1].score);
    if(final>0&&qualifies){
      const isTop5 = !rows || rows.length < 5 || final > rows[rows.length - 1].score;
      const card=document.createElement('div'); card.className='panel pop-in'; card.id='acard';
      const lost=document.createElement('div'); lost.className='combo-lost';
      lost.innerHTML=`<div class="big">COMBO PERDIDO!</div>
        <div style="font-size:.8rem;color:rgba(255,255,94,0.45);letter-spacing:.12em;">SEU COMBO</div>
        <div class="score-show">x${final}</div>`;
      card.appendChild(lost);
      const lbWrap=document.createElement('div'); lbWrap.style.cssText='width:100%;margin-top:.5rem;';
      card.appendChild(lbWrap);
      ct.appendChild(card);
      // Start celebration lightning if entering top 5
      if (isTop5) startCelebrationLightning();
      const nw=document.createElement('div'); card.insertBefore(nw,lbWrap);
      nw.appendChild(lb.buildNameEntry(final,
        async(name)=>{nw.innerHTML=`<div class="lb-loading">SALVANDO...</div>`;await lb.submitScore(name,final);nw.innerHTML='';lb.renderLeaderboard(lbWrap,name,final);stopCelebration();},
        ()=>{nw.innerHTML='';lb.renderLeaderboard(lbWrap);stopCelebration();} ));
      const br=document.createElement('div'); br.style.cssText='display:flex;gap:.6rem;margin-top:.5rem;width:100%;';
      const ag=document.createElement('button'); ag.className='btn btn-replay'; ag.textContent='↺ JOGAR DE NOVO';
      ag.addEventListener('click', ()=>{stopCelebration();startGame(false);});
      br.appendChild(ag); card.appendChild(br);
    } else {
      startGame(true); // keep unlocked count, skip phase 1 for known notes
    }
  });
}

// ─═══════════════════════════════════════════════
//  INTERACTION HELPERS
// ══════════════════════════════════════════════
function hId(chosen) {
  if(G.ans||!lockAnswer())return;
  const cor=G.cur;
  document.querySelectorAll('.btn-option').forEach(b=>b.disabled=true);
  document.getElementById('ob-'+cor)?.classList.add('correct');
  const fb=document.getElementById('fb');
  if(chosen===cor){fb.textContent='CERTO!';fb.className='ok';if(G.phase!==5)playNote(nd(cor).f,.8);onOk(selectionElapsed());
      jOkChord(nd(cor).f); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
      const {sfp}=game.S(); const rd=reactionDelay();
      if(G.streak>=sfp){ setTimeout(()=>advancePhaseWithRender(G.phase),rd);return; }
      setTimeout(()=>{game.nextQ();render();},rd);
    }
    else{document.getElementById('ob-'+chosen)?.classList.add('wrong');fb.textContent='ERROU — era '+nd(cor).lB;fb.className='err';playNote(nd(cor).f,.8);onErr();
      jErrChord(nd(cor).f); updateComboDisplay();
      const c=document.getElementById('acard');if(c){c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),360);}
      setTimeout(()=>renderGameOver(),800);
    }
}
function hPiano(chosen,btn) {
  if(G.ans||!lockAnswer())return;
  const cor=G.cur;
  document.querySelectorAll('.wkey:not(.inactive),.bkey').forEach(k=>{k.classList.add('dis');k.style.pointerEvents='none';});
  document.querySelector('.wkey[data-note="'+cor+'"]')?.classList.add('ck');
  const fb=document.getElementById('fb');
  if(chosen===cor){fb.textContent='CERTO!';fb.className='ok';onOk(selectionElapsed());
      jOkChord(nd(cor).f); lightning(lightningIntensity(selectionElapsed())); updateComboDisplay();
      const {sfp}=game.S(); const rd=reactionDelay();
      if(G.streak>=sfp){ setTimeout(()=>advancePhaseWithRender(G.phase),rd);return; }
      setTimeout(()=>{game.nextQ();render();},rd);
    }
    else{btn.classList.add('wk');fb.textContent='ERROU — era '+nd(cor).lB;fb.className='err';playNote(nd(cor).f,.8);onErr();
      jErrChord(nd(cor).f); updateComboDisplay();
      const c=document.getElementById('acard');if(c){c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),360);}
      setTimeout(()=>renderGameOver(),800);
    }
}

// ══════════════════════════════════════════════
//  ONBOARDING FLOW
// ══════════════════════════════════════════════
let _obScaleType = 0;
let _obOctaves = 1;

function startOnboarding() {
  document.getElementById('intro-main').style.display = 'none';
  document.getElementById('game-page').classList.add('show');
  window.scrollTo(0, 0);
  // Defaults: Major scale, 5 octaves (always expand from center)
  _obScaleType = 0;
  _obOctaves = 5;
  applyObScale();
  // Skip scale/octave selection — go straight to note count
  obStepNoteCount();
}

function getObNotes() {
  return buildScale(_obScaleType, _obOctaves);
}

function updateObPiano() {
  const el = document.getElementById('ob-piano');
  if (!el) return;
  el.innerHTML = '';
  resetKbScroll();
  const allNotes = getObNotes();
  const wrap = buildRefPiano(allNotes, allNotes);
  el.appendChild(wrap);
  registerKbWrapper(wrap);
}

function playScalePreview() {
  const notes = getObNotes();
  const sorted = [...notes].sort((a, b) => nd(a).f - nd(b).f);
  const ms = Math.max(40, Math.round(1200 / sorted.length));
  sorted.forEach((nid, i) => {
    setTimeout(() => playNote(nd(nid).f, 0.4), i * ms);
  });
}

function updateObLabels() {
  const lbl = document.getElementById('ob-scale-label');
  if (lbl) lbl.textContent = scaleName(_obScaleType, _obOctaves);
}

function applyObScale() {
  const snr = document.getElementById('snr');
  const soct = document.getElementById('soct');
  const sni = document.getElementById('sni');
  snr.value = _obScaleType + 1;
  soct.value = _obOctaves;
  const scaleLen = getObNotes().length;
  sni.max = scaleLen;
  if (+sni.value > scaleLen) sni.value = scaleLen;
  document.getElementById('sni-v').textContent = sni.value;
  document.getElementById('snr-v').textContent = SCALE_TYPES[_obScaleType].name;
  document.getElementById('soct-v').textContent = _obOctaves;
}

function setPhaseChecked(phId, checked) {
  const cb = document.getElementById(phId);
  if (cb) cb.checked = checked;
  const row = document.getElementById('row-' + phId);
  if (row) {
    if (checked) row.classList.remove('off');
    else row.classList.add('off');
  }
}

function obStep1() {
  ct.innerHTML = '';
  resetKbScroll();
  const card = document.createElement('div');
  card.className = 'panel pop-in piano-card';
  card.innerHTML = `
    <div class="ob-question">Qual escala você quer treinar?</div>
    <div class="ob-note-count" id="ob-scale-label">${scaleName(_obScaleType, _obOctaves)}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-type-prev">← Ant</button>
      <span style="font-size:0.7rem;opacity:0.5">escala</span>
      <button class="btn btn-ghost ob-adj" id="ob-type-next">Próx →</button>
    </div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-oct-prev">− oitava</button>
      <span style="font-size:0.7rem;opacity:0.5">oitavas</span>
      <button class="btn btn-ghost ob-adj" id="ob-oct-next">+ oitava</button>
    </div>
    <div id="ob-piano"></div>
    <button class="btn" id="ob-next1">Próximo</button>
  `;
  ct.appendChild(card);
  updateObPiano();
  playScalePreview();
  document.getElementById('ob-type-prev').addEventListener('click', () => {
    _obScaleType = Math.max(0, _obScaleType - 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-type-next').addEventListener('click', () => {
    _obScaleType = Math.min(SCALE_TYPES.length - 1, _obScaleType + 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-oct-prev').addEventListener('click', () => {
    _obOctaves = Math.max(1, _obOctaves - 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-oct-next').addEventListener('click', () => {
    _obOctaves = Math.min(5, _obOctaves + 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-next1').addEventListener('click', () => { applyObScale(); obStepNoteCount(); });
}

const DIF_LABELS = ['tranquilo (6s)','fácil (5s)','médio (4s)','difícil (3s)','insano (2s)'];

function obStepNoteCount() {
  ct.innerHTML = '';
  const sni = document.getElementById('sni');
  const totalNotes = getObNotes().length;
  let curVal = sni ? Math.min(+sni.value, totalNotes) : 3;
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">🎵</div>
    <div class="ob-question">Quantas notas pra começar?</div>
    <div class="ob-note-count" id="ob-nc-label">${curVal} nota${curVal > 1 ? 's' : ''}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-nc-down">−</button>
      <button class="btn btn-ghost ob-adj" id="ob-nc-up">+</button>
    </div>
    <button class="btn" id="ob-nc-next">Próximo</button>
  `;
  ct.appendChild(card);
  function updateNcLabel() {
    document.getElementById('ob-nc-label').textContent = curVal + ' nota' + (curVal > 1 ? 's' : '');
  }
  document.getElementById('ob-nc-down').addEventListener('click', () => {
    curVal = Math.max(2, curVal - 1); updateNcLabel();
  });
  document.getElementById('ob-nc-up').addEventListener('click', () => {
    curVal = Math.min(totalNotes, curVal + 1); updateNcLabel();
  });
  document.getElementById('ob-nc-next').addEventListener('click', () => {
    if (sni) {
      sni.value = curVal;
      document.getElementById('sni-v').textContent = curVal;
    }
    obStepDifficulty();
  });
}

function obStepDifficulty() {
  ct.innerHTML = '';
  const sdif = document.getElementById('sdif');
  let curVal = sdif ? +sdif.value : 1;
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">⏱️</div>
    <div class="ob-question">Qual dificuldade?</div>
    <div class="ob-note-count" id="ob-dif-label">${DIF_LABELS[curVal - 1]}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-dif-down">−</button>
      <button class="btn btn-ghost ob-adj" id="ob-dif-up">+</button>
    </div>
    <button class="btn" id="ob-dif-next">Próximo</button>
  `;
  ct.appendChild(card);
  function updateDifLabel() {
    document.getElementById('ob-dif-label').textContent = DIF_LABELS[curVal - 1];
  }
  document.getElementById('ob-dif-down').addEventListener('click', () => {
    curVal = Math.max(1, curVal - 1); updateDifLabel();
  });
  document.getElementById('ob-dif-up').addEventListener('click', () => {
    curVal = Math.min(5, curVal + 1); updateDifLabel();
  });
  document.getElementById('ob-dif-next').addEventListener('click', () => {
    if (sdif) { sdif.value = curVal; document.getElementById('sdif-v').textContent = DIF_LABELS[curVal - 1]; }
    obStep2();
  });
}

function obStep2() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">👋</div>
    <div class="ob-question">Você quer ser apresentado as notas?</div>
    <button class="btn" id="ob-intro-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-intro-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-intro-yes').addEventListener('click', () => { setPhaseChecked('ph1', true); obStep3(); });
  document.getElementById('ob-intro-no').addEventListener('click', () => { setPhaseChecked('ph1', false); obStep3(); });
}

function obStep3() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">🎼</div>
    <div class="ob-question">Você quer treinar a pauta?</div>
    <button class="btn" id="ob-staff-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-staff-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-staff-yes').addEventListener('click', () => {
    setPhaseChecked('ph2', true);
    setPhaseChecked('ph3', true);
    obStep4();
  });
  document.getElementById('ob-staff-no').addEventListener('click', () => {
    setPhaseChecked('ph2', false);
    setPhaseChecked('ph3', false);
    obStep4();
  });
}

function obStep4() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">👂🎹</div>
    <div class="ob-question">Você também quer treinar de ouvido?</div>
    <button class="btn" id="ob-ears-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-ears-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-ears-yes').addEventListener('click', () => {
    setPhaseChecked('ph4', true);
    obStep5();
  });
  document.getElementById('ob-ears-no').addEventListener('click', () => {
    setPhaseChecked('ph4', false);
    setPhaseChecked('ph5', false);
    obStepScale();
  });
}

function obStepScale() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.style.background = 'var(--bg2)';
  card.innerHTML = `
    <div class="ob-icon">🚧</div>
    <div class="ob-question">Você quer treinar a sequência da escala?</div>
    <div style="font-size:0.75rem;font-weight:700;color:var(--plus2);opacity:0.7;">EM CONSTRUÇÃO</div>
    <button class="btn" id="ob-scale-no">Não</button>
    <button class="btn btn-ghost" id="ob-scale-yes">Sim</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-scale-yes').addEventListener('click', () => {
    setPhaseChecked('ph6', true);
    startGame(false);
  });
  document.getElementById('ob-scale-no').addEventListener('click', () => {
    setPhaseChecked('ph6', false);
    startGame(false);
  });
}

function obStep5() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">&#x1F648;&#x1F442;</div>
    <div class="ob-question">Você também quer treinar o ouvido sem referência (mt difícil)?</div>
    <button class="btn" id="ob-ref-no">Não</button>
    <button class="btn btn-ghost" id="ob-ref-yes">Sim</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-ref-yes').addEventListener('click', () => { setPhaseChecked('ph5', true); obStepScale(); });
  document.getElementById('ob-ref-no').addEventListener('click', () => { setPhaseChecked('ph5', false); obStepScale(); });
}

// ══════════════════════════════════════════════
//  START & INITIALIZATION
// ══════════════════════════════════════════════
// keepUnlocked=true: auto-restart after loss (preserve note count + sessionIntroduced)
// keepUnlocked=false: fresh start from menu (reset note count, clear sessionIntroduced)
function startGame(keepUnlocked = false) {
  const prevUnlocked = keepUnlocked ? (G.unlocked || 0) : 0;
  if (!keepUnlocked) { sessionIntroduced.clear(); _kbSavedScroll = null; }
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
