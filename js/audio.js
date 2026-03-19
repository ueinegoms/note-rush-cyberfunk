let actx = null;
let _unlocked = false;

export function ctx2() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

// Unlock Web Audio on iOS (including silent-mode workaround).
// Must be called from a user-gesture handler (click/touchend).
export function unlockAudio() {
  if (_unlocked) return;
  _unlocked = true;
  const c = ctx2();
  if (c.state === 'suspended') c.resume();
  // iOS silent-mode trick: play a tiny silent buffer through an <audio> element
  // to activate the hardware audio session, then route Web Audio through it.
  try {
    const buf = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    src.stop(c.currentTime + 0.001);
  } catch (_) { /* ignore */ }
}

const TIMBRES = [
  {
    name: 'tri',
    build: (c, freq, t) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.55, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
      o.start(t);
      o.stop(t + 1);
    }
  },
  {
    name: 'piano',
    build: (c, freq, t) => {
      [0, 4, -3].forEach((detune, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.value = freq * (i === 0 ? 1 : i === 1 ? 2 : 3);
        o.detune.value = detune;
        const vol = i === 0 ? 0.44 : i === 1 ? 0.16 : 0.08;
        o.connect(g);
        g.connect(c.destination);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + (i === 0 ? 1.2 : i === 1 ? 0.8 : 0.5));
        o.start(t);
        o.stop(t + 1.3);
      });
    }
  }
];

export function playNote(freq, dur = 0.9, delay = 0) {
  const c = ctx2(), t = c.currentTime + delay;
  TIMBRES[Math.floor(Math.random() * TIMBRES.length)].build(c, freq, t);
}

const ST = Math.pow(2, 1/12); // one semitone ratio

// Win sound: 50/50 major chord (0,4,7) or dominant 7th (0,4,7,10), arpeggiated
export function jOkChord(rootFreq) {
  const c = ctx2(), t = c.currentTime;
  const semis = Math.random() < 0.5 ? [0, 4, 7] : [0, 4, 7, 10];
  semis.forEach((semi, i) => {
    const f = rootFreq * Math.pow(ST, semi);
    const delay = i * 0.075;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0, t + delay);
    g.gain.linearRampToValueAtTime(0.35, t + delay + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.65);
    o.start(t + delay);
    o.stop(t + delay + 0.7);
  });
}

// Minor chord (root + min3 + P5), simultaneous — lose sound
export function jErrChord(rootFreq) {
  const c = ctx2(), t = c.currentTime;
  [0, 3, 7].forEach((semi, i) => {
    const f = rootFreq * Math.pow(ST, semi);
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(i === 0 ? 0.18 : 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.start(t);
    o.stop(t + 0.45);
  });
}
