import { nd, SCALE_TYPES, buildScale, scaleName } from '../constants.js';
import { playNote } from '../audio.js';
import { buildRefPiano } from '../piano.js';
import {
  startGame, resetKbScroll, registerKbWrapper, updateRowStyle, DIF_LABELS
} from '../main.js';

const ct = document.getElementById('ct');

let _obScaleType = 0;
let _obOctaves = 1;

function getObNotes() {
  return buildScale(_obScaleType, _obOctaves);
}

function updateObPiano() {
  const el = document.getElementById('ob-piano');
  if (!el) return;
  el.innerHTML = '';
  resetKbScroll();
  const allNotes = getObNotes();
  const wrap = buildRefPiano(allNotes, allNotes);
  el.appendChild(wrap);
  registerKbWrapper(wrap);
}

function playScalePreview() {
  const notes = getObNotes();
  const sorted = [...notes].sort((a, b) => nd(a).f - nd(b).f);
  const ms = Math.max(40, Math.round(1200 / sorted.length));
  sorted.forEach((nid, i) => {
    setTimeout(() => playNote(nd(nid).f, 0.4), i * ms);
  });
}

function updateObLabels() {
  const lbl = document.getElementById('ob-scale-label');
  if (lbl) lbl.textContent = scaleName(_obScaleType, _obOctaves);
}

function applyObScale() {
  const snr = document.getElementById('snr');
  const soct = document.getElementById('soct');
  const sni = document.getElementById('sni');
  snr.value = _obScaleType + 1;
  soct.value = _obOctaves;
  const scaleLen = getObNotes().length;
  sni.max = scaleLen;
  if (+sni.value > scaleLen) sni.value = scaleLen;
  document.getElementById('sni-v').textContent = sni.value;
  document.getElementById('snr-v').textContent = SCALE_TYPES[_obScaleType].name;
  document.getElementById('soct-v').textContent = _obOctaves;
}

function setPhaseChecked(phId, checked) {
  const cb = document.getElementById(phId);
  if (cb) cb.checked = checked;
  const row = document.getElementById('row-' + phId);
  if (row) updateRowStyle(phId, row.id);
}

export function startOnboarding() {
  document.getElementById('intro-main').style.display = 'none';
  document.getElementById('game-page').classList.add('show');
  window.scrollTo(0, 0);
  // Defaults: Major scale, 5 octaves (always expand from center)
  _obScaleType = 0;
  _obOctaves = 5;
  applyObScale();
  // Skip scale/octave selection — go straight to note count
  obStepNoteCount();
}

