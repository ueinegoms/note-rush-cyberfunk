import { G } from '../state.js';
import * as lb from '../leaderboard.js';
import { hapticBuzz, hapticError } from '../haptics.js';
import { stopComboTimer, startGame, getEpoch } from '../main.js';

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
  const scoreEl = document.querySelector('.score-show');
  const cardEl  = document.getElementById('acard');
  if (!scoreEl || !cardEl) return;

  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  document.body.appendChild(cv);
  _celebrationCanvas = cv;
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const COLOR = '#FFFF5E';
  const NUM_SNAKES = 5;
  const BOLT_MS = 420;
  const SPREAD_MS = 220;
  const LINGER_MS = 500;

  // Bolt steps are sized relative to the card, not the full screen,
  // so bolts traverse the card area with realistic segment lengths.
  function genBolt(ox, oy, tx, ty) {
    const cr = cardEl.getBoundingClientRect();
    const cL = cr.left, cR = cr.right, cT = cr.top, cB = cr.bottom;
    const cardDim = Math.min(cR - cL, cB - cT);
    const t = 0.5 + Math.random() * 0.5;
    const stepBase = 0.06 + t * 0.12;   // fraction of card's smaller dimension
    const stepCount = Math.round(10 + t * 16);
    const base = cardDim * stepBase;
    const pts = [{x: ox, y: oy, rays: []}];
    let bx = ox, by = oy;
    let ang = Math.atan2(ty - oy, tx - ox) + (Math.random() - 0.5) * 0.4;
    for (let i = 0; i < stepCount; i++) {
      const dist = Math.hypot(tx - bx, ty - by);
      if (dist < base * 1.5) { pts.push({x: tx, y: ty, rays: []}); break; }
      const toTarget = Math.atan2(ty - by, tx - bx);
      ang = ang + (toTarget - ang) * 0.45 + (Math.random() - 0.5) * 0.9;
      let nx = bx + Math.cos(ang) * base * (0.5 + Math.random() * 0.9);
      let ny = by + Math.sin(ang) * base * (0.5 + Math.random() * 0.9);
      // Wall-slide: project current direction onto the wall's axis (no explosion rays)
      if (nx < cL) { nx = cL; ang = Math.sin(ang) >= 0 ?  Math.PI/2 : -Math.PI/2; ang += (Math.random()-0.5)*0.12; }
      if (nx > cR) { nx = cR; ang = Math.sin(ang) >= 0 ?  Math.PI/2 : -Math.PI/2; ang += (Math.random()-0.5)*0.12; }
      if (ny < cT) { ny = cT; ang = Math.cos(ang) >= 0 ?  0         :  Math.PI;   ang += (Math.random()-0.5)*0.12; }
      if (ny > cB) { ny = cB; ang = Math.cos(ang) >= 0 ?  0         :  Math.PI;   ang += (Math.random()-0.5)*0.12; }
      pts.push({x: nx, y: ny, rays: []});
      bx = nx; by = ny;
    }
    return { pts, t, startTime: performance.now() };
  }

  // Origin: within 80% of the score element's bounding box (centred),
  // so bolts feel like they radiate from the combo number itself.
  function randomOriginPoint() {
    const rect = scoreEl.getBoundingClientRect();
    if (!rect.width) return { x: W / 2, y: H / 2 };
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    return {
      x: cx + (Math.random() - 0.5) * rect.width  * 0.8,
      y: cy + (Math.random() - 0.5) * rect.height * 0.8
    };
  }

  // Target: random point on any of the four card edges
  function randomBorderPoint() {
    const rect = cardEl.getBoundingClientRect();
    if (!rect.width) return { x: W / 2, y: 0 };
    switch (Math.floor(Math.random() * 4)) {
      case 0: return { x: rect.left  + Math.random() * rect.width,  y: rect.top    };
      case 1: return { x: rect.right,                                y: rect.top  + Math.random() * rect.height };
      case 2: return { x: rect.left  + Math.random() * rect.width,  y: rect.bottom };
      default:return { x: rect.left,                                 y: rect.top  + Math.random() * rect.height };
    }
  }

  function drawBoltAt(pts, t, alpha) {
    if (pts.length < 2) return;
    const glowW = 0.5 + t * 1.5, coreW = 0.3 + t * 0.5;
    const glowB = 4 + t * 10,    coreB = 0.5 + t * 3;

    // Circular glow at spawn origin so the bolt looks like it erupts from the combo
    const ox = pts[0].x, oy = pts[0].y;
    const glowR = 8 + t * 18;
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, glowR);
    grad.addColorStop(0,    'rgba(255,255,100,0.92)');
    grad.addColorStop(0.42, 'rgba(255,220,30,0.45)');
    grad.addColorStop(1,    'rgba(255,160,0,0)');
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 0;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLOR; ctx.shadowColor = COLOR;
    ctx.lineWidth = glowW; ctx.shadowBlur = glowB;
    ctx.beginPath(); pts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
    ctx.lineWidth = coreW; ctx.shadowBlur = coreB;
    ctx.beginPath(); pts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
    // Spark rays at wall-bounce points
    pts.forEach(p => {
      (p.rays || []).forEach(ray => {
        ctx.lineWidth = coreW; ctx.shadowBlur = coreB * 1.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ray.a) * ray.len, p.y + Math.sin(ray.a) * ray.len);
        ctx.stroke();
      });
    });
  }

  const snakes = Array.from({length: NUM_SNAKES}, (_, i) => {
    const offset = (BOLT_MS / NUM_SNAKES) * i;
    const from = randomOriginPoint();
    const to   = randomBorderPoint();
    const bolt = genBolt(from.x, from.y, to.x, to.y);
    bolt.startTime = performance.now() + offset;
    return { bolt, ghost: null };
  });

  function tick(now) {
    if (!_celebrationCanvas) return;
    ctx.clearRect(0, 0, W, H);

    for (const snake of snakes) {
      const { bolt, ghost } = snake;
      const elapsed = now - bolt.startTime;

      if (ghost) {
        const ge = now - ghost.endTime;
        if (ge < LINGER_MS) drawBoltAt(ghost.pts, ghost.t, 0.35 * Math.max(0, 1 - ge / LINGER_MS));
      }

      if (elapsed < 0) continue;

      if (elapsed >= BOLT_MS) {
        snake.ghost = { pts: bolt.pts, t: bolt.t, endTime: now };
        const from = randomOriginPoint();
        const to   = randomBorderPoint();
        snake.bolt  = genBolt(from.x, from.y, to.x, to.y);
        continue;
      }

      const reveal = Math.min(1, elapsed / SPREAD_MS);
      let alpha = 1;
      if (elapsed > SPREAD_MS) alpha = Math.max(0, 1 - (elapsed - SPREAD_MS) / (BOLT_MS - SPREAD_MS));
      const n = Math.max(2, Math.ceil(bolt.pts.length * reveal));
      drawBoltAt(bolt.pts.slice(0, n), bolt.t, alpha);
    }

    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    _celebrationRaf = requestAnimationFrame(tick);
  }

  _celebrationRaf = requestAnimationFrame(tick);
}

