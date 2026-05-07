// ── A/B TESTING — client-side, localStorage-persisted ──
// Variants are assigned 50/50 on first encounter and sticky.

const PREFIX = 'noteRush_ab_';

/**
 * Returns 'A' or 'B' for the given testId.
 * Assignment is random on first call, then persisted to localStorage.
 */
export function getVariant(testId) {
  const key = PREFIX + testId;
  let v = localStorage.getItem(key);
  if (!v) {
    v = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(key, v);
  }
  return v;
}

/** Force a specific variant (useful for testing). */
export function setVariant(testId, variant) {
  localStorage.setItem(PREFIX + testId, variant);
}

/** Remove all A/B assignments (resets to random on next load). */
export function clearVariants() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k));
}
