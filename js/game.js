import {NS, nd, AN} from './constants.js';
import {shuf} from './utils.js';
import {G, lockAnswer, unlockAnswer} from './state.js';

// phases utilities
export function getActivePhases() {
  const res = [];
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('ph' + i);
    if (el && el.checked) res.push(i);
  }
  return res.length > 0 ? res : [1,2,3,4,5];
}
const PHASE_BONUS = [0,1,2,3,4,5];
export function nextActivePhase(current) {
  const phases = getActivePhases();
  const idx = phases.indexOf(current);
  if (idx === -1 || idx === phases.length - 1) return null;
  return phases[idx + 1];
}
export function firstActivePhase() { return getActivePhases()[0]; }

// note sets depending on unlock state
const NR_NAMES = ['basic','extended','full'];
export function gn() {
  const el = document.getElementById('snr');
  const idx = el ? Math.max(0, Math.min(2, (+el.value) - 1)) : 1;
  return NS[NR_NAMES[idx]];
}
export function ga() { return gn().slice(0, Math.min(G.unlocked, gn().length)); }

export function getDistractors(exclude, count) {
  const all = gn(), active = ga();
  const upcoming = all.slice(active.length, active.length + 3);
  const pool = [...active, ...upcoming].filter(x => !exclude.includes(x));
  const extra = AN.map(n=>n.id).filter(x=>!exclude.includes(x)&&!pool.includes(x));
  return shuf([...pool, ...extra]).slice(0, count);
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
    // Phase will be set after a short delay (unlock banner display)
    setTimeout(() => {
      G.phase = firstActivePhase();
      G.cur = null;
      G.ans = false;
      G.pendingUnlock = false;
    }, 800);
  } else {
    G.streak = 0;
    // All notes unlocked; just show next button
  }
}

export function nextQ() { G.cur = null; G.ans = false; }

export function shufArray(a) { return shuf(a); } // alias if needed

export function onOk() {
  G.streak++;
  const bonus = PHASE_BONUS[G.phase] || 1;
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
