// settings.js — Single source of truth for all slider/DOM-derived config values.
// game.js and combo-timer.js import from here instead of querying DOM directly.
// main.js / initUI() still owns the actual DOM elements and event listeners.

import { SCALE_TYPES, buildScale } from './constants.js';

// ── Scale type + octave range ───────────────────────────────────────────────

export function getScaleTypeIdx() {
  const el = document.getElementById('snr');
  return el ? Math.max(0, Math.min(SCALE_TYPES.length - 1, (+el.value) - 1)) : 0;
}

export function getOctaves() {
  const el = document.getElementById('soct');
  return el ? Math.max(1, Math.min(5, +el.value)) : 1;
}

export function getNoteScale() {
  return buildScale(getScaleTypeIdx(), getOctaves());
}

// ── Starting note count ─────────────────────────────────────────────────────

export function getStartingNotes() {
  const el = document.getElementById('sni');
  return el ? +el.value : 2;
}

// ── Fingering position ──────────────────────────────────────────────────────

export function getFingeringPos() {
  const el = document.getElementById('sfp');
  return el ? +el.value : 1;
}

// ── Timer difficulty ────────────────────────────────────────────────────────
// sdif slider: 1=6s, 2=5s, 3=4s, 4=3s, 5=2s

export function getDifficulty() {
  const el = document.getElementById('sdif');
  return el ? +el.value : 1;
}

export function getTimerDuration(phase) {
  const v = getDifficulty();
  const base = 7000 - v * 1000;
  return phase === 6 ? base + 10000 : base;
}

// ── BPM (for Phase 7 rhythm) ────────────────────────────────────────────────

export function getBpm() {
  const el = document.getElementById('sbpm');
  return el ? Math.max(40, Math.min(160, +el.value)) : 80;
}

// ── Convenience bundle (used by game.js S()) ────────────────────────────────

export function getSettings() {
  return {
    sfp:      getFingeringPos(),
    sni:      getStartingNotes(),
    typeIdx:  getScaleTypeIdx(),
    octaves:  getOctaves(),
    difficulty: getDifficulty(),
    bpm:      getBpm(),
  };
}
