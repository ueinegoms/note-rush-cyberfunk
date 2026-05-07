# Skill: Add a JS UI Factory Component

## Pattern: Factory function returns a DOM element

### Template: `js/components/MyComponent.js`
```js
// MyComponent — factory that returns a DOM element
// No framework, no lifecycle, no magic — just DOM.
//
// Usage:
//   const el = createMyComponent({ prop1, prop2 });
//   container.appendChild(el);

/**
 * @param {object} opts
 * @param {string} opts.variant   - 'primary' | 'ghost' | 'option'
 * @param {string} opts.label     - display text
 * @param {function} opts.onClick - click handler
 * @returns {HTMLElement}
 */
export function createMyComponent({ variant = 'primary', label, onClick }) {
  const el = document.createElement('button');
  el.className = 'my-component';
  el.dataset.variant = variant;
  el.textContent = label;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}
```

## Rules
- Pure function: no module-level state, no side effects at import time
- Return a single root DOM element
- Accept only plain objects as parameters (no DOM refs)
- Never query the document inside a component factory
- If a component needs to update its own state, return an object:
  ```js
  export function createFeedback() {
    const el = document.createElement('div');
    el.id = 'fb';
    return {
      el,
      showOk(msg)  { el.textContent = msg; el.className = 'ok'; },
      showErr(msg) { el.textContent = msg; el.className = 'err'; },
      clear()      { el.textContent = ''; el.className = ''; }
    };
  }
  ```

## Registering
1. Create `js/components/MyComponent.js`
2. Import in the stage file that needs it:
   ```js
   import { createMyComponent } from '../components/MyComponent.js';
   ```
3. No changes needed in index.html or main.js

## Available / Planned Components
| Component | File | Status |
|---|---|---|
| `createPhaseCard` | js/components/PhaseCard.js | Planned Phase 4 |
| `createFeedback` | js/components/FeedbackDisplay.js | Planned Phase 4 |
| `createOptionGrid` | js/components/OptionGrid.js | Planned Phase 4 |
| `createSliderRow` | js/components/SliderRow.js | Planned Phase 4 |

## PhaseCard Pattern (coming in Phase 4)
```js
// createPhaseCard({ phase: 3, title: 'Posicione a nota', children: [el1, el2] })
// Returns: <div class="panel pop-in" id="acard">
//            <div class="ptag">Fase 3 — Posicione a nota</div>
//            [children appended]
//          </div>
```
Note: Phase card is NOT a component yet — still built via innerHTML in each stage.
When converting, ensure #acard id is preserved (used by shake animation + game-over logic).
