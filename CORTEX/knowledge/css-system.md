# CSS System — Design Tokens & Components

## Theme: Cyberfunk (active)
Applied via `[data-theme="cyberfunk"]` on `<html>`.

### Color Palette
```
--bg:      #0A0A06    (deep near-black background)
--panel:   #1D0A6A    (panel/card background)
--card:    #12095A    (inner card bg)
--panel2:  #160878    (alternate panel)
--orange:  #FFFD00    (primary accent — yellow, NOT orange)
--orange2: #E0DC00    (secondary accent)
--text:    #FFFDEE    (body text)
--muted:   #8880CC    (muted purple text)
--border:  #3020AA    (border color)
--ok:      #00FF88    (correct answer — green)
--err:     #FF2244    (wrong answer — red)
--gold:    #FFFD00    (leaderboard gold)
```

### Root (fallback) vars in base.css
```
--plus1:  #22126A    (dark purple used in .bt, .btn-ghost bg)
--plus2:  #FFFF5E    (yellow used in .btn text, body text)
--bg2:    #1C3DF7    (blue, .panel bg before theme override)
--dark:   #0A0820
--ok:     #00FF88
--err:    #FF2244
--muted:  rgba(255,255,94,0.45)
```

### Typography
```
--font-display: 'Black Ops One', cursive      (headers, titles)
--font-body:    'Space Mono', monospace        (body, UI)
--font-mono:    'Space Mono', monospace
fallback:       'JetBrains Mono' (loaded in HTML, used before theme apply)
```

## CSS File Map
```
css/base.css                         — reset, layout, .panel, .btn base, .btn-ghost, .btn-option
css/theme-cyberfunk.css              — root var overrides for cyberfunk theme
css/components/
  animations.css                     — @keyframes pop-in, shake
  buttons.css                        — button size/variant overrides (use data-variant in future)
  cards.css                          — .panel variants, .ptag, .nname, .score-show
  feedback.css                       — .ok, .err, combo display
  game-layout.css                    — #game-header, #game-page, #intro-main layout
  intro.css                          — intro screen, leaderboard, name entry
  name-entry.css                     — name input, submit row
  options.css                        — .opts, .btn-option grid
  piano.css                          — .piano, .wkey, .bkey, .pianow, .ref-piano-outer
  staff.css                          — .ssvg, .staffw, .drag-staffw, .drag-hint
```

## Key Class Patterns

### Buttons
```css
.btn                  — base: full-width, yellow bg, dark text, uppercase, 1.2rem padding
.btn.off              — dark bg, muted yellow text (for inactive toggles)
.btn-ghost            — dark bg (--plus1), yellow text (--plus2), no border
.btn-option           — dark bg, yellow text, flex:1, min-width:100px, for note choices
```

After Phase 3 refactor, these will gain `data-variant=` equivalents:
```
data-variant="cta"     → JOGAR size (2.5rem, max-width:480px)
data-variant="ghost"   → .btn-ghost equivalent
data-variant="option"  → .btn-option equivalent
data-variant="replay"  → 1.5rem font
data-variant="confirm" → min-height:48px
```

### Staff
```css
.staffw               — staff wrapper div (overflow visible, centered)
.drag-staffw          — drag mode staff wrapper
.ssvg                 — SVG element inside staff wrapper
.drag-hint            — hint text above drag staff
```

### Piano
```css
.piano                — piano keyboard container (flex row)
.pianow               — scrollable wrapper around .piano
.wkey                 — white key div
.bkey                 — black key div
.wkey.pressed         — key being held
.wkey.selected-key    — selected in phase 4 (pre-confirm)
.wkey.ck              — correct key highlight (after answer)
.wkey.wk              — wrong key highlight (after error)
.wkey.dis             — disabled (after answer submitted)
.ref-upcoming         — key for note not yet reached in scale (phase 6)
.ref-inactive         — key outside current active set
.ref-piano-outer      — outer wrapper with label
.ref-piano-lbl        — "teclado de referência..." label text
```

### Layout
```css
#game-header          — fixed top bar (logo + timer bar + combo display)
#game-header.show     — visible during game
.combo-timer-bar      — timer progress bar inside header
#combo-disp           — "x0" combo counter (top-right)
#game-page            — main game content area
#game-page.show       — visible during game
#game-page.show.onboarding — expanded for onboarding flow
#ct                   — card render target inside game-page
#intro-main           — home screen container
.panel                — card container: max-width 480px, centered, dark bg, flex-col
.pop-in               — animation class: scale-in on append
.shake                — animation class: horizontal shake on error
```

### Config Panel
```css
.sr                   — slider row wrapper
.sr-label             — label + value display row
.sr-val               — current value span (right-aligned)
.ptoggle-row          — phase toggle row (label + checkbox)
.ptoggle-row.off      — dimmed state when phase disabled
.toggle-sw            — toggle switch component wrapper
.toggle-track         — track background
.toggle-thumb         — thumb circle
```

## Critical: Do Not Edit
- `css/theme-cyberfunk.css` — only override vars here, never direct styles
- `--ok` / `--err` in base.css — feedback colors used in JS (`.className = 'ok'`)

## Data Attributes Used by JS
```
data-note="Dó4"       — on piano keys, identifies the note
data-scrolling="1"    — on .pianow, set during touch drag
data-phase="ph1"      — on .ptoggle-row, identifies phase
```
