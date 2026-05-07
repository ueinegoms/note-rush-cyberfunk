# Audio System

## Engine: Web Audio API (js/audio.js)

### Note Playback — playNote(freq, vol=1)
Two timbres randomly selected 50/50 per note:

**Triangle (clean)**
```
OscillatorNode (triangle) → GainNode → destination
Attack: 0ms (instant)
Decay: 200ms to 0, stop at 600ms
```

**Piano (harmonic)**
```
3× OscillatorNode (sine) at freq, freq*2, freq*3
Envelope: fast attack (18ms), staggered decays
  - Fundamental: 600ms
  - 2nd harmonic: 300ms
  - 3rd harmonic: 150ms
→ Mixed GainNode → destination
```

### Chord Playback

**jOkChord(rootFreq)** — correct answer reward
- 50% chance: major chord (root, +4 semitones, +7 semitones)
- 50% chance: dominant 7th (root, +4, +7, +10)
- Arpeggiated: each note plays 60ms apart, 0.15 vol

**jErrChord(rootFreq)** — wrong answer penalty
- Minor chord (root, +3, +7)
- Sawtooth oscillators (harsh timbre)
- Simultaneous (no arpeggio), 0.2 vol

### iOS Audio Unlock
```js
unlockAudio()
```
Plays a silent dummy buffer to unlock AudioContext after user gesture.
Called on: first click/touch anywhere, silent-modal OK button, start buttons.
Must be called in direct response to a user gesture (no setTimeout between).

### Architecture
```js
const ctx = new (window.AudioContext || window.webkitAudioContext)();
```
Single global AudioContext (lazy-created or created at module load).
All nodes connected to `ctx.destination`.

## Volume Guidelines
```
playNote(freq)          — vol 1.0   (standard question/answer feedback)
playNote(freq, 0.4)     — phase 3 drag preview (quiet, continuous)
playNote(freq, 0.8)     — reveal note after wrong answer
playNote(freq, 1.2)     — phase 4 "Tocar nota" button (slightly louder)
jOkChord                — 0.15 per note (3-4 notes = 0.45-0.6 total)
jErrChord               — 0.2 per note (3 notes = 0.6 total)
```

## Notes on Timing
- Staff auto-play on render: `setTimeout(() => playNote(n.f), 300)` — avoids popping from rapid re-renders
- Scale preview: evenly spaced, `ms = max(40, round(1200/noteCount))`
