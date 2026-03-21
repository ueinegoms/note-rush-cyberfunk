import {LS, BY, NX, SW, SH} from './constants.js';
import {nd} from './constants.js';

// convert staff position to Y coordinate
export function NY(sp) { return BY - sp * (LS / 2); }

export function buildStaff({showNote = null, interactive = false, revealNote = null, rangeMinSp = 0, rangeMaxSp = 8} = {}) {
  const PL = 98, PR = 27;
  // ViewBox fixed to the full note range — prevents layout shifts
  let vbTop = 0, vbBottom = SH;
  [rangeMinSp, rangeMaxSp].forEach(sp => {
    const ny = NY(sp);
    vbTop = Math.min(vbTop, ny - 90);
    vbBottom = Math.max(vbBottom, ny + 90);
  });
  // Also ensure the shown note is visible
  [showNote, revealNote].filter(Boolean).forEach(id => {
    const sp = nd(id).s + 5;
    const ny = NY(sp);
    vbTop = Math.min(vbTop, ny - 90);
    vbBottom = Math.max(vbBottom, ny + 90);
  });
  let s = `<svg class="ssvg" viewBox="0 ${vbTop} ${SW} ${vbBottom - vbTop}" xmlns="http://www.w3.org/2000/svg">`;
  const gc = 'rgba(255,255,255,0.22)', gx1 = PL, gx2 = SW - PR;
  // Bottom guide lines — only draw down to lowest note in range
  if (rangeMinSp < 0) {
    const bottomLimit = rangeMinSp % 2 === 0 ? rangeMinSp : rangeMinSp - 1;
    for (let sp = -2; sp >= bottomLimit; sp -= 2)
      s += `<line x1="${gx1}" y1="${NY(sp)}" x2="${gx2}" y2="${NY(sp)}" stroke="${gc}" stroke-width="1.8" stroke-dasharray="9 6"/>`;
  }
  // Top guide lines — only draw up to highest note in range
  if (rangeMaxSp > 8) {
    const topLimit = rangeMaxSp % 2 === 0 ? rangeMaxSp : rangeMaxSp + 1;
    for (let sp = 10; sp <= topLimit; sp += 2)
      s += `<line x1="${gx1}" y1="${NY(sp)}" x2="${gx2}" y2="${NY(sp)}" stroke="${gc}" stroke-width="1.8" stroke-dasharray="9 6"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const y = NY(i * 2);
    s += `<line x1="${PL}" y1="${y}" x2="${SW-PR}" y2="${y}" stroke="#FFFFFF" stroke-width="2.7"/>`;
  }
  const cfs = LS * 5.4, cy2 = BY - LS * 0.08;
  s += `<text x="14" y="${cy2}" font-size="${cfs}" fill="#FFFF5E" font-family="Georgia,serif" opacity=".7">&#x1D11E;</text>`;

  function ledgers(sp, cx, col = '#FFFFFF') {
    let ll = '';
    const lx1 = cx - 29, lx2 = cx + 29;
    if (sp < 0)
      for (let p = -2; p >= (sp % 2 === 0 ? sp : sp - 1); p -= 2)
        ll += `<line x1="${lx1}" y1="${NY(p)}" x2="${lx2}" y2="${NY(p)}" stroke="${col}" stroke-width="2.2"/>`;
    if (sp > 8)
      for (let p = 10; p <= (sp % 2 === 0 ? sp : sp + 1); p += 2)
        ll += `<line x1="${lx1}" y1="${NY(p)}" x2="${lx2}" y2="${NY(p)}" stroke="${col}" stroke-width="2.2"/>`;
    return ll;
  }
  function drawNote(id, col = '#FFFF5E') {
    const n = nd(id);
    const sp = n.s + 5;
    const cy = NY(sp), cx = NX;
    let r = ledgers(sp, cx, col);
    if (n.acc) r += `<text x="${cx - 35}" y="${cy + 9}" font-size="30" fill="${col}" font-family="serif">${n.acc}</text>`;
    r += `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="13" fill="${col}" transform="rotate(-12,${cx},${cy})"/>`;
    const sd = sp < 4 ? -1 : 1, sx = sd === 1 ? cx - 17 : cx + 17;
    r += `<line x1="${sx}" y1="${cy}" x2="${sx}" y2="${cy+sd*69}" stroke="${col}" stroke-width="3"/>`;
    return r;
  }
  if (showNote)    s += drawNote(showNote, '#FFFF5E');
  if (revealNote)  s += drawNote(revealNote, '#00FF88');
  if (interactive) {
    // build tappable zones for notes
    // ga/gn should be provided by the caller since they rely on game state
  }
  s += `</svg>`;
  return s;
}

// The drag-related functions were previously intermingled with rPlace; they
// require access to ga() and other game helpers. to keep dependencies low we
// export helper constructors and let the caller wire them up.

export function buildStaffDrag(dragSp, revealId = null, ghostSp = null, rangeMinSp = 0, rangeMaxSp = 8) {
  const PL = 98, PR = 27;
  // ViewBox fixed to the full note range — prevents layout shifts while dragging
  let vbTop = 0, vbBottom = SH;
  [rangeMinSp, rangeMaxSp].forEach(sp => {
    const ny = NY(sp);
    vbTop = Math.min(vbTop, ny - 90);
    vbBottom = Math.max(vbBottom, ny + 90);
  });
  if (revealId) {
    const sp = nd(revealId).s + 5;
    const ny = NY(sp);
    vbTop = Math.min(vbTop, ny - 90);
    vbBottom = Math.max(vbBottom, ny + 90);
  }
  let s = `<svg class="ssvg" viewBox="0 ${vbTop} ${SW} ${vbBottom - vbTop}" xmlns="http://www.w3.org/2000/svg" style="cursor:${revealId===null?'crosshair':'default'}">`;
  const gc = 'rgba(255,255,255,0.22)', gx1 = PL, gx2 = SW - PR;
  // Bottom guide lines — only draw down to the lowest note in range
  if (rangeMinSp < 0) {
    const bottomLimit = rangeMinSp % 2 === 0 ? rangeMinSp : rangeMinSp - 1;
    for (let sp = -2; sp >= bottomLimit; sp -= 2)
      s += `<line x1="${gx1}" y1="${NY(sp)}" x2="${gx2}" y2="${NY(sp)}" stroke="${gc}" stroke-width="1.8" stroke-dasharray="9 6"/>`;
  }
  // Top guide lines — only draw up to the highest note in range
  if (rangeMaxSp > 8) {
    const topLimit = rangeMaxSp % 2 === 0 ? rangeMaxSp : rangeMaxSp + 1;
    for (let sp = 10; sp <= topLimit; sp += 2)
      s += `<line x1="${gx1}" y1="${NY(sp)}" x2="${gx2}" y2="${NY(sp)}" stroke="${gc}" stroke-width="1.8" stroke-dasharray="9 6"/>`;
  }
  for (let i = 0; i < 5; i++) { const y = NY(i*2); s += `<line x1="${PL}" y1="${y}" x2="${SW-PR}" y2="${y}" stroke="#FFFFFF" stroke-width="2.7"/>`; }
  const cfs = LS * 5.4, cy2 = BY - LS * 0.08;
  s += `<text x="14" y="${cy2}" font-size="${cfs}" fill="#FFFF5E" font-family="Georgia,serif" opacity=".7">&#x1D11E;</text>`;

  function ledgers(sp, cx, col) {
    let ll = '';
    const lx1 = cx - 29, lx2 = cx + 29;
    if (sp < 0) for (let p = -2; p >= (sp%2===0?sp:sp-1); p -= 2) ll += `<line x1="${lx1}" y1="${NY(p)}" x2="${lx2}" y2="${NY(p)}" stroke="${col}" stroke-width="2.2"/>`;
    if (sp > 8)  for (let p = 10; p <= (sp%2===0?sp:sp+1); p += 2) ll += `<line x1="${lx1}" y1="${NY(p)}" x2="${lx2}" y2="${NY(p)}" stroke="${col}" stroke-width="2.2"/>`;
    return ll;
  }
  function drawNoteAt(sp, col, cx = NX, opacity = 1) {
    const cy = NY(sp);
    let r = ledgers(sp, cx, col);
    r += `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="13" fill="${col}" transform="rotate(-12,${cx},${cy})" opacity="${opacity}"/>`;
    const sdir = sp < 4 ? -1 : 1;
    const sx = sdir === 1 ? cx - 17 : cx + 17;
    r += `<line x1="${sx}" y1="${cy}" x2="${sx}" y2="${cy+sdir*69}" stroke="${col}" stroke-width="3" opacity="${opacity}"/>`;
    return r;
  }

  if (ghostSp !== null && !revealId) s += drawNoteAt(ghostSp,'#FFFF5E',NX,0.35);
  if (dragSp !== null && ghostSp === null && !revealId) s += drawNoteAt(dragSp,'#FFFF5E',NX,0.92);
  if (revealId) { const rn = nd(revealId); s += drawNoteAt(rn.s+5,'#00FF88',NX,1); }
  s += `</svg>`;
  return s;
}
