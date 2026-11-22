// All sound is synthesised with WebAudio, so the app needs no audio files and works offline.
let ctx = null, master = null;
let enabled = true, volume = 0.7, haptics = true;
let noiseBuf = null;

export function configure(o) {
  if ('enabled' in o) enabled = !!o.enabled;
  if ('volume' in o) { volume = o.volume; if (master) master.gain.value = volume; }
  if ('haptics' in o) haptics = !!o.haptics;
}

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* audio unavailable */ }
}

function noise(dur, { f0 = 2500, f1 = null, q = 1, type = 'bandpass', gain = 0.4, when = 0, attack = 0.006 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, t);
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

function tone(freq, dur, { type = 'sine', gain = 0.25, when = 0, slideTo = null, attack = 0.006 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

const buzz = (p) => { if (haptics && typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } };
export const vibrate = (duration) => buzz(duration);

const jit = (k = 0.12) => 1 - k + Math.random() * 2 * k; // a little variation so repeated cards never sound identical
// one paper "tick": the building block of a riffle or a slide
const tick1 = (when, gain = 0.14) => noise(0.022, { f0: (2600 + Math.random() * 3200), q: 1.6, gain: gain * jit(0.3), when, attack: 0.0012 });
const riffle = (n, t0, gap0, gap1, gain) => { let t = t0; for (let i = 0; i < n; i++) { tick1(t, gain); t += gap0 + (gap1 - gap0) * (i / Math.max(1, n - 1)); } return t; };
// a card landing flat on the table: crisp snap, papery body, soft thump, tiny settle
const slap = (g = 1, when = 0) => {
  const j = jit();
  noise(0.04, { f0: 5200 * j, q: 0.7, type: 'highpass', gain: 0.3 * g, when, attack: 0.0015 });
  noise(0.1, { f0: 2400 * j, f1: 900, q: 1.1, gain: 0.34 * g, when, attack: 0.002 });
  tone(165 * j, 0.1, { type: 'sine', gain: 0.4 * g, slideTo: 68, attack: 0.002, when });
  noise(0.03, { f0: 3800, q: 1.2, gain: 0.13 * g, when: when + 0.024, attack: 0.001 });
};
const SFX = {
  click() { tone(520, 0.05, { type: 'triangle', gain: 0.12 }); },
  select() { noise(0.035, { f0: 3200 * jit(), q: 1.4, gain: 0.16, attack: 0.001 }); tone(330, 0.05, { type: 'sine', gain: 0.07, attack: 0.002 }); },
  deal() { noise(0.1, { f0: 5200, f1: 1800, q: 0.8, gain: 0.26, attack: 0.004 }); slap(0.45, 0.085); },
  flip() { riffle(3, 0, 0.018, 0.012, 0.16); noise(0.05, { f0: 3600, f1: 1400, q: 1, gain: 0.2, when: 0.05, attack: 0.002 }); },
  place() {
    noise(0.055, { f0: 4800, f1: 1700, q: 0.8, gain: 0.22, attack: 0.001 });
    tone(210, 0.055, { type: 'sine', gain: 0.12, slideTo: 110, attack: 0.001 });
    buzz(8);
  },
  draw() {
    noise(0.2, { f0: 1500, f1: 4600, q: 0.6, gain: 0.2, attack: 0.04 });
    riffle(7, 0.01, 0.026, 0.014, 0.1);
    noise(0.05, { f0: 4200, q: 0.9, gain: 0.2, when: 0.19, attack: 0.002 });
  },
  shuffle() {
    let t = riffle(26, 0, 0.03, 0.011, 0.13);
    t = riffle(24, t + 0.07, 0.03, 0.011, 0.13);
    slap(0.7, t + 0.05); slap(0.5, t + 0.13);
  },
  turn() { tone(660, 0.09, { type: 'triangle', gain: 0.14 }); tone(880, 0.12, { type: 'triangle', gain: 0.14, when: 0.08 }); buzz(15); },
  tick() { tone(1200, 0.03, { type: 'square', gain: 0.05 }); },
  penalty() { tone(110, 0.35, { type: 'sawtooth', gain: 0.22, slideTo: 70 }); tone(116, 0.35, { type: 'sawtooth', gain: 0.18, slideTo: 74 }); buzz([30, 40, 30]); },
  skip() { tone(520, 0.08, { type: 'square', gain: 0.1 }); tone(330, 0.16, { type: 'square', gain: 0.1, when: 0.08 }); },
  reverse() { tone(420, 0.2, { type: 'triangle', gain: 0.16, slideTo: 840 }); tone(840, 0.2, { type: 'triangle', gain: 0.12, when: 0.2, slideTo: 420 }); },
  ace() { [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'triangle', gain: 0.16, when: i * 0.06 })); },
  niko() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.28, { type: 'sine', gain: 0.2, when: i * 0.09 })); buzz([20, 30, 20]); },
  error() { tone(200, 0.12, { type: 'square', gain: 0.1 }); tone(160, 0.16, { type: 'square', gain: 0.1, when: 0.1 }); buzz(60); },
  star() { tone(300, 0.3, { type: 'sawtooth', gain: 0.14, slideTo: 120 }); buzz([60, 40, 60]); },
  out() { tone(220, 0.5, { type: 'sawtooth', gain: 0.16, slideTo: 60 }); },
  win() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, { type: 'triangle', gain: 0.22, when: i * 0.11 }));
    tone(262, 1.0, { type: 'sine', gain: 0.18, when: 0.5 });
    buzz([40, 50, 40, 50, 120]);
  },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.18, when: i * 0.2 })); },
};

export function sfx(name) {
  if (!enabled) return;
  unlock();
  const f = SFX[name];
  if (f && ctx) { try { f(); } catch (e) { /* ignore */ } }
}
