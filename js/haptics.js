// ── HAPTICS ──────────────────────────────────────────────────────────────────
// Uses the web-haptics library (https://github.com/lochie/web-haptics).
// Loaded from esm.sh CDN — no build step needed.
// Works on Android (Vibration API) and iOS (Web Audio API fallback).
// ─────────────────────────────────────────────────────────────────────────────
import { WebHaptics } from 'https://esm.sh/web-haptics';

const _h = new WebHaptics();

/** Tiny tick — one step change while dragging the staff */
export const hapticNudge   = () => _h.trigger('nudge');

/** Short tap — piano key press */
export const hapticKey     = () => _h.trigger(15);

/** Double rising bump — correct answer */
export const hapticSuccess = () => _h.trigger('success');

/** Two hard pulses — wrong answer / combo lost */
export const hapticError   = () => _h.trigger('error');

/** Exciting triple-burst — TOP 5 screen entry */
export const hapticBuzz = () => _h.trigger([
  { duration: 60, intensity: 1 },
  { delay: 40, duration: 60, intensity: 0.85 },
  { delay: 40, duration: 60, intensity: 0.85 },
  { delay: 60, duration: 180, intensity: 1 },
]);

/** Strong single clock-tock — one full wheel revolution while dragging phase 3 */
export const hapticRevolution = () => _h.trigger([{ duration: 40, intensity: 1 }]);

/** Double bump — reached the edge of the note range while dragging phase 3 */
export const hapticBoundary = () => _h.trigger([
  { duration: 25, intensity: 1 },
  { delay: 25, duration: 25, intensity: 0.8 },
]);
