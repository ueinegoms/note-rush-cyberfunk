// components.js — Reusable DOM factory functions for phase cards.
// All builders return HTMLElement instances, never strings.
// Stage files call these for consistent card structure; no logic lives here.

// ── PhaseCard ────────────────────────────────────────────────────────────────
// Creates the shared card wrapper with optional phase tag.
//
// Usage: const card = makeCard({ phase: 2, label: 'Qual é esta nota?' });
//        ct.appendChild(card);
//
export function makeCard({ phase = null, label = null, id = 'acard', extraClass = '' } = {}) {
  const card = document.createElement('div');
  card.className = ('panel pop-in' + (extraClass ? ' ' + extraClass : '')).trim();
  if (id) card.id = id;
  if (phase !== null && label !== null) {
    const tag = document.createElement('div');
    tag.className = 'ptag';
    tag.textContent = `Fase ${phase} — ${label}`;
    card.appendChild(tag);
  }
  return card;
}

// ── FeedbackDisplay ──────────────────────────────────────────────────────────
// Creates the #fb element used to show CERTO / ERROU feedback.
//
// Usage: const fb = makeFeedback();
//        card.appendChild(fb);
//        fb.textContent = 'CERTO!'; fb.className = 'ok';
//
export function makeFeedback(id = 'fb') {
  const el = document.createElement('div');
  el.id = id;
  return el;
}

// ── OptionGrid ───────────────────────────────────────────────────────────────
// Creates a .opts container with .btn-option buttons.
//
// items: [{ id, label }]
// onClick: (item) => void  — called with the item on click
//
// Usage: const opts = makeOptionGrid(
//          [{ id: 'Dó5', label: 'DÓ₅' }, ...],
//          item => hId(item.id)
//        );
//        card.appendChild(opts);
//
export function makeOptionGrid(items, onClick) {
  const grid = document.createElement('div');
  grid.className = 'opts';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-option';
    btn.dataset.variant = 'option';
    btn.id = 'ob-' + item.id;
    btn.textContent = item.label;
    btn.addEventListener('click', () => onClick(item));
    grid.appendChild(btn);
  }
  return grid;
}

// ── SliderRow ────────────────────────────────────────────────────────────────
// Creates a labeled slider row for the config panel.
//
// Usage: const row = makeSliderRow({ id: 'sbpm', label: 'BPM', min: 40, max: 160, step: 10, value: 80 });
//        configPanel.appendChild(row);
//
export function makeSliderRow({ id, label, min, max, step = 1, value, valueId = id + '-v' } = {}) {
  const row = document.createElement('div');
  row.className = 'slider-row';
  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.innerHTML = `${label}: <span id="${valueId}">${value}</span>`;
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.addEventListener('input', () => {
    const span = document.getElementById(valueId);
    if (span) span.textContent = input.value;
  });
  row.appendChild(lbl);
  row.appendChild(input);
  return row;
}
