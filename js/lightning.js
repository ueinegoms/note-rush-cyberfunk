import { G } from './state.js';

// ══════════════════════════════════════════════
//  LIGHTNING — canvas bolt effect
//  Fires from last pointer position toward the combo display.
// ══════════════════════════════════════════════

let _lastClickX = 0, _lastClickY = 0;
document.addEventListener('pointerdown', e => { _lastClickX = e.clientX; _lastClickY = e.clientY; }, true);

// Maps reaction time (ms) to bolt intensity 0..1
export function lightningIntensity(ms) {
  const MIN_T = 1000, MAX_T = 5000;
  if (ms <= MIN_T) return 1;
  if (ms >= MAX_T) return 0;
  return 1 - (ms - MIN_T) / (MAX_T - MIN_T);
}

// t=0..1 — controls visual intensity (width, glow, segment count, bolt count)
// Bolt count driven by G._lastBonus (set by onOk in game.js)
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

  // Origin = last click (exact), target = combo display with slight displacement
  const comboEl = document.getElementById('combo-disp');
  const comboRect = comboEl ? comboEl.getBoundingClientRect() : null;
  const ox = _lastClickX || W / 2;
  const oy = _lastClickY || H / 2;
  const comboW = comboRect ? comboRect.width : 40;
  const comboH = comboRect ? comboRect.height : 30;

  function genBolt() {
    const sx = ox, sy = oy;
    const etx = (comboRect ? comboRect.left + comboRect.width / 2 : W / 2) + (Math.random() - 0.5) * comboW * 0.6;
    const ety = (comboRect ? comboRect.top + comboRect.height / 2 : 30) + (Math.random() - 0.5) * comboH * 0.5;
    const pts = [{ x: sx, y: sy, rays: [] }];
    let cx = sx, cy = sy;
    let ang = Math.atan2(ety - sy, etx - sx) + (Math.random() - 0.5) * 0.3;
    const base = Math.min(W, H) * stepBase;
    for (let i = 0; i < stepCount; i++) {
      const distToTarget = Math.hypot(etx - cx, ety - cy);
      if (distToTarget < base * 1.5) { pts.push({ x: etx, y: ety, rays: [] }); break; }
      const toTarget = Math.atan2(ety - cy, etx - cx);
      ang = ang + (toTarget - ang) * 0.5 + (Math.random() - 0.5) * 0.8;
      let nx = cx + Math.cos(ang) * base * (0.5 + Math.random() * 0.9);
      let ny = cy + Math.sin(ang) * base * (0.5 + Math.random() * 0.9);
      // Wall-slide
      if (nx < 0)  { nx = 0; ang = Math.sin(ang) >= 0 ?  Math.PI/2 : -Math.PI/2; ang += (Math.random()-0.5)*0.12; }
      if (nx > W)  { nx = W; ang = Math.sin(ang) >= 0 ?  Math.PI/2 : -Math.PI/2; ang += (Math.random()-0.5)*0.12; }
      if (ny < 0)  { ny = 0; ang = Math.cos(ang) >= 0 ?  0         :  Math.PI;   ang += (Math.random()-0.5)*0.12; }
      if (ny > H)  { ny = H; ang = Math.cos(ang) >= 0 ?  0         :  Math.PI;   ang += (Math.random()-0.5)*0.12; }
      pts.push({ x: nx, y: ny, rays: [] });
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
    vis.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.lineWidth = coreWidth; ctx.shadowBlur = coreBlur * pulseBlur;
    ctx.beginPath();
    vis.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    vis.forEach(p => {
      p.rays.forEach(ray => {
        ctx.lineWidth = coreWidth; ctx.shadowBlur = rayBlur * pulseBlur;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ray.a) * ray.len, p.y + Math.sin(ray.a) * ray.len);
        ctx.stroke();
      });
    });
  }

  const numBolts = Math.max(1, G._lastBonus || 1);
  const TOTAL_MS = 320;
  const SPREAD_MS = 200;
  const FADE_MS = TOTAL_MS - SPREAD_MS;
  const PULSE_MS = 140;
  const bolts = Array.from({ length: numBolts }, () => genBolt());

  let t0 = -1;
  function tick(now) {
    if (t0 < 0) t0 = now;
    const elapsed = now - t0;
    if (elapsed >= TOTAL_MS) { cv.remove(); return; }
    const reveal = Math.min(1, elapsed / SPREAD_MS);
    let alpha = 1;
    if (elapsed > SPREAD_MS) alpha = Math.max(0, 1 - (elapsed - SPREAD_MS) / FADE_MS);
    const pulsePhase = (elapsed % PULSE_MS) / PULSE_MS;
    const pulseBlur = 0.4 + 0.6 * (pulsePhase < 0.5 ? pulsePhase * 2 : 2 - pulsePhase * 2);
    ctx.clearRect(0, 0, W, H);
    bolts.forEach(pts => drawBolt(pts, alpha, reveal, pulseBlur));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
