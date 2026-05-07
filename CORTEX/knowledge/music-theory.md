# Music Theory — Note System & Scales

## Solfège System (Brazilian Portuguese)
```
Dó = C    Ré = D    Mi = E    Fá = F    Sol = G    Lá = A    Si = B
```
Accidentals: flats only (♭). No sharps in this system.
Written: Dó₄ (middle C = C4), subscript octave number.
Display HTML: `n.lb` = "Dó₄", `n.lB` = "DÓ₄" (uppercase for phase headings)

## AN[] — Note Table Structure (js/constants.js)
```js
{
  id:  'Dó4',         // unique key, used everywhere as note identifier
  s:   -7,            // staff position (half-steps from Dó5/C5 reference)
  lb:  'Dó₄',        // lowercase display label
  lB:  'DÓ₄',        // uppercase display label  
  f:   261.63,        // frequency in Hz
  acc: '♭'           // optional: flat symbol (only on flat notes)
}
```

## Staff Position (s) Meaning
- Dó5 (middle line treble clef) = s:0
- Each step = one note line/space (half a line-spacing in SVG)
- s increases upward: Ré5=1, Mi5=2 ...
- s decreases downward: Si4=-1, Lá4=-2, Sol4=-3 ...
- Visual Y coordinate: `NY(sp) = BY - sp * (LS/2)` where sp = n.s + 5

## Staff Position Offset (+5)
All rendering code uses `sp = n.s + 5` (not `n.s` directly).
The +5 shift aligns s=0 (Dó5) to the visual center of the treble staff.
So Dó5 (s=0) → sp=5, which sits on the middle line at LS*2 from baseline.

## Note Range
```
Dó2 (s=-21) to Dó7 (s=14)  — 37 natural notes
+ 25 flat notes (no sharps)
Total: 62 entries in AN[]
```

## Scale Types (SCALE_TYPES[])
```
Index  Name                Intervals (semitones from root, 1 octave)
0      Maior               [0,2,4,5,7,9,11]   — 7 notes
1      Menor Natural       [0,2,3,5,7,8,10]   — 7 notes
2      Pentatônica         [0,2,4,7,9]        — 5 notes
3      Menor Harmônica     [0,2,3,5,7,8,11]   — 7 notes
4      Menor Melódica      [0,2,3,5,7,9,11]   — 7 notes
5      Maior com 7         [0,2,4,5,7,9,11,12] — 8 notes (includes octave)
6      Dominante           [0,2,4,5,7,9,10]   — 7 notes
7      Cromática           all 12 semitones    — 12 notes
```
Ordered by harmonic complexity (difficulty curve for players).
Note: indices are 0-based in code, but slider value is 1-based (snr=1 → typeIdx=0).

## buildScale(typeIdx, octaves) → string[]
Returns array of note IDs spanning the requested octave count.
Uses CHROMATIC_NAMES to find the root note names, matches to AN[].
Notes are returned in undefined order — caller sorts by frequency if needed.

## Note Frequency Reference
```
Dó4 (C4) = 261.63 Hz  (middle C)
Lá4 (A4) = 440.00 Hz  (concert pitch)
```
Octave up = ×2 frequency. All values hardcoded in AN[].

## Ledger Lines
Staff has 5 lines from s=0 to s=8 (even positions).
Ledger lines needed when sp < 0 (below staff) or sp > 8 (above staff).
Draw at even sp values only (note heads on lines or spaces, ledgers always on lines).
```js
// Below staff: sp < 0
for (let p = -2; p >= (sp % 2 === 0 ? sp : sp - 1); p -= 2) { ...draw... }
// Above staff: sp > 8
for (let p = 10; p <= (sp % 2 === 0 ? sp : sp + 1); p += 2) { ...draw... }
```