export function renderGameOver() {
  stopComboTimer();
  stopCelebration();
  const final = G._lastCombo || 0;
  const myEpoch = getEpoch();
  const ct = document.getElementById('ct');
  ct.innerHTML = '';
  // Check leaderboard first — only show the score screen if they qualify
  lb.getLeaderboard().then(rows => {
    if (getEpoch() !== myEpoch) return;
    const qualifies = !rows || rows.length < 5 || (rows[rows.length - 1] && final > rows[rows.length - 1].score);
    if (final > 0 && qualifies) {
      const isTop5 = !rows || rows.length < 5 || final > rows[rows.length - 1].score;
      const card = document.createElement('div'); card.className = 'panel pop-in'; card.id = 'acard';
      const lost = document.createElement('div'); lost.className = 'combo-lost';
      lost.innerHTML = `<div class="score-show">x${final}</div>`;
      card.appendChild(lost);
      const lbWrap = document.createElement('div'); lbWrap.style.cssText = 'width:100%;margin-top:.5rem;';
      card.appendChild(lbWrap);
      ct.appendChild(card);
      // Start celebration lightning if entering top 5
      if (isTop5) { startCelebrationLightning(); hapticBuzz(); }

      const nw = document.createElement('div'); card.insertBefore(nw, lbWrap);
      nw.appendChild(lb.buildNameEntry(final,
        async (name) => { nw.innerHTML = `<div class="lb-loading">SALVANDO...</div>`; await lb.submitScore(name, final); nw.innerHTML = ''; lb.renderLeaderboard(lbWrap, name, final); stopCelebration(); },
        () => { nw.innerHTML = ''; lb.renderLeaderboard(lbWrap); stopCelebration(); }));

      const br = document.createElement('div'); br.style.cssText = 'display:flex;gap:.6rem;margin-top:.5rem;width:100%;';
      const ag = document.createElement('button'); ag.className = 'btn btn-replay'; ag.textContent = '↺ JOGAR DE NOVO';
      ag.addEventListener('click', () => { stopCelebration(); startGame(false); });
      br.appendChild(ag); card.appendChild(br);
    } else {
      hapticError();
      startGame(true); // keep unlocked count, skip phase 1 for known notes
    }
  });
}