function obStep1() {
  ct.innerHTML = '';
  resetKbScroll();
  const card = document.createElement('div');
  card.className = 'panel pop-in piano-card';
  card.innerHTML = `
    <div class="ob-question">Qual escala você quer treinar?</div>
    <div class="ob-note-count" id="ob-scale-label">${scaleName(_obScaleType, _obOctaves)}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-type-prev">← Ant</button>
      <span style="font-size:0.7rem;opacity:0.5">escala</span>
      <button class="btn btn-ghost ob-adj" id="ob-type-next">Próx →</button>
    </div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-oct-prev">− oitava</button>
      <span style="font-size:0.7rem;opacity:0.5">oitavas</span>
      <button class="btn btn-ghost ob-adj" id="ob-oct-next">+ oitava</button>
    </div>
    <div id="ob-piano"></div>
    <button class="btn" id="ob-next1">Próximo</button>
  `;
  ct.appendChild(card);
  updateObPiano();
  playScalePreview();
  document.getElementById('ob-type-prev').addEventListener('click', () => {
    _obScaleType = Math.max(0, _obScaleType - 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-type-next').addEventListener('click', () => {
    _obScaleType = Math.min(SCALE_TYPES.length - 1, _obScaleType + 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-oct-prev').addEventListener('click', () => {
    _obOctaves = Math.max(1, _obOctaves - 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-oct-next').addEventListener('click', () => {
    _obOctaves = Math.min(5, _obOctaves + 1);
    updateObLabels(); updateObPiano(); playScalePreview();
  });
  document.getElementById('ob-next1').addEventListener('click', () => { applyObScale(); obStepNoteCount(); });
}

function obStepNoteCount() {
  ct.innerHTML = '';
  const sni = document.getElementById('sni');
  const totalNotes = getObNotes().length;
  let curVal = sni ? Math.min(+sni.value, totalNotes) : 3;
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">🎵</div>
    <div class="ob-question">Quantas notas pra começar?</div>
    <div class="ob-note-count" id="ob-nc-label">${curVal} nota${curVal > 1 ? 's' : ''}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-nc-down">−</button>
      <button class="btn btn-ghost ob-adj" id="ob-nc-up">+</button>
    </div>
    <button class="btn" id="ob-nc-next">Próximo</button>
  `;
  ct.appendChild(card);
  function updateNcLabel() {
    document.getElementById('ob-nc-label').textContent = curVal + ' nota' + (curVal > 1 ? 's' : '');
  }
  document.getElementById('ob-nc-down').addEventListener('click', () => {
    curVal = Math.max(2, curVal - 1); updateNcLabel();
  });
  document.getElementById('ob-nc-up').addEventListener('click', () => {
    curVal = Math.min(totalNotes, curVal + 1); updateNcLabel();
  });
  document.getElementById('ob-nc-next').addEventListener('click', () => {
    if (sni) {
      sni.value = curVal;
      document.getElementById('sni-v').textContent = curVal;
    }
    obStepDifficulty();
  });
}

function obStepDifficulty() {
  ct.innerHTML = '';
  const sdif = document.getElementById('sdif');
  let curVal = sdif ? +sdif.value : 1;
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">⏱️</div>
    <div class="ob-question">Qual dificuldade?</div>
    <div class="ob-note-count" id="ob-dif-label">${DIF_LABELS[curVal - 1]}</div>
    <div class="ob-adj-row">
      <button class="btn btn-ghost ob-adj" id="ob-dif-down">−</button>
      <button class="btn btn-ghost ob-adj" id="ob-dif-up">+</button>
    </div>
    <button class="btn" id="ob-dif-next">Próximo</button>
  `;
  ct.appendChild(card);
  function updateDifLabel() {
    document.getElementById('ob-dif-label').textContent = DIF_LABELS[curVal - 1];
  }
  document.getElementById('ob-dif-down').addEventListener('click', () => {
    curVal = Math.max(1, curVal - 1); updateDifLabel();
  });
  document.getElementById('ob-dif-up').addEventListener('click', () => {
    curVal = Math.min(5, curVal + 1); updateDifLabel();
  });
  document.getElementById('ob-dif-next').addEventListener('click', () => {
    if (sdif) { sdif.value = curVal; document.getElementById('sdif-v').textContent = DIF_LABELS[curVal - 1]; }
    obStep2();
  });
}

function obStep2() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">👋</div>
    <div class="ob-question">Você quer ser apresentado as notas?</div>
    <button class="btn" id="ob-intro-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-intro-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-intro-yes').addEventListener('click', () => { setPhaseChecked('ph1', true); obStep3(); });
  document.getElementById('ob-intro-no').addEventListener('click', () => { setPhaseChecked('ph1', false); obStep3(); });
}

function obStep3() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">🎼</div>
    <div class="ob-question">Você quer treinar a pauta?</div>
    <button class="btn" id="ob-staff-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-staff-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-staff-yes').addEventListener('click', () => {
    setPhaseChecked('ph2', true);
    setPhaseChecked('ph3', true);
    obStep4();
  });
  document.getElementById('ob-staff-no').addEventListener('click', () => {
    setPhaseChecked('ph2', false);
    setPhaseChecked('ph3', false);
    obStep4();
  });
}

function obStep4() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">👂🎹</div>
    <div class="ob-question">Você também quer treinar de ouvido?</div>
    <button class="btn" id="ob-ears-yes">Sim</button>
    <button class="btn btn-ghost" id="ob-ears-no">Não</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-ears-yes').addEventListener('click', () => {
    setPhaseChecked('ph4', true);
    obStep5();
  });
  document.getElementById('ob-ears-no').addEventListener('click', () => {
    setPhaseChecked('ph4', false);
    setPhaseChecked('ph5', false);
    obStepScale();
  });
}

function obStep5() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.innerHTML = `
    <div class="ob-icon">&#x1F648;&#x1F442;</div>
    <div class="ob-question">Você também quer treinar o ouvido sem referência (mt difícil)?</div>
    <button class="btn" id="ob-ref-no">Não</button>
    <button class="btn btn-ghost" id="ob-ref-yes">Sim</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-ref-yes').addEventListener('click', () => { setPhaseChecked('ph5', true); obStepScale(); });
  document.getElementById('ob-ref-no').addEventListener('click', () => { setPhaseChecked('ph5', false); obStepScale(); });
}

function obStepScale() {
  ct.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'panel pop-in';
  card.style.background = 'var(--bg2)';
  card.innerHTML = `
    <div class="ob-icon">🚧</div>
    <div class="ob-question">Você quer treinar a sequência da escala?</div>
    <div style="font-size:0.75rem;font-weight:700;color:var(--plus2);opacity:0.7;">EM CONSTRUÇÃO</div>
    <button class="btn" id="ob-scale-no">Não</button>
    <button class="btn btn-ghost" id="ob-scale-yes">Sim</button>
  `;
  ct.appendChild(card);
  document.getElementById('ob-scale-yes').addEventListener('click', () => {
    setPhaseChecked('ph6', true);
    startGame(false);
  });
  document.getElementById('ob-scale-no').addEventListener('click', () => {
    setPhaseChecked('ph6', false);
    startGame(false);
  });
}
