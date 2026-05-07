import { nd } from '../constants.js';
import { G } from '../state.js';
import * as game from '../game.js';
import { playNote } from '../audio.js';
import { stampQuestion, stampSelection } from '../main.js';
import { hId } from './phase2-identify.js';
import { makeCard, makeOptionGrid, makeFeedback } from '../components.js';

const ct = document.getElementById('ct');

// ── PHASE 5 — LISTEN ──
export function rListen() {
  if (!G.cur || G.ans) { game.pickNew(); game.buildSOpts(); }
  stampQuestion();
  const note = G.cur, n = nd(note);

  const card = makeCard({ phase: 5, label: 'Ouça e identifique' });
  const playRow = document.createElement('div'); playRow.className = 'play-row';
  const playBtn = document.createElement('button');
  playBtn.className = 'btn'; playBtn.id = 'listen-play'; playBtn.textContent = '♩ Tocar nota';
  playBtn.addEventListener('click', () => playNote(n.f, 1.2));
  playRow.appendChild(playBtn);
  card.appendChild(playRow);
  card.appendChild(makeOptionGrid(
    G.sopts.map(nid => ({ id: nid, label: nd(nid).lB })),
    item => { stampSelection(); hId(item.id); }
  ));
  card.appendChild(makeFeedback());
  ct.appendChild(card);
  setTimeout(() => playNote(n.f, 1.2), 300);
}
