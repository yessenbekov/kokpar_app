// UI click / action sounds for menu buttons — satisfying game-quality tones
let ctx = null;
let noiseBuf = null;

function getCtx() {
  if (ctx) return ctx;
  const Cls = window.AudioContext ?? window.webkitAudioContext;
  if (!Cls) return null;
  ctx = new Cls();
  const len = Math.floor(ctx.sampleRate * 0.1);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function vol() {
  try { return Math.max(0, Math.min(100, Number(localStorage.getItem("kokpar_sfx") ?? "78"))) / 100; }
  catch { return 0.78; }
}

// Satisfying tap: bright "ting" sine + noise "tock"
export function playMenuClick() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = vol();
  if (v <= 0) return;
  const t = c.currentTime;

  // Tone
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(680, t + 0.055);
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(0.13 * v, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.11);

  // Noise tock
  if (noiseBuf) {
    const src = c.createBufferSource();
    const bpf = c.createBiquadFilter();
    const nEnv = c.createGain();
    src.buffer = noiseBuf;
    bpf.type = "bandpass";
    bpf.frequency.value = 1400;
    bpf.Q.value = 0.9;
    nEnv.gain.setValueAtTime(0.001, t);
    nEnv.gain.exponentialRampToValueAtTime(0.18 * v, t + 0.003);
    nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(bpf);
    bpf.connect(nEnv);
    nEnv.connect(c.destination);
    src.start(t);
    src.stop(t + 0.05);
  }
}

// Downward tone for back/cancel
export function playMenuBack() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = vol();
  if (v <= 0) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(340, t + 0.075);
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.11);
}

// Ascending fanfare when match starts
export function playMatchStart() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = vol();
  if (v <= 0) return;
  const t = c.currentTime;
  [[392, 0], [523, 0.09], [659, 0.18], [784, 0.27]].forEach(([freq, delay]) => {
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const st = t + delay;
    env.gain.setValueAtTime(0.001, st);
    env.gain.exponentialRampToValueAtTime(0.17 * v, st + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, st + 0.26);
    osc.connect(env);
    env.connect(c.destination);
    osc.start(st);
    osc.stop(st + 0.3);
  });
}
