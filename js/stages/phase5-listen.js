import { nd } from '../constants.js';
import { G } from '../state.js';
import * as game from '../game.js';
import { playNote } from '../audio.js';
import { stampQuestion, stampSelection } from '../main.js';
import { hId } from './phase2-identify.js';

const ct = document.getElementById('ct');

// ── PHASE 5 — LISTEN ──
export function rListen() {
  if (!G.cur || G.ans) { game.pickNew(); game.buildSOpts(); }
  stampQuestion();
  const note = G.cur, n = nd(note);
  const card = document.createElement('div'); card.className = 'panel pop-in'; card.id = 'acard';
  card.innerHTML = `<div class="ptag">Fase 5 — Ouça e identifique</div>
    <div class="play-row">
      <button class="btn" id="listen-play">♩ Tocar nota</button>
    </div>
    <div class="opts">${G.sopts.map(nid => `<button class="btn-option" id="ob-${nid}">${nd(nid).lB}</button>`).join('')}</div>
    <div id="fb"></div>`;
  ct.appendChild(card);
  document.getElementById('listen-play').addEventListener('click', () => playNote(n.f, 1.2));
  G.sopts.forEach(nid => {
    document.getElementById('ob-' + nid).addEventListener('click', () => { stampSelection(); hId(nid); });
  });
  setTimeout(() => playNote(n.f, 1.2), 300);
}
