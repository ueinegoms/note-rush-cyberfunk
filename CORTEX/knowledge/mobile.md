# Mobile — Touch Patterns, Haptics, Keyboard Scroll

## Piano Keyboard Scroll (js/keyboard-scroll.js)

### Purpose
Both piano wrappers (reference + answer) share ONE scrollLeft value so they
stay aligned on the X axis. No native scrollbar shown.

### State
```js
_kbScrollX        — current shared scroll position
_kbSavedScroll    — persists across render() cycles so user doesn't lose their place
_kbWrappers[]     — registered .pianow elements (cleared on render)
```

### API
```js
registerKbWrapper(el)    — call after appending a .pianow to DOM
resetKbScroll()          — save current scroll, clear wrappers (called by render())
clearKbSavedScroll()     — call on fresh startGame (not keepUnlocked)
```

### Scroll Initialization Order
1. First wrapper registered → RAF → center scroll (or restore saved)
2. Double-RAF on mobile for layout timing reliability
3. Second wrapper registered → instantly sync to current _kbScrollX

### Touch Drag (on each .pianow)
- touchstart: record start X + scroll, set data-scrolling=''
- touchmove: if dx > 10px dead zone → _isDrag=true, data-scrolling='1', syncKbScroll
- touchend/cancel: clear state, data-scrolling='' (piano.js reads this to skip note-play)

### Mouse Drag (on each .pianow, desktop)
- mousedown (not on .wkey/.bkey): record el + startX + startScroll
- window mousemove: sync (fast drags tracked globally so they don't lose the element)
- window mouseup: clear _kbDragEl

## Haptics (js/haptics.js)
```js
hapticNudge()        — short 20ms pulse, note step feedback in phase 3 drag
hapticSuccess()      — double pulse (30ms + 60ms @ +50ms), correct answer
hapticError()        — long buzz 120ms, wrong answer  
hapticBuzz()         — 200ms buzz, game over with high score
hapticRevolution()   — 3-pulse pattern, dragged through full range in phase 3
hapticBoundary()     — single 15ms pulse, reached edge of valid range
```
All calls guarded: `if (!navigator.vibrate) return`.

## Phase 3 Drag (js/stages/phase3-place.js)

### Mobile Touch Drag
- `_prevY` tracks last touch Y
- `_subStep` accumulates fractional steps (sub-pixel precision)
- Velocity = `rawDy / dt`
- Acceleration: `accel = clamp(1, 3, 1 + (vel - 0.3) / 0.4)` — slow=1:1, fast=3x
- Steps snap to `validSps[]` (notes actually in the current scale)
- Each step: hapticNudge() + playNote (0.4 vol preview)
- Every `_revSteps` total steps: hapticRevolution()
- At range boundary (no movement): hapticBoundary() (once per boundary contact)
- On touchend: stampSelection() + playNote preview; explicit Confirm button

### Desktop Mouse
- mousemove over SVG: map screen coords → SVG coords via `getScreenCTM().inverse()`
- Snap to nearest validSp via reduce
- Hover ghost shown as visual preview
- click: immediate answer

### Confirm vs Auto-confirm
- Mobile: explicit Confirm button (safety for accidental touches)
- Desktop: click directly submits

## Mobile Detection
```js
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```
Used by: keyboard-scroll.js (double-RAF), main.js (silent modal), phase3-place.js (hint text)

## iOS Specifics
- `user-scalable=no` ignored since iOS 10 → handled via touch-action CSS
- Silent mode warning modal shown once per session on mobile
- Audio context unlock: dummy buffer trick in audio.js (runs on first user gesture)
- `<meta name="apple-mobile-web-app-capable">` for fullscreen PWA mode
