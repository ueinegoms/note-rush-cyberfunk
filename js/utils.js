// miscellaneous utilities used throughout the app

/**
 * Return a new array with the items shuffled.
 * Non‑destructive.
 */
export function shuf(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
