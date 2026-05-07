# Skill: Add a CSS Component with Variants

## Pattern: BEM-inspired + data-variant system

### 1. Create `css/components/my-component.css`
```css
/* ══════════════════════════════════════
   MY-COMPONENT
══════════════════════════════════════ */

/* Base */
.my-component {
  /* base styles shared by all variants */
  display: flex;
  align-items: center;
}

/* Variant: primary */
.my-component[data-variant="primary"] {
  background: var(--panel);
  color: var(--text);
}

/* Variant: ghost */
.my-component[data-variant="ghost"] {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
}

/* Size modifier */
.my-component[data-size="sm"] { padding: 0.5rem; font-size: 0.85rem; }
.my-component[data-size="lg"] { padding: 1.5rem; font-size: 1.5rem; }

/* State modifier */
.my-component[data-state="active"] { border-color: var(--orange); }
.my-component[data-state="disabled"] { opacity: 0.4; pointer-events: none; }
```

### 2. Register in `index.html`
```html
<!-- Component styles -->
<link rel="stylesheet" href="css/components/my-component.css">
```
Place before the theme override link.

### 3. Use in JS
```js
const el = document.createElement('div');
el.className = 'my-component';
el.dataset.variant = 'primary';
el.dataset.size = 'lg';
```

Or in innerHTML template strings:
```js
card.innerHTML = `
  <div class="my-component" data-variant="ghost">...</div>
`;
```

## Rules
1. Never use inline styles for theme values — always reference CSS vars
2. Never use `!important` — fix specificity instead
3. Keep component styles in their own file, not in base.css or theme-cyberfunk.css
4. When overriding for a specific phase, add a phase-scoped selector:
   `.phase-3 .my-component { ... }` NOT `#some-id .my-component { ... }`
5. Active/hover states: always add both `@media (hover: hover)` for desktop
   AND `:active` for mobile touch feedback

## Button Variants Reference
```
data-variant="cta"      — Main CTA (JOGAR): 2.5rem, max-width 480px
data-variant="ghost"    — Dark bg, yellow text, no border
data-variant="option"   — Note choice: flex:1, min-width 100px, 1.1rem
data-variant="replay"   — Game over replay: 1.5rem
data-variant="confirm"  — Drag confirm: min-height 48px, disabled opacity 0.5
```

## Cyberfunk Style Rules
- Backgrounds: always dark (--panel, --card, --bg)
- Text: yellow (#FFFF5E / --plus2 / --orange) or white (--text)
- Borders: --border or none
- Highlight/active: --orange or --ok (green) or --err (red)
- Font: Space Mono for all UI, Black Ops One for display titles
- No shadows on UI elements (only on staff/note SVG glows)
- Letter-spacing: 0.06em on all buttons
- text-transform: uppercase on buttons
