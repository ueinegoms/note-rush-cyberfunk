// ── ADMIN PANEL ── loaded by index.html; activates only when ?admin=1 ──
import { getFeedback, clearFeedback } from './feedback.js';
import { getVariant, setVariant, clearVariants } from './ab-test.js';

function buildAdminPanel() {
  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.style.cssText = [
    'position:fixed', 'top:0', 'right:0', 'width:320px', 'max-height:100dvh',
    'overflow-y:auto', 'background:#0d0050', 'border-left:2px solid #FFFF5E',
    'padding:1rem', 'z-index:99999', 'font-family:monospace', 'font-size:0.72rem',
    'color:#fff', 'box-sizing:border-box',
  ].join(';');

  // ── header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem';
  const title = document.createElement('strong');
  title.style.color = '#FFFF5E';
  title.textContent = 'Admin — Feedback';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:none;border:none;color:#FFFF5E;font-size:1.1rem;cursor:pointer;padding:0;';
  closeBtn.addEventListener('click', () => panel.remove());
  header.append(title, closeBtn);
  panel.appendChild(header);

  // ── A/B variant override
  const abSection = document.createElement('div');
  abSection.style.cssText = 'margin-bottom:.75rem;padding-bottom:.75rem;border-bottom:1px solid #FFFF5E44';
  abSection.innerHTML = `<div style="color:#FFFF5E;margin-bottom:.3rem">A/B Variant Override</div>`;
  const abRow = document.createElement('div');
  abRow.style.cssText = 'display:flex;gap:.4rem;align-items:center;flex-wrap:wrap';
  const testInput = document.createElement('input');
  testInput.placeholder = 'testId';
  testInput.style.cssText = 'background:#1B0093;color:#fff;border:1px solid #444;padding:.2rem .4rem;width:120px;font-family:monospace;font-size:.72rem';
  const varSelect = document.createElement('select');
  varSelect.style.cssText = 'background:#1B0093;color:#fff;border:1px solid #444;padding:.2rem .3rem;font-family:monospace;font-size:.72rem';
  ['A', 'B'].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; varSelect.appendChild(o); });
  const setBtn = document.createElement('button');
  setBtn.textContent = 'Set';
  setBtn.style.cssText = 'background:#FFFF5E;color:#1B0093;border:none;padding:.2rem .4rem;cursor:pointer;font-weight:700;font-size:.72rem';
  setBtn.addEventListener('click', () => {
    if (testInput.value.trim()) { setVariant(testInput.value.trim(), varSelect.value); renderContent(); }
  });
  const clearAbBtn = document.createElement('button');
  clearAbBtn.textContent = 'Clear All';
  clearAbBtn.style.cssText = 'background:#FF2244;color:#fff;border:none;padding:.2rem .4rem;cursor:pointer;font-weight:700;font-size:.72rem';
  clearAbBtn.addEventListener('click', () => { clearVariants(); renderContent(); });
  abRow.append(testInput, varSelect, setBtn, clearAbBtn);
  abSection.appendChild(abRow);
  panel.appendChild(abSection);

  // ── feedback content area
  const content = document.createElement('div');
  panel.appendChild(content);

  // ── action buttons
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:.4rem;margin-top:.75rem;padding-top:.75rem;border-top:1px solid #FFFF5E44';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export JSON';
  exportBtn.style.cssText = 'background:#FFFF5E;color:#1B0093;border:none;padding:.3rem .5rem;cursor:pointer;font-weight:700;font-size:.72rem';
  exportBtn.addEventListener('click', () => {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(getFeedback(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `noteRush-feedback-${date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const clearFbBtn = document.createElement('button');
  clearFbBtn.textContent = 'Clear';
  clearFbBtn.style.cssText = 'background:#FF2244;color:#fff;border:none;padding:.3rem .5rem;cursor:pointer;font-weight:700;font-size:.72rem';
  clearFbBtn.addEventListener('click', () => {
    if (confirm('Clear all feedback entries? This cannot be undone.')) { clearFeedback(); renderContent(); }
  });
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = '↺';
  refreshBtn.style.cssText = 'background:none;color:#FFFF5E;border:1px solid #FFFF5E44;padding:.3rem .5rem;cursor:pointer;font-size:.72rem';
  refreshBtn.addEventListener('click', renderContent);
  btnRow.append(exportBtn, clearFbBtn, refreshBtn);
  panel.appendChild(btnRow);

  document.body.appendChild(panel);

  function renderContent() {
    const entries = getFeedback();
    if (!entries.length) { content.innerHTML = '<div style="color:#888;font-style:italic">No feedback yet.</div>'; return; }

    const grouped = {};
    entries.forEach(e => {
      const k = `${e.testId || 'general'}/${e.variant || '-'}`;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(e);
    });

    let html = `<div style="margin-bottom:.4rem">${entries.length} entries total</div>`;
    for (const [key, items] of Object.entries(grouped)) {
      const rated = items.filter(e => e.stars > 0);
      const avg = rated.length ? (rated.reduce((s, e) => s + e.stars, 0) / rated.length).toFixed(1) : '—';
      html += `<div style="margin:.4rem 0;border-top:1px solid #FFFF5E33;padding-top:.4rem">`;
      html += `<strong style="color:#FFFF5E">${key}</strong> — ${items.length} resp, ★${avg} avg<br>`;
      items.filter(e => e.msg).forEach(e => {
        html += `<div style="color:#aaa;padding-left:.5rem">"${e.msg.replace(/</g, '&lt;')}" (★${e.stars})</div>`;
      });
      html += `</div>`;
    }
    content.innerHTML = html;
  }

  renderContent();
}

if (new URLSearchParams(window.location.search).get('admin') === '1') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildAdminPanel);
  } else {
    buildAdminPanel();
  }
}
