// ══════════════════════════════════════════════
//  SHARED KEYBOARD SCROLL MANAGER
//  Both .pianow elements (ref + answer) share one scrollLeft value so they
//  stay perfectly aligned on the X axis.  No native scrollbar is shown;
//  dragging anywhere on the piano background moves both.
// ══════════════════════════════════════════════

const _isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let _kbScrollX = 0;
let _kbSavedScroll = null;   // persists user scroll across render cycles
const _kbWrappers = [];
let _kbDragEl = null, _kbDragStartX = 0, _kbDragStartScroll = 0;

export function resetKbScroll() {
  // Save current scroll position before clearing wrappers
  if (_kbWrappers.length > 0) _kbSavedScroll = _kbScrollX;
  _kbWrappers.length = 0;
  _kbScrollX = 0;
}

// Call on fresh startGame (keepUnlocked=false) to forget the user's scroll position
export function clearKbSavedScroll() {
  _kbSavedScroll = null;
}

function syncKbScroll(left) {
  const max = _kbWrappers.reduce((m, el) => Math.max(m, el.scrollWidth - el.clientWidth), 0);
  _kbScrollX = Math.max(0, Math.min(left, max));
  _kbWrappers.forEach(el => { el.scrollLeft = _kbScrollX; });
}

export function registerKbWrapper(el) {
  _kbWrappers.push(el);
  // Ensure the wrapper has explicit height matching the piano inside
  const piano = el.querySelector('.piano');
  if (piano) el.style.height = piano.style.height;
  // Apply saved scroll position, or center if first time
  if (_kbWrappers.length === 1) {
    requestAnimationFrame(() => {
      const target = _kbSavedScroll !== null
        ? _kbSavedScroll
        : (el.scrollWidth - el.clientWidth) / 2;
      syncKbScroll(target);
      // Double-RAF for mobile layout timing reliability
      if (_isMobile) requestAnimationFrame(() => syncKbScroll(target));
    });
  } else {
    el.scrollLeft = _kbScrollX;
  }

  // Touch drag — works even when starting on a key (distinguishes tap vs swipe).
  let _t0 = null, _ts = 0, _isDrag = false;
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    _t0 = e.touches[0].clientX; _ts = _kbScrollX; _isDrag = false;
    el.dataset.scrolling = '';
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    if (_t0 === null) return;
    e.preventDefault();
    const dx = _t0 - e.touches[0].clientX;
    if (!_isDrag && Math.abs(dx) < 10) return;  // dead zone
    _isDrag = true;
    el.dataset.scrolling = '1';
    syncKbScroll(_ts + dx);
  }, { passive: false });
  el.addEventListener('touchend', () => { _t0 = null; _isDrag = false; el.dataset.scrolling = ''; }, { passive: true });
  el.addEventListener('touchcancel', () => { _t0 = null; _isDrag = false; el.dataset.scrolling = ''; }, { passive: true });

  // Mouse drag (desktop).
  el.addEventListener('mousedown', e => {
    if (e.target.closest('.wkey,.bkey')) return;
    _kbDragEl = el; _kbDragStartX = e.clientX; _kbDragStartScroll = _kbScrollX;
    e.preventDefault();
  });
}

// Global mouse handlers — registered once so fast drags don't lose tracking.
window.addEventListener('mousemove', e => {
  if (!_kbDragEl) return;
  syncKbScroll(_kbDragStartScroll + (_kbDragStartX - e.clientX));
});
window.addEventListener('mouseup', () => { _kbDragEl = null; });
