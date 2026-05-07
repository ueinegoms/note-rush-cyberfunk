// ── PLAYER FEEDBACK WIDGET ──
// Appends a non-blocking 1–5 star rating to #acard on game over.

const STORE_KEY  = 'noteRush_feedback';
const MAX_ENTRIES = 200;

/**
 * Appends the feedback widget to #acard.
 * Shows at most once per session per testId.
 *
 * @param {Object} opts
 * @param {string} [opts.testId='general']
 * @param {string} [opts.variant]   - 'A' | 'B' from ab-test.js
 * @param {number} [opts.phase]
 * @param {number} [opts.score]
 */
export function showFeedbackWidget({ testId = 'general', variant = null, phase = null, score = 0 } = {}) {
  const sessionKey = 'noteRush_fb_done_' + testId;
  if (sessionStorage.getItem(sessionKey)) return;

  const card = document.getElementById('acard');
  if (!card) return;

  const wrap = document.createElement('div');
  wrap.className = 'fb-widget';

  const prompt = document.createElement('div');
  prompt.className = 'fb-prompt';
  prompt.textContent = 'Como foi esta sessão?';

  const starsRow = document.createElement('div');
  starsRow.className = 'fb-stars';
  const starBtns = [1, 2, 3, 4, 5].map(i => {
    const b = document.createElement('button');
    b.className = 'fb-star';
    b.dataset.star = i;
    b.textContent = '★';
    b.setAttribute('aria-label', `${i} estrela${i > 1 ? 's' : ''}`);
    return b;
  });
  starBtns.forEach(b => starsRow.appendChild(b));

  const textInput = document.createElement('input');
  textInput.className = 'fb-text';
  textInput.type = 'text';
  textInput.placeholder = 'Comentário (opcional)';
  textInput.maxLength = 60;

  const actions = document.createElement('div');
  actions.className = 'fb-actions';
  const skipBtn = document.createElement('button');
  skipBtn.className = 'btn btn-ghost';
  skipBtn.setAttribute('data-variant', 'ghost');
  skipBtn.textContent = 'Pular';
  const sendBtn = document.createElement('button');
  sendBtn.className = 'btn';
  sendBtn.textContent = 'Enviar';
  actions.append(skipBtn, sendBtn);

  wrap.append(prompt, starsRow, textInput, actions);
  card.appendChild(wrap);

  // ── star selection
  let selectedStar = 0;
  starsRow.addEventListener('click', e => {
    const btn = e.target.closest('.fb-star');
    if (!btn) return;
    selectedStar = +btn.dataset.star;
    starBtns.forEach((b, i) => b.classList.toggle('active', i < selectedStar));
  });

  function dismiss() {
    wrap.remove();
    sessionStorage.setItem(sessionKey, '1');
  }

  function send() {
    if (!selectedStar) { dismiss(); return; }
    const entry = {
      ts:      Date.now(),
      testId,
      variant,
      phase,
      score,
      stars:   selectedStar,
      msg:     textInput.value.trim().slice(0, 60),
    };
    const entries = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    sessionStorage.setItem(sessionKey, '1');
    wrap.innerHTML = '<div class="fb-thanks">Obrigado! ✓</div>';
    setTimeout(() => wrap.remove(), 1500);
  }

  skipBtn.addEventListener('click', dismiss);
  sendBtn.addEventListener('click', send);
}

/** Returns all stored feedback entries. */
export function getFeedback() {
  return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
}

/** Removes all stored feedback entries. */
export function clearFeedback() {
  localStorage.removeItem(STORE_KEY);
}
