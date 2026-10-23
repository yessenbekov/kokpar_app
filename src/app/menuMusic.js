// Procedural ambient menu music — Cm pentatonic, dombra-style plucks
// Uses Web Audio API lookahead scheduling, no audio files needed

let ctx = null;
let masterGain = null;
let droneNodes = [];
let isPlaying = false;
let scheduleHandle = null;
let nextNoteTime = 0;
let patternStep = 0;
let currentVol = 0.42;

// C minor pentatonic: C2, G2 drone + C3..C4 melody
const MELODY = [
  // [noteHz, durationBeats, envGain]
  [174.61, 0.5, 0.18], // F3
  [null,   0.5, 0],
  [196.00, 0.5, 0.16], // G3
  [null,   0.5, 0],
  [261.63, 1.0, 0.20], // C4
  [null,   0.5, 0],
  [196.00, 0.5, 0.15], // G3
  [174.61, 1.0, 0.17], // F3
  [null,   1.0, 0],
  [130.81, 0.5, 0.13], // C3
  [null,   0.5, 0],
  [155.56, 0.5, 0.15], // Eb3
  [174.61, 0.5, 0.14], // F3
  [null,   2.0, 0],
  [233.08, 0.5, 0.16], // Bb3
  [null,   0.5, 0],
  [196.00, 0.5, 0.15], // G3
  [155.56, 1.0, 0.18], // Eb3
  [null,   1.5, 0],
  [130.81, 0.5, 0.12], // C3
  [155.56, 0.5, 0.13], // Eb3
  [196.00, 1.5, 0.19], // G3
  [null,   2.0, 0],
];

const BPM = 66;
const BEAT = 60 / BPM; // ~0.909 s/beat
const LOOKAHEAD_MS = 80;
const SCHEDULE_AHEAD_S = 0.15;

function ensureCtx() {
  if (ctx) return true;
  const Cls = window.AudioContext ?? window.webkitAudioContext;
  if (!Cls) return false;
  ctx = new Cls();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);
  return true;
}

function startDrones() {
  stopDrones();
  // Bass drone C2 + G2
  [[65.41, 0.035], [98.00, 0.020]].forEach(([freq, g]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = g;
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    droneNodes.push(osc, gain);
  });
}

function stopDrones() {
  droneNodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch {} });
  droneNodes = [];
}

function pluck(freq, startTime, durBeats, envGain) {
  if (!ctx || !masterGain) return;
  const dur = durBeats * BEAT;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.001, startTime);
  env.gain.exponentialRampToValueAtTime(envGain, startTime + 0.012);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + Math.max(dur * 0.85, 0.05));
  osc.connect(env);
  env.connect(masterGain);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.06);
}

function scheduleTick() {
  while (ctx && nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
    const [noteHz, durBeats, envGain] = MELODY[patternStep % MELODY.length];
    if (noteHz !== null) {
      pluck(noteHz, nextNoteTime, durBeats, envGain);
    }
    nextNoteTime += durBeats * BEAT;
    patternStep++;
  }
  if (isPlaying) {
    scheduleHandle = setTimeout(scheduleTick, LOOKAHEAD_MS);
  }
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
    nextNoteTime = ctx.currentTime + 0.6;
    patternStep = 0;
    scheduleTick();
  },

  stop() {
    isPlaying = false;
    if (scheduleHandle) { clearTimeout(scheduleHandle); scheduleHandle = null; }
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.6);
    }
    setTimeout(() => { if (!isPlaying) stopDrones(); }, 1200);
  },

  setVolume(vol) {
    currentVol = Math.max(0, Math.min(100, vol)) / 100;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(currentVol, ctx.currentTime, 0.15);
    }
  },

  // Prime AudioContext on first interaction without starting playback
  prime() {
    ensureCtx();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  },
};
