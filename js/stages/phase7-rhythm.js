import { nd } from '../constants.js';
import { G } from '../state.js';
import * as game from '../game.js';
import { onOk, onErr } from '../game.js';
import { playNote } from '../audio.js';
import { buildSolfeggeStaff } from '../staff.js';
import { getBpm } from '../settings.js';
import { hapticSuccess, hapticError, hapticNudge } from '../haptics.js';
import {
  render, advancePhaseWithRender,
  stampQuestion, stampSelection,
} from '../main.js';
import { makeCard, makeFeedback } from '../components.js';

const ct = document.getElementById('ct');

// ── Duration table for sight-reading (no eighth notes) ──────────────────────
const SOLFEGE_DURS = [
  { id: 'whole',   beats: 4, w: 10 },
  { id: 'half',    beats: 2, w: 30 },
  { id: 'quarter', beats: 1, w: 60 },
];

function pickDur(remaining) {
  const eligible = SOLFEGE_DURS.filter(d => d.beats <= remaining);
  const total = eligible.reduce((a, d) => a + d.w, 0);
  let r = Math.random() * total;
  for (const d of eligible) { r -= d.w; if (r <= 0) return d; }
  return eligible[eligible.length - 1];
}

// ── Fill one measure (4 beats) ───────────────────────────────────────────────
function fillMeasure(activeNotes, measureIdx) {
  const events = [];
  let remaining = 4;
  let cursor = 0;
  while (remaining > 0) {
    const dur = pickDur(remaining);
    const noteId = activeNotes[Math.floor(Math.random() * activeNotes.length)];
    events.push({ noteId, durationId: dur.id, beats: dur.beats,
                  measureIdx, beatStart: measureIdx * 4 + cursor });
    cursor += dur.beats;
    remaining -= dur.beats;
  }
  return events;
}

// ── Build full round (4 measures) ───────────────────────────────────────────
function buildRound(activeNotes) {
  const events = [];
  for (let m = 0; m < 4; m++) events.push(...fillMeasure(activeNotes, m));
  return events;
}

// ── Short metronome click ────────────────────────────────────────────────────
function clickTone(freq) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_) { /* silent fail */ }
}

// ── PHASE 7 — SOLFÈGE SIGHT-READING ──────────────────────────────────────────
export function rRhythm() {
  const activeNotes = game.ga();
  const events      = buildRound(activeNotes);
  const bpm         = getBpm();
  const beatMs      = 60000 / bpm;
  const countInMs   = 2 * beatMs;   // two metronome clicks before beat 1

  // Buttons sorted lowest → highest pitch
  const sortedNotes = [...activeNotes].sort((a, b) => nd(a).f - nd(b).f);

  // ── Build card ─────────────────────────────────────────────────────────
  stampQuestion();

  const card = makeCard({ phase: 7, label: 'Solfège — identifique as notas' });

  const staffWrap = document.createElement('div');
  staffWrap.className = 'solfege-staff-wrap';
  staffWrap.innerHTML = buildSolfeggeStaff(events, -1);

  const opts = document.createElement('div');
  opts.className = 'opts';
  sortedNotes.forEach(noteId => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.dataset.note = noteId;
    btn.textContent = nd(noteId).lb;
    btn.addEventListener('click', () => tapHandler(noteId));
    opts.appendChild(btn);
  });

  const fb = makeFeedback();
  card.append(staffWrap, opts, fb);
  ct.appendChild(card);

  // ── Round state ────────────────────────────────────────────────────────
  let _displayIdx = -1;           // controls staff rendering
  let _armed      = null;         // event index currently awaiting tap
  let _roundDone  = false;
  const results   = new Array(events.length).fill(null);

  function updateStaff(idx) {
    _displayIdx = idx;
    staffWrap.innerHTML = buildSolfeggeStaff(events, idx);
  }

  function getFb() { return document.getElementById('fb'); }

  // ── Count-in ───────────────────────────────────────────────────────────
  setTimeout(() => { clickTone(880); hapticNudge(); }, 0);
  setTimeout(() => { clickTone(880); hapticNudge(); }, beatMs);

  // ── Schedule arm + auto-miss for every event ───────────────────────────
  events.forEach((ev, i) => {
    const armAt    = countInMs + ev.beatStart * beatMs;
    const missAt   = armAt + ev.beats * beatMs + 80; // small grace offset
    setTimeout(() => armNote(i),   armAt);
    setTimeout(() => autoMiss(i),  missAt);
  });

  // Schedule round-end summary
  const last = events[events.length - 1];
  setTimeout(afterRound, countInMs + (last.beatStart + last.beats) * beatMs + 300);

  // ── armNote ────────────────────────────────────────────────────────────
  function armNote(i) {
    if (_roundDone || results[i] !== null) return;
    _armed = i;
    updateStaff(i);
    playNote(nd(events[i].noteId).f, 0.55);
    stampSelection();
  }

  // ── autoMiss ───────────────────────────────────────────────────────────
  function autoMiss(i) {
    if (_roundDone || results[i] !== null || _armed !== i) return;
    results[i] = false;
    _armed = null;
    onErr();
    hapticError();
    const fbEl = getFb();
    if (fbEl) { fbEl.textContent = 'TARDE'; fbEl.className = 'err'; }
    updateStaff(i + 1); // dim resolved events, keep future bright
  }

  // ── tapHandler ─────────────────────────────────────────────────────────
  function tapHandler(noteId) {
    if (_roundDone || _armed === null) return;
    const idx   = _armed;
    _armed = null;
    const correct = noteId === events[idx].noteId;
    results[idx]  = correct;

    const fbEl       = getFb();
    const correctBtn = opts.querySelector(`[data-note="${events[idx].noteId}"]`);

    if (correct) {
      if (fbEl) { fbEl.textContent = 'CERTO!'; fbEl.className = 'ok'; }
      if (correctBtn) { correctBtn.classList.add('opt--ok'); setTimeout(() => correctBtn.classList.remove('opt--ok'), 600); }
      playNote(nd(events[idx].noteId).f, 0.7);
      hapticSuccess();
      onOk(0);
    } else {
      if (fbEl) { fbEl.textContent = `ERROU — era ${nd(events[idx].noteId).lb}`; fbEl.className = 'err'; }
      if (correctBtn) { correctBtn.classList.add('opt--ok'); setTimeout(() => correctBtn.classList.remove('opt--ok'), 900); }
      const wrongBtn = opts.querySelector(`[data-note="${noteId}"]`);
      if (wrongBtn) { wrongBtn.classList.add('opt--err'); setTimeout(() => wrongBtn.classList.remove('opt--err'), 600); }
      hapticError();
      onErr();
    }

    updateStaff(idx + 1); // dim resolved, keep future bright
  }

  // ── afterRound ─────────────────────────────────────────────────────────
  function afterRound() {
    if (_roundDone) return;
    _roundDone = true;
    _armed = null;

    const correct = results.filter(Boolean).length;
    const total   = events.length;
    updateStaff(events.length); // all dimmed

    const fbEl = getFb();
    if (fbEl) {
      fbEl.textContent = `${correct}/${total} corretas`;
      fbEl.className   = correct > 0 ? 'ok' : 'err';
    }

    setTimeout(() => {
      if (correct > 0) advancePhaseWithRender(G.phase);
      else             render();
    }, 1800);
  }
}
