import { nd } from '../constants.js';
import { G } from '../state.js';
import * as game from '../game.js';
import { playNote } from '../audio.js';
import { buildStaff } from '../staff.js';
import { render, sessionIntroduced } from '../main.js';

const ct = document.getElementById('ct');

// ── PHASE 1 — LEARN ──
export function rLearn() {
  const allNotes = game.ga();
  const newNotes = allNotes.filter(id => !sessionIntroduced.has(id));
  // Nothing new to show — skip straight to practicing
  if (newNotes.length === 0) { game.goNextPhase(1); render(); return; }

  const li = Math.min(G.li, newNotes.length - 1);
  const note = newNotes[li], n = nd(note);
  // Do NOT add to sessionIntroduced on render — we mark notes only when the
  // user finishes the batch (clicks "Praticar →"), so prev/next navigation
  // doesn't corrupt the list.

  const card = document.createElement('div'); card.className = 'panel pop-in';
  const uBanner = G.pendingUnlock ? `<div class="unlock-banner">🔓 Nova nota: ${n.lB}!<span>Veja onde ela fica antes de continuar</span></div>` : '';
  const noteCount = newNotes.length > 1 ? `<div class="linfo">${li + 1} / ${newNotes.length} notas</div>` : '';
  card.innerHTML = `<div class="ptag">Fase 1 — Memorize</div>
    ${uBanner}
    <div class="nname">${n.lB}</div>
    <div class="staffw">${buildStaff({ showNote: note })}</div>
    <button class="btn" id="learn-play">♩ Ouvir nota</button>
    ${noteCount}
    <div class="lnav">
      ${li > 0 ? `<button class="btn btn-ghost" id="lprev">← Ant</button>` : '<span></span>'}
      ${li < newNotes.length - 1
        ? `<button class="btn btn-ghost" id="lnext">Próx →</button>`
        : `<button class="btn" id="go-next">Praticar →</button>`}
    </div>`;
  ct.appendChild(card);
  setTimeout(() => playNote(n.f), 300);
  document.getElementById('learn-play').addEventListener('click', () => playNote(n.f));
  if (li > 0) document.getElementById('lprev').addEventListener('click', () => { G.li = Math.max(0, li - 1); render(); });
  if (li < newNotes.length - 1) document.getElementById('lnext').addEventListener('click', () => { G.li = Math.min(newNotes.length - 1, li + 1); render(); });
  if (li >= newNotes.length - 1) document.getElementById('go-next').addEventListener('click', () => {
    // Mark every note the user was shown in this batch as introduced before advancing.
    newNotes.forEach(id => sessionIntroduced.add(id));
    G.li = 0;
    game.goNextPhase(1); render();
  });
}
