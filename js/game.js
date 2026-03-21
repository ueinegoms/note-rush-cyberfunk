import {SCALE_TYPES, buildScale, nd, AN} from './constants.js';
import {shuf} from './utils.js';
import {G, lockAnswer, unlockAnswer} from './state.js';

// phases utilities — ordered by difficulty
const PHASE_ORDER = [1,2,3,4,5,6];
export function getActivePhases() {
  const res = [];
  for (const ph of PHASE_ORDER) {
    const el = document.getElementById('ph' + ph);
    if (el && el.checked) res.push(ph);
  }
  return res.length > 0 ? res : PHASE_ORDER;
}
const PHASE_BONUS = {1:1, 2:2, 3:3, 4:4, 5:5, 6:10};
export function nextActivePhase(current) {
  const phases = getActivePhases();
  const idx = phases.indexOf(current);
  if (idx === -1 || idx === phases.length - 1) return null;
  return phases[idx + 1];
}
export function firstActivePhase() { return getActivePhases()[0]; }

// note sets depending on selected scale type + octaves
export function gn() {
  const snr = document.getElementById('snr');
  const soct = document.getElementById('soct');
  const typeIdx = snr ? Math.max(0, Math.min(SCALE_TYPES.length - 1, (+snr.value) - 1)) : 0;
  const octaves = soct ? Math.max(1, Math.min(5, +soct.value)) : 1;
  return buildScale(typeIdx, octaves);
}
export function ga() { return gn().slice(0, Math.min(G.unlocked, gn().length)); }

export function getDistractors(exclude, count) {
  const pool = ga().filter(x => !exclude.includes(x));
  return shuf(pool).slice(0, count);
}

export function buildSOpts() {
  const count = Math.min(2, ga().length - 1);
  const dist = getDistractors([G.cur], count);
  G.sopts = shuf([G.cur, ...dist]);
}

export function S() {
  return {
    sfp: +document.getElementById('sfp').value,
    sni: +document.getElementById('sni').value
  };
}

// game state transitions and helpers
export function startGame() {
  const {sni} = S(), allN = gn();
  const startCombo = Math.max(0, sni - 2);
  const firstPh = firstActivePhase();
  G.phase = firstPh;
  G.streak = 0;
  G.unlocked = Math.min(sni, allN.length);
  G.combo = startCombo;
  G.bestCombo = startCombo;
  G.cur = null;
  G.ans = false;
  G.sopts = [];
  G.li = 0;
  G.pendingUnlock = false;
  G._lastCombo = 0;
  G.lastNote = null;
  G.scaleIdx = 0;
  G.scaleDir = 1;
  G.scaleTarget = [];
  // the caller should trigger a render
}

export function pickNew() {
  const n = ga();
  if (G.cur) G.lastNote = G.cur;
  G.cur = n[Math.floor(Math.random() * n.length)];
  G.ans = false;
  G.sopts = [];
}

export function lPrev() { G.li = Math.max(0, G.li - 1); }
export function lNext() { G.li = Math.min(ga().length - 1, G.li + 1); }

export function goNextPhase(current) {
  const next = nextActivePhase(current);
  if (next !== null) {
    G.phase = next;
    G.streak = 0;
    G.cur = null;
    G.ans = false;
    G.pendingUnlock = false;
    // Caller should call render() after this
  } else {
    advanceNote();
  }
}

export function advanceNote() {
  const allN = gn();
  if (G.unlocked < allN.length) {
    G.unlocked++;
    G.streak = 0;
    G.pendingUnlock = true;
    G.li = G.unlocked - 1;
    setTimeout(() => {
      G.phase = firstActivePhase();
      G.cur = null;
      G.ans = false;
      G.pendingUnlock = false;
    }, 800);
  } else {
    // All notes unlocked (5-octave ceiling) — loop phases
    G.streak = 0;
    G.phase = firstActivePhase();
    G.cur = null;
    G.ans = false;
  }
}

export function nextQ() { G.cur = null; G.ans = false; }

export function shufArray(a) { return shuf(a); } // alias if needed

// ── SCALE DRILL helpers ──
export function getScaleSequence() {
  const notes = ga();
  return [...notes].sort((a, b) => nd(a).f - nd(b).f);
}

export function pickScaleTarget() {
  const seq = getScaleSequence();
  // Target: ascending scale from active notes
  G.scaleTarget = seq;
  G.cur = seq[0] || null;
  G.ans = false;
}

function comboLerp(ms, maxBonus) {
  const MIN_T = 1000, MAX_T = 5000;
  if (ms <= MIN_T) return maxBonus;
  if (ms >= MAX_T) return 0;
  return Math.round(maxBonus * (1 - (ms - MIN_T) / (MAX_T - MIN_T)));
}

export function onOk(elapsedMs) {
  G.streak++;
  const maxBonus = PHASE_BONUS[G.phase] || 1;
  const bonus = comboLerp(elapsedMs, maxBonus);
  G._lastBonus = bonus;
  G.combo += bonus;
  if (G.combo > G.bestCombo) G.bestCombo = G.combo;
  G.ans = true;
  unlockAnswer();
}

export function onErr() {
  G._lastCombo = G.combo;
  G.combo = 0;
  G.streak = 0;
  G.ans = true;
  unlockAnswer();
}
