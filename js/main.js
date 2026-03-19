import {LS,BY,SW,SH,NX,AN,NS,nd} from './constants.js';
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

  const glowWidth  = mix(1, 4);
  const coreWidth  = mix(0.5, 1.5);
  const glowBlur   = mix(4, 22);
  const coreBlur   = mix(1, 5);
  const rayBlur    = mix(2, 14);
  const stepBase   = mix(0.03, 0.33);
  const stepCount  = Math.round(mix(3, 15));
  const rayMin     = Math.round(mix(1, 5));
  const rayExtra   = Math.round(mix(0, 5));
  const rayLenMin  = mix(4, 18);
  const rayLenRand = mix(6, 38);

  // All bolts spread outward from one random origin
  const ox = Math.random() * W, oy = Math.random() * H;
  const maxSpread = mix(0.08, 1.5);

  function genBolt(spreadFrac) {
    const r = spreadFrac * Math.max(W, H) * maxSpread;
    const a0 = Math.random() * Math.PI * 2;
    const sx = ox + Math.cos(a0) * r * Math.random();
    const sy = oy + Math.sin(a0) * r * Math.random();
    const pts = [{x:sx, y:sy, rays:[]}];
    let cx = sx, cy = sy, ang = a0 + (Math.random() - 0.5) * 2;
    const base = Math.min(W, H) * stepBase;
    for (let i = 0; i < stepCount; i++) {
      ang += (Math.random() - 0.5) * 1.5;
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

  const numBolts = Math.max(1, Math.round(mix(1, 15)));
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
//  RENDER / UI
// ══════════════════════════════════════════════
const ct = document.getElementById('ct');
let _questionStart = 0;
let _selectionTime = 0;
function stampQuestion() { _questionStart = Date.now(); _selectionTime = 0; }
function stampSelection() { _selectionTime = Date.now(); }
function selectionElapsed() { return (_selectionTime || Date.now()) - _questionStart; }
function reactionDelay() { return Math.min(Date.now() - _questionStart, 800); }

function updateComboDisplay() {
  const el = document.getElementById('combo-disp'); if(!el) return;
  el.textContent = 'x'+G.combo;
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
  updateComboDisplay();
  if (G.phase === 0) { showIntroPage(); return; }

  showGamePage();

  if      (G.phase===1) rLearn();
  else if (G.phase===2) rIdentify();
  else if (G.phase===3) rPlace();
  else if (G.phase===4) rPlay();
  else if (G.phase===5) rListen();
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
    staffEl.addEventListener('click',e=>{if(G.ans||_hoverSp===null)return;stampSelection();const chosen=game.ga().find(nid=>nd(nid).s+5===_hoverSp);if(chosen)hPlace(chosen);});
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
  const answerWrap=buildRefPiano(active, game.gn(), (cid,btn)=>{
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
function renderGameOver() {
  const final=G._lastCombo||0;
  ct.innerHTML='';
  // Check leaderboard first — only show the score screen if they qualify
  lb.getLeaderboard().then(rows=>{
    const qualifies=!rows||rows.length<5||(rows[rows.length-1]&&final>rows[rows.length-1].score);
    if(final>0&&qualifies){
      const card=document.createElement('div'); card.className='panel pop-in'; card.id='acard';
      const lost=document.createElement('div'); lost.className='combo-lost';
      lost.innerHTML=`<div class="big">COMBO PERDIDO!</div>
        <div style="font-size:.8rem;color:rgba(255,255,94,0.45);letter-spacing:.12em;">SEU COMBO</div>
        <div class="score-show">x${final}</div>`;
      card.appendChild(lost);
      const lbWrap=document.createElement('div'); lbWrap.style.cssText='width:100%;margin-top:.5rem;';
      card.appendChild(lbWrap);
      ct.appendChild(card);
      const nw=document.createElement('div'); card.insertBefore(nw,lbWrap);
      nw.appendChild(lb.buildNameEntry(final,
        async(name)=>{nw.innerHTML=`<div class="lb-loading">SALVANDO...</div>`;await lb.submitScore(name,final);nw.innerHTML='';lb.renderLeaderboard(lbWrap,name,final);},
        ()=>{nw.innerHTML='';lb.renderLeaderboard(lbWrap);} ));
      const br=document.createElement('div'); br.style.cssText='display:flex;gap:.6rem;margin-top:.5rem;width:100%;';
      const ag=document.createElement('button'); ag.className='btn btn-replay'; ag.textContent='↺ JOGAR DE NOVO';
      ag.addEventListener('click', ()=>startGame(false));
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
let _obNotes = 3;

function startOnboarding() {
  document.getElementById('intro-main').style.display = 'none';
  document.getElementById('game-page').classList.add('show');
  window.scrollTo(0, 0);
  _obNotes = +document.getElementById('sni').value;
  obStep1();
}

function getObRange() {
  if (_obNotes <= 10) return 'basic';
  if (_obNotes <= 13) return 'extended';
  return 'full';
}

function updateObPiano() {
  const el = document.getElementById('ob-piano');
  if (!el) return;
  el.innerHTML = '';
  resetKbScroll();
  const allNotes = NS[getObRange()];
  const active = allNotes.slice(0, Math.min(_obNotes, allNotes.length));
  const wrap = buildRefPiano(active, allNotes);
  el.appendChild(wrap);
  registerKbWrapper(wrap);
}

function adjustObNotes(delta) {
  _obNotes = Math.max(1, Math.min(19, _obNotes + delta));
  const el = document.getElementById('ob-count');
  if (el) el.textContent = _obNotes + (_obNotes === 1 ? ' nota' : ' notas');
  updateObPiano();
}

function applyObNotes() {
  const snr = document.getElementById('snr');
  const sni = document.getElementById('sni');
  if (_obNotes <= 10) { snr.value = 1; sni.max = 10; }
  else if (_obNotes <= 13) { snr.value = 2; sni.max = 13; }
  else { snr.value = 3; sni.max = 19; }
  sni.value = _obNotes;
  document.getElementById('sni-v').textContent = _obNotes;
  const NR_LABELS = ['básica','estendida','completa'];
  document.getElementById('snr-v').textContent = NR_LABELS[+snr.value - 1];
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
    <div class="ob-question">O quê você quer treinar hoje?</div>
    <div class="ob-note-count" id="ob-count">${_obNotes} nota${_obNotes === 1 ? '' : 's'}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-m8">&minus;8</button>
      <button class="btn btn-ghost ob-adj" id="ob-m1">&minus;1</button>
      <button class="btn btn-ghost ob-adj" id="ob-p1">+1</button>
      <button class="btn btn-ghost ob-adj" id="ob-p8">+8</button>
    </div>
    <div id="ob-piano"></div>
    <button class="btn" id="ob-next1">Próximo</button>
  `;
  ct.appendChild(card);
  updateObPiano();
  document.getElementById('ob-m8').addEventListener('click', () => adjustObNotes(-8));
  document.getElementById('ob-m1').addEventListener('click', () => adjustObNotes(-1));
  document.getElementById('ob-p1').addEventListener('click', () => adjustObNotes(1));
  document.getElementById('ob-p8').addEventListener('click', () => adjustObNotes(8));
  document.getElementById('ob-next1').addEventListener('click', () => { applyObNotes(); obStep2(); });
}

function obStep2() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
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
    setPhaseChecked('ph4', true);
    obStep5();
  });
}

function obStep4() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-question">Você também quer treinar ouvidos?</div>
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
    startGame(false);
  });
}

function obStep5() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-question">Você também quer treinar de ouvido (sem referência)?</div>
    <button class="btn" id="ob-ref-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-ref-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-ref-yes').addEventListener('click', () => { setPhaseChecked('ph5', true); startGame(false); });
  document.getElementById('ob-ref-no').addEventListener('click', () => { setPhaseChecked('ph5', false); startGame(false); });
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
  sni.addEventListener('input', ()=>{sniV.textContent = sni.value;});

  const NR_LABELS = ['básica','estendida','completa'];
  const snr = document.getElementById('snr');
  const snrV = document.getElementById('snr-v');
  snr.addEventListener('input', ()=>{ snrV.textContent = NR_LABELS[+snr.value - 1]; });

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
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  lb.renderLeaderboard(document.getElementById('lb-intro'));
});
