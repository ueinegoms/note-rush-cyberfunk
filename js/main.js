import { SCALE_TYPES, buildScale } from './constants.js';
import { unlockAudio } from './audio.js';
import { G } from './state.js';
import * as game from './game.js';
import * as lb from './leaderboard.js';
import { sessionIntroduced } from './session.js';
import { clearKbSavedScroll } from './keyboard-scroll.js';
import { render, setFreshStart } from './renderer.js';
import { startOnboarding } from './stages/onboarding.js';

// ── Re-exports: stage files continue to import from '../main.js' unchanged ──
export { render, advancePhaseWithRender, stampQuestion, stampSelection, selectionElapsed, reactionDelay, getEpoch } from './renderer.js';
export { lightning, lightningIntensity } from './lightning.js';
export { updateComboDisplay, stopComboTimer, startComboTimer } from './combo-timer.js';
export { registerKbWrapper, resetKbScroll } from './keyboard-scroll.js';
export { sessionIntroduced } from './session.js';

// ── App-level state ──
let _top5Threshold = Infinity;
export function getTop5Threshold() { return _top5Threshold; }

export const DIF_LABELS = ['tranquilo (6s)', 'fácil (5s)', 'médio (4s)', 'difícil (3s)', 'insano (2s)'];

const _isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ══════════════════════════════════════════════
//  TOGGLE ROW HELPERS
// ══════════════════════════════════════════════
export function togglePhase(cbId, rowId) {
  const cb = document.getElementById(cbId);
  cb.checked = !cb.checked;
  updateRowStyle(cbId, rowId);
}
export function updateRowStyle(cbId, rowId) {
  const cb = document.getElementById(cbId);
  const row = document.getElementById(rowId);
  if (cb.checked) row.classList.remove('off');
  else row.classList.add('off');
}

// ══════════════════════════════════════════════
//  LIGHTNING — moved to js/lightning.js
// ══════════════════════════════════════════════
// (lightning and lightningIntensity re-exported via 'export ... from ./lightning.js' at top)

// ══════════════════════════════════════════════
//  COMBO TIMER — moved to js/combo-timer.js
// ══════════════════════════════════════════════
// (startComboTimer, stopComboTimer, updateComboDisplay re-exported at top)

// ══════════════════════════════════════════════
//  RENDER / UI — moved to js/renderer.js
// ══════════════════════════════════════════════
// (render, advancePhaseWithRender, stamp*, elapsed*, getEpoch re-exported at top)

// ══════════════════════════════════════════════
//  START & INITIALIZATION
// ══════════════════════════════════════════════
// keepUnlocked=true: auto-restart after loss (preserve note count + sessionIntroduced)
// keepUnlocked=false: fresh start from menu (reset note count, clear sessionIntroduced)
export function startGame(keepUnlocked = false) {
  const prevUnlocked = keepUnlocked ? (G.unlocked || 0) : 0;
  if (!keepUnlocked) { sessionIntroduced.clear(); clearKbSavedScroll(); }
  setFreshStart(); // wait for first input before starting timer
  game.startGame();
  if (prevUnlocked > G.unlocked) G.unlocked = prevUnlocked;
  render();
}

// ══════════════════════════════════════════════
//  MOBILE SILENT-MODE WARNING
// ══════════════════════════════════════════════
let _silentModalShown = false;
function ensureAudioReady(callback) {
  if (!_isMobile || _silentModalShown) {
    unlockAudio();
    callback();
    return;
  }
  _silentModalShown = true;
  const overlay = document.createElement('div');
  overlay.className = 'silent-modal-overlay';
  overlay.innerHTML = `
    <div class="silent-modal">
      <div class="silent-modal-icon">🔊</div>
      <div class="silent-modal-text">Ei, você tá no celular, né?<br>Pro som do jogo funcionar<br><strong>TIRE DO SILENCIOSO</strong></div>
      <button class="btn" id="silent-modal-ok">OK, já tirei!</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('silent-modal-ok').addEventListener('click', () => {
    overlay.remove();
    unlockAudio();
    callback();
  });
}

// hook UI controls loaded from HTML
function initUI() {
  document.getElementById('start-btn').addEventListener('click', () => { ensureAudioReady(() => startOnboarding()); });
  document.getElementById('skip-ob-btn').addEventListener('click', () => { ensureAudioReady(() => startGame(false)); });

  // Unlock audio on any first interaction (covers play-again etc.)
  const _unlockOnce = () => { unlockAudio(); document.removeEventListener('click', _unlockOnce); document.removeEventListener('touchstart', _unlockOnce); };
  document.addEventListener('click', _unlockOnce);
  document.addEventListener('touchstart', _unlockOnce);

  // sliders
  const sfp = document.getElementById('sfp');
  const sfpV = document.getElementById('sfp-v');
  sfp.addEventListener('input', ()=>{sfpV.textContent = sfp.value;});
  const sni = document.getElementById('sni');
  const sniV = document.getElementById('sni-v');
  sni.addEventListener('input', ()=>{
    const v = +sni.value;
    sniV.textContent = v;
    // Live mid-game adjustment
    if (G.phase > 0) {
      const allN = game.gn();
      G.unlocked = Math.min(v, allN.length);
      render();
    }
  });

  const snr = document.getElementById('snr');
  const snrV = document.getElementById('snr-v');
  const soct = document.getElementById('soct');
  const soctV = document.getElementById('soct-v');

  function updateConfigScale() {
    const typeIdx = Math.max(0, Math.min(SCALE_TYPES.length - 1, (+snr.value) - 1));
    const octaves = Math.max(1, Math.min(5, +soct.value));
    snrV.textContent = SCALE_TYPES[typeIdx].name;
    soctV.textContent = octaves;
    const scaleLen = buildScale(typeIdx, octaves).length;
    sni.max = scaleLen;
    if (+sni.value > scaleLen) { sni.value = scaleLen; sniV.textContent = scaleLen; }
  }
  snr.addEventListener('input', updateConfigScale);
  soct.addEventListener('input', updateConfigScale);
  updateConfigScale(); // set initial sni max based on defaults

  // difficulty (timer) slider
  const sdif = document.getElementById('sdif');
  const sdifV = document.getElementById('sdif-v');
  sdif.addEventListener('input', ()=>{ sdifV.textContent = DIF_LABELS[+sdif.value - 1]; });

  // BPM slider (phase 7 rhythm)
  const sbpm = document.getElementById('sbpm');
  const sbpmV = document.getElementById('sbpm-v');
  if (sbpm && sbpmV) sbpm.addEventListener('input', () => { sbpmV.textContent = sbpm.value; });

  // toggle rows (label click)
  document.querySelectorAll('.ptoggle-row').forEach(row=>{
    row.addEventListener('click', e=>{
      const phase = row.dataset.phase;
      if(!phase) return;
      const cb = document.getElementById(phase);
      cb.checked = !cb.checked;
      updateRowStyle(phase, row.id);
    });
  });
  // checkbox change
  document.querySelectorAll('.ptoggle-row input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change', e=>{
      const row = cb.closest('.ptoggle-row');
      if(row) updateRowStyle(cb.id, row.id);
    });
  });
}

// kick things off
document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  // Fetch top-5 threshold so lightning color reflects leaderboard status
  try {
    const rows = await lb.getLeaderboard();
    if (rows && rows.length >= 5) _top5Threshold = rows[rows.length - 1].score;
    else _top5Threshold = 0; // fewer than 5 entries — any score qualifies
  } catch { _top5Threshold = Infinity; }
  lb.renderLeaderboard(document.getElementById('lb-intro'));
});
