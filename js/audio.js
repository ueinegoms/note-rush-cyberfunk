let actx = null;
export function ctx2() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
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
      g.gain.linearRampToValueAtTime(0.28, t + 0.018);
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
        const vol = i === 0 ? 0.22 : i === 1 ? 0.08 : 0.04;
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

export function jOk() {
  const c = ctx2(), t = c.currentTime;
  [523, 659, 784].forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0, t + i * .1);
    g.gain.linearRampToValueAtTime(0.18, t + i * .1 + .015);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * .1 + .22);
    o.start(t + i * .1);
    o.stop(t + i * .1 + .25);
  });
}

export function jErr() {
  const c = ctx2(), o = c.createOscillator(), g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, c.currentTime + .32);
  g.gain.setValueAtTime(0.16, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + .32);
  o.start();
  o.stop(c.currentTime + .36);
}
