// Ambient menu music — Cm pentatonic, dombra + dooli drum, 80 BPM
// Web Audio API lookahead scheduling, no audio files

let ctx = null;
let masterGain = null;
let noiseBuf = null;
let isPlaying = false;
let handle = null;
let nextMelodyTime = 0;
let nextDrumTime = 0;
let melodyStep = 0;
let drumStep = 0;
let currentVol = 0.42;
let droneNodes = [];

const BPM = 80;
const B = 60 / BPM; // 0.75s per beat
const LOOK = 0.20;
const TICK_MS = 85;

// C minor pentatonic — indexes used in MELODY below
// 0=C2  1=G2  2=C3  3=Eb3  4=F3  5=G3  6=Bb3  7=C4  8=Eb4  9=G4
const N = [65.41, 98.00, 130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 392.00];

// 4-bar melody, each entry [noteIndex|null, durationBeats, envGain]
// Total = 16 beats exactly
const MELODY = [
  [null, 1.0, 0],   [4, 0.5, 0.22],  [null, 0.5, 0],  // bar 1, beats 1-2
  [5, 0.5, 0.20],   [null, 0.5, 0],  [7, 1.0, 0.26],  // bar 1, beats 3-4
  [null, 0.5, 0],   [5, 0.5, 0.20],  [4, 1.0, 0.22],  // bar 2, beats 1-2
  [null, 1.0, 0],   [2, 0.5, 0.17],  [null, 0.5, 0],  // bar 2, beats 3-4
  [null, 0.5, 0],   [3, 0.5, 0.19],  [4, 0.5, 0.18],  [null, 0.5, 0], // bar 3, beats 1-2
  [6, 1.0, 0.23],   [null, 0.5, 0],  [5, 0.5, 0.20],  // bar 3, beats 3-4
  [4, 0.5, 0.21],   [3, 0.5, 0.18],  [null, 0.5, 0],  [2, 0.5, 0.19], // bar 4, beats 1-2
  [2, 2.0, 0.22],                                      // bar 4, beats 3-4
];

function ensureCtx() {
  if (ctx) return true;
  const Cls = window.AudioContext ?? window.webkitAudioContext;
  if (!Cls) return false;
  ctx = new Cls();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  // Pre-generate noise buffer shared by all percussion (played via offset)
  const len = Math.floor(ctx.sampleRate * 0.15);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  return true;
}

function startDrones() {
  stopDrones();
  [[65.41, 0.045], [98.00, 0.022]].forEach(([freq, g]) => {
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gn.gain.value = g;
    osc.connect(gn);
    gn.connect(masterGain);
    osc.start();
    droneNodes.push(osc, gn);
  });
}

function stopDrones() {
  droneNodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch {} });
  droneNodes = [];
}

// Dombra-style pluck: triangle + 2nd harmonic, very fast decay
function pluck(freq, t, durSec, gain) {
  [[1, gain], [2, gain * 0.28]].forEach(([harmonic, g]) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq * harmonic;
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(g, t + 0.009);
    env.gain.exponentialRampToValueAtTime(0.001, t + Math.max(durSec * 0.75, 0.07));
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + durSec + 0.04);
  });
}

// Dooli kick: low sine sweep + low-pass noise transient
function kick(t) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(115, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.16);
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(0.52, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(env);
  env.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.25);

  if (noiseBuf) {
    const src = ctx.createBufferSource();
    const lpf = ctx.createBiquadFilter();
    const nEnv = ctx.createGain();
    src.buffer = noiseBuf;
    lpf.type = "lowpass";
    lpf.frequency.value = 260;
    nEnv.gain.setValueAtTime(0.001, t);
    nEnv.gain.exponentialRampToValueAtTime(0.28, t + 0.003);
    nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.038);
    src.connect(lpf);
    lpf.connect(nEnv);
    nEnv.connect(masterGain);
    src.start(t);
    src.stop(t + 0.05);
  }
}

// Dooli rim shot / off-beat accent
function rim(t) {
  if (!noiseBuf) return;
  const src = ctx.createBufferSource();
  const bpf = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noiseBuf;
  bpf.type = "bandpass";
  bpf.frequency.value = 2800;
  bpf.Q.value = 1.2;
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(0.09, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
  src.connect(bpf);
  bpf.connect(env);
  env.connect(masterGain);
  src.start(t);
  src.stop(t + 0.07);
}

// Hihat: high-pass noise burst
function hihat(t, g = 1.0) {
  if (!noiseBuf) return;
  const src = ctx.createBufferSource();
  const hpf = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noiseBuf;
  hpf.type = "highpass";
  hpf.frequency.value = 7500;
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(0.055 * g, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.042);
  src.connect(hpf);
  hpf.connect(env);
  env.connect(masterGain);
  src.start(t);
  src.stop(t + 0.05);
}

function scheduleTick() {
  const now = ctx.currentTime;

  // Melody scheduling
  while (nextMelodyTime < now + LOOK) {
    const [noteIdx, dur, gain] = MELODY[melodyStep % MELODY.length];
    if (noteIdx !== null) pluck(N[noteIdx], nextMelodyTime, dur * B, gain);
    nextMelodyTime += dur * B;
    melodyStep++;
  }

  // Drum scheduling (8th-note grid, 8 per bar)
  while (nextDrumTime < now + LOOK) {
    const b = drumStep % 8;
    // Kick on beats 1 and 3 (8th-note positions 0 and 4)
    if (b === 0 || b === 4) kick(nextDrumTime);
    // Rim on beats 2 and 4 (positions 2 and 6)
    if (b === 2 || b === 6) rim(nextDrumTime);
    // Hihat on every 8th note, louder on-beat
    hihat(nextDrumTime, b % 2 === 0 ? 0.85 : 0.5);

    nextDrumTime += B / 2;
    drumStep++;
  }

  if (isPlaying) handle = setTimeout(scheduleTick, TICK_MS);
}

export const menuMusic = {
  start(vol = 42) {
    if (isPlaying) return;
    if (!ensureCtx()) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    isPlaying = true;
    currentVol = Math.max(0, Math.min(100, vol)) / 100;
    masterGain.gain.setTargetAtTime(currentVol, ctx.currentTime, 0.8);
    startDrones();
    const startAt = ctx.currentTime + 0.35;
    nextMelodyTime = startAt;
    nextDrumTime = startAt;
    melodyStep = 0;
    drumStep = 0;
    scheduleTick();
  },

  stop() {
    isPlaying = false;
    if (handle) { clearTimeout(handle); handle = null; }
    if (masterGain && ctx) masterGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.6);
    setTimeout(() => { if (!isPlaying) stopDrones(); }, 1200);
  },

  setVolume(vol) {
    currentVol = Math.max(0, Math.min(100, vol)) / 100;
    if (masterGain && ctx) masterGain.gain.setTargetAtTime(currentVol, ctx.currentTime, 0.15);
  },

  prime() {
    ensureCtx();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  },
};
