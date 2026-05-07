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

/**
 * Build a staff SVG that shows a single note with a duration symbol.
 * durationType: 'whole' | 'half' | 'quarter' | 'eighth'
 */
export function buildStaffRhythm(sp, durationType = 'quarter') {
  const PL = 98, PR = 27;
  let vbTop = 0, vbBottom = SH;
  const ny = NY(sp);
  vbTop    = Math.min(vbTop,    ny - 90);
  vbBottom = Math.max(vbBottom, ny + 90);

  let s = `<svg class="ssvg" viewBox="0 ${vbTop} ${SW} ${vbBottom - vbTop}" xmlns="http://www.w3.org/2000/svg">`;
  const gc = 'rgba(255,255,255,0.22)', gx1 = PL, gx2 = SW - PR;

  if (sp < 0) {
    const bl = sp % 2 === 0 ? sp : sp - 1;
    for (let p = -2; p >= bl; p -= 2)
      s += `<line x1="${gx1}" y1="${NY(p)}" x2="${gx2}" y2="${NY(p)}" stroke="${gc}" stroke-width="1.8" stroke-dasharray="9 6"/>`;
  }
  if (sp > 8) {
    const tl = sp % 2 === 0 ? sp : sp + 1;
    for (let p = 10; p <= tl; p += 2)
      s += `<line x1="${gx1}" y1="${NY(p)}" x2="${gx2}" y2="${NY(p)}" stroke="${gc}" stroke-width="1.8" stroke-dasharray="9 6"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const y = NY(i * 2);
    s += `<line x1="${PL}" y1="${y}" x2="${SW-PR}" y2="${y}" stroke="#FFFFFF" stroke-width="2.7"/>`;
  }
  const cfs = LS * 5.4, cy2 = BY - LS * 0.08;
  s += `<text x="14" y="${cy2}" font-size="${cfs}" fill="#FFFF5E" font-family="Georgia,serif" opacity=".7">&#x1D11E;</text>`;

  // ledger lines
  const cx = NX, cy = NY(sp);
  function ledgers() {
    let ll = '';
    const lx1 = cx - 29, lx2 = cx + 29;
    if (sp < 0) for (let p = -2; p >= (sp%2===0?sp:sp-1); p -= 2) ll += `<line x1="${lx1}" y1="${NY(p)}" x2="${lx2}" y2="${NY(p)}" stroke="#FFFF5E" stroke-width="2.2"/>`;
    if (sp > 8) for (let p = 10; p <= (sp%2===0?sp:sp+1); p += 2) ll += `<line x1="${lx1}" y1="${NY(p)}" x2="${lx2}" y2="${NY(p)}" stroke="#FFFF5E" stroke-width="2.2"/>`;
    return ll;
  }
  s += ledgers();

  const col = '#FFFF5E';
  const filled = durationType === 'quarter' || durationType === 'eighth';
  if (filled) {
    s += `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="13" fill="${col}" transform="rotate(-12,${cx},${cy})"/>`;
  } else {
    // hollow: draw ellipse outline + fill background
    s += `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="13" fill="#1B0093" stroke="${col}" stroke-width="2.5" transform="rotate(-12,${cx},${cy})"/>`;
  }

  if (durationType !== 'whole') {
    const sdir = sp < 4 ? -1 : 1;
    const sx = sdir === 1 ? cx - 17 : cx + 17;
    const sy2 = cy + sdir * 69;
    s += `<line x1="${sx}" y1="${cy}" x2="${sx}" y2="${sy2}" stroke="${col}" stroke-width="3"/>`;
    // eighth note flag
    if (durationType === 'eighth') {
      if (sdir === 1) {
        // stem up → flag hangs right from top
        s += `<path d="M${sx},${sy2} C${sx+28},${sy2+15} ${sx+32},${sy2+30} ${sx+12},${sy2+45}" stroke="${col}" stroke-width="2.5" fill="none"/>`;
      } else {
        // stem down → flag hangs right from bottom
        s += `<path d="M${sx},${sy2} C${sx+28},${sy2-15} ${sx+32},${sy2-30} ${sx+12},${sy2-45}" stroke="${col}" stroke-width="2.5" fill="none"/>`;
      }
    }
  }

  s += `</svg>`;
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildSolfeggeStaff — 4-measure sight-reading staff for Phase 7
//
// events: NoteEvent[] — each { noteId, durationId, beats, measureIdx, beatStart }
//   beatStart is absolute (0-based across all measures)
// currentIdx: index of currently-armed note (-1 = count-in, null = round over)
// totalMeasures: number of measures to render (default 4)
// ─────────────────────────────────────────────────────────────────────────────
export function buildSolfeggeStaff(events, currentIdx = -1, totalMeasures = 4) {
  const CLEF_W   = 110;
  const MEAS_W   = 450;
  const VB_W     = CLEF_W + totalMeasures * MEAS_W;  // 1910
  const BEAT_SLOT = MEAS_W / 4;                       // 112.5 per beat
  const PAD_TOP  = 60;                                // extra vertical space above staff
  const VB_H     = SH + PAD_TOP;

  // Shift all Y values down by PAD_TOP to give room for ledger lines above staff
  function NY2(sp) { return BY + PAD_TOP - sp * (LS / 2); }

  function noteX(ev) {
    const beatInMeas = ev.beatStart - ev.measureIdx * 4;
    return CLEF_W + ev.measureIdx * MEAS_W + (beatInMeas + 0.5) * BEAT_SLOT;
  }

  let s = `<svg class="ssvg ssvg--solfege" viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg">`;

  // ── Staff lines (5 lines spanning full width) ────────────────────────────
  for (let i = 0; i < 5; i++) {
    const ly = NY2(i * 2);
    s += `<line x1="0" y1="${ly}" x2="${VB_W}" y2="${ly}" stroke="#FFFFFF" stroke-width="2.5"/>`;
  }

  // ── Treble clef ──────────────────────────────────────────────────────────
  const cfs = LS * 5.4;
  const cly = BY + PAD_TOP - LS * 0.08;
  s += `<text x="8" y="${cly}" font-size="${cfs}" fill="#FFFF5E" font-family="Georgia,serif" opacity=".7">&#x1D11E;</text>`;

  // ── Time signature 4/4 ───────────────────────────────────────────────────
  const tsX = 76, tsFontSize = LS * 1.55;
  s += `<text x="${tsX}" y="${NY2(6)}" font-size="${tsFontSize}" fill="#fff" font-family="Georgia,serif" text-anchor="middle" font-weight="bold">4</text>`;
  s += `<text x="${tsX}" y="${NY2(2)}" font-size="${tsFontSize}" fill="#fff" font-family="Georgia,serif" text-anchor="middle" font-weight="bold">4</text>`;

  // ── Bar lines ────────────────────────────────────────────────────────────
  const barTop    = NY2(8) - 4;
  const barBottom = NY2(0) + 4;
  for (let m = 1; m <= totalMeasures; m++) {
    const bx = CLEF_W + m * MEAS_W;
    if (m === totalMeasures) {
      // Double bar at end
      s += `<line x1="${bx - 6}" y1="${barTop}" x2="${bx - 6}" y2="${barBottom}" stroke="#FFFF5E" stroke-width="1.8"/>`;
      s += `<line x1="${bx}"     y1="${barTop}" x2="${bx}"     y2="${barBottom}" stroke="#FFFF5E" stroke-width="4"/>`;
    } else {
      s += `<line x1="${bx}" y1="${barTop}" x2="${bx}" y2="${barBottom}" stroke="#FFFFFF" stroke-width="1.8"/>`;
    }
  }

  // ── Note drawing ─────────────────────────────────────────────────────────
  function ledgersAt(sp, cx, col) {
    let ll = '';
    const lx1 = cx - 26, lx2 = cx + 26;
    if (sp < 0) {
      const limit = sp % 2 === 0 ? sp : sp - 1;
      for (let p = -2; p >= limit; p -= 2)
        ll += `<line x1="${lx1}" y1="${NY2(p)}" x2="${lx2}" y2="${NY2(p)}" stroke="${col}" stroke-width="2"/>`;
    }
    if (sp > 8) {
      const limit = sp % 2 === 0 ? sp : sp + 1;
      for (let p = 10; p <= limit; p += 2)
        ll += `<line x1="${lx1}" y1="${NY2(p)}" x2="${lx2}" y2="${NY2(p)}" stroke="${col}" stroke-width="2"/>`;
    }
    return ll;
  }

  // ── Playhead (render behind notes) ───────────────────────────────────────
  if (currentIdx >= 0 && currentIdx < events.length) {
    const px = noteX(events[currentIdx]);
    s += `<line x1="${px}" y1="${barTop - 8}" x2="${px}" y2="${barBottom + 8}" stroke="#00FF88" stroke-width="2" stroke-dasharray="5 4" opacity="0.72"/>`;
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const n  = nd(ev.noteId);
    const sp = n.s + 5;                 // staff position (5 = middle C octave baseline)
    const cx = noteX(ev);
    const cy = NY2(sp);

    let col;
    if (i < currentIdx)       col = 'rgba(255,255,255,0.28)';
    else if (i > currentIdx)  col = 'rgba(255,255,255,0.80)';
    else /* i === currentIdx */ col = '#FFFF5E';

    s += ledgersAt(sp, cx, col);

    // Accidental symbol
    if (n.acc) s += `<text x="${cx - 30}" y="${cy + 9}" font-size="27" fill="${col}" font-family="serif">${n.acc}</text>`;

    // Note head
    const rx = 15, ry = 11;
    const rotate = `transform="rotate(-12,${cx},${cy})"`;
    if (ev.durationId === 'quarter') {
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col}" ${rotate}/>`;
    } else {
      // half or whole — hollow
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${col}" stroke-width="2.2" ${rotate}/>`;
    }

    // Stem (quarter and half)
    if (ev.durationId !== 'whole') {
      const sdir = sp < 4 ? -1 : 1;   // -1 = stem up, 1 = stem down
      const sx   = sdir === 1 ? cx - rx + 1 : cx + rx - 1;
      s += `<line x1="${sx}" y1="${cy}" x2="${sx}" y2="${cy + sdir * 58}" stroke="${col}" stroke-width="2.4"/>`;
    }

    // Pulse ring on current note
    if (i === currentIdx && currentIdx >= 0 && currentIdx < events.length) {
      s += `<ellipse cx="${cx}" cy="${cy}" rx="21" ry="17" fill="none" stroke="#FFFF5E" stroke-width="1.4" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="0.65s" repeatCount="indefinite"/>
        <animate attributeName="rx" values="21;27;21" dur="0.65s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="17;23;17" dur="0.65s" repeatCount="indefinite"/>
      </ellipse>`;
    }
  }

  s += `</svg>`;
  return s;
}
