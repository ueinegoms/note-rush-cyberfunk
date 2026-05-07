import { nd, DURATIONS } from '../constants.js';
import { G, lockAnswer } from '../state.js';
import * as game from '../game.js';
import { onOk, onErr } from '../game.js';
import { playNote, jOkChord, jErrChord } from '../audio.js';
import { buildStaffRhythm } from '../staff.js';
import { getBpm } from '../settings.js';
import { hapticSuccess, hapticError, hapticNudge } from '../haptics.js';
import {
  render, advancePhaseWithRender,
  lightning, lightningIntensity,
  updateComboDisplay, stopComboTimer,
  stampQuestion, stampSelection, selectionElapsed, reactionDelay,
  getEpoch,
} from '../main.js';
import { makeCard, makeFeedback } from '../components.js';

const ct = document.getElementById('ct');

// Play a short metronome click at freq Hz (sine burst)
function clickTone(freq, gainVal = 0.35) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_) { /* silent fail in restricted environments */ }
}

// Score timing accuracy: returns { label, multiplier }
function rhythmScore(offsetMs) {
  const abs = Math.abs(offsetMs);
  if (abs <= 100) return { label: 'PERFEITO',   multiplier: 1.0 };
  if (abs <= 250) return { label: 'BOM',         multiplier: 0.5 };
  return              { label: 'FORA DO TEMPO', multiplier: 0.0 };
}

// ── PHASE 7 — RHYTHM ──
export function rRhythm() {
  if (!G.cur || G.ans) game.pickNew();
  stampQuestion();

  const noteId   = G.cur;
  const note     = nd(noteId);
  const dur      = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
  const bpm      = getBpm();
  const beatMs   = 60000 / bpm;
  const targetMs = dur.beats * beatMs; // when player should tap relative to beat-1

  const card  = makeCard({ phase: 7, label: 'Ritmo — toque no momento certo' });
  const nname = document.createElement('div'); nname.className = 'nname'; nname.textContent = note.lB;
  const durLabel = document.createElement('div'); durLabel.className = 'drag-hint'; durLabel.textContent = dur.label + ` (${dur.beats} tempo${dur.beats !== 1 ? 's' : ''})`;

  const staffWrap = document.createElement('div'); staffWrap.className = 'staffw';
  staffWrap.innerHTML = buildStaffRhythm(note.s + 5, dur.id);

  const timeline = document.createElement('div'); timeline.className = 'rhythm-timeline';
  const bar      = document.createElement('div'); bar.className = 'rhythm-bar'; bar.id = 'rhythm-bar';
  timeline.appendChild(bar);

  const tapBtn = document.createElement('button');
  tapBtn.className = 'btn'; tapBtn.id = 'rhythm-tap'; tapBtn.textContent = 'TAP ↵';
  tapBtn.style.fontSize = '1.4rem'; tapBtn.style.minHeight = '64px';
  tapBtn.disabled = true;

  const fb = makeFeedback();

  card.append(nname, durLabel, staffWrap, timeline, tapBtn, fb);
  ct.appendChild(card);

  // ── Lead-in: 2 metronome clicks at BPM, then arm the tap button ──
  let _armed = false;
  let _beatStart = null; // timestamp when beat 1 fires

  setTimeout(() => {
    clickTone(880);
    hapticNudge();
  }, 0);
  setTimeout(() => {
    clickTone(880);
    hapticNudge();
    _beatStart = performance.now();
    _armed = true;
    tapBtn.disabled = false;

    // Animate sweep bar to show targetMs time window
    bar.style.transition = `width ${targetMs}ms linear`;
    bar.style.width = '100%';
  }, beatMs);

  // ── Auto-miss after targetMs * 2 ──
  const myEpoch = getEpoch();
  setTimeout(() => {
    if (!_armed || G.ans || getEpoch() !== myEpoch) return;
    handleTap(Infinity); // too late
  }, beatMs + targetMs * 2);

  function handleTap(forcedOffset) {
    if (G.ans || !lockAnswer()) return;
    _armed = false;
    tapBtn.disabled = true;

    const offsetMs = forcedOffset !== undefined
      ? forcedOffset
      : performance.now() - (_beatStart + targetMs);
    const { label, multiplier } = rhythmScore(offsetMs);

    stampSelection();
    const fbEl = document.getElementById('fb');
    bar.style.transition = 'none';

    if (multiplier > 0) {
      fbEl.textContent  = label;
      fbEl.className    = 'ok';
      playNote(note.f, 0.8);
      jOkChord(note.f);
      hapticSuccess();
      lightning(lightningIntensity(selectionElapsed()));
      // Scale elapsed time to reflect accuracy (perfect = fast, good = medium)
      onOk(100 + (1 - multiplier) * 4000);
      updateComboDisplay();
      const { sfp } = game.S(); const rd = reactionDelay();
      if (G.streak >= sfp) { setTimeout(() => advancePhaseWithRender(G.phase), rd); return; }
      setTimeout(() => { game.nextQ(); render(); }, rd);
    } else {
      fbEl.textContent = label;
      fbEl.className   = 'err';
      playNote(note.f, 0.8);
      jErrChord(note.f);
      hapticError();
      onErr();
      updateComboDisplay();
      const c = document.getElementById('acard');
      if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 360); }
      // After miss, restart immediately
      const eg = getEpoch(); setTimeout(() => { if (getEpoch() === eg) { game.nextQ(); render(); } }, 1000);
    }
  }

  tapBtn.addEventListener('click', () => { if (_armed) handleTap(); });
  document.addEventListener('keydown', function onKey(e) {
    if ((e.code === 'Space' || e.code === 'Enter') && _armed) {
      e.preventDefault();
      handleTap();
      document.removeEventListener('keydown', onKey);
    }
  }, { once: false });
}
