// UI sounds — click.wav for menu buttons, synthesized fanfare for match start
let ctx = null;
let noiseBuf = null;
let clickBuf = null; // decoded click.wav
let clickBufFailed = false;

function getCtx() {
  if (ctx) return ctx;
  const Cls = window.AudioContext ?? window.webkitAudioContext;
  if (!Cls) return null;
  ctx = new Cls();

  // Noise buffer for synthesized fallback
  const len = Math.floor(ctx.sampleRate * 0.1);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  // Load click.wav
  if (!clickBufFailed) {
    fetch("/sounds/click.wav")
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => { clickBuf = buf; })
      .catch(() => { clickBufFailed = true; });
  }

  return ctx;
}

function vol() {
  try { return Math.max(0, Math.min(100, Number(localStorage.getItem("kokpar_sfx") ?? "78"))) / 100; }
  catch { return 0.78; }
}

function playSample(c, buf, v) {
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  gain.gain.value = v;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
}

function synthClick(c, v) {
  const t = c.currentTime;
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
}

export function playMenuClick() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = vol();
  if (v <= 0) return;

  if (clickBuf) {
    playSample(c, clickBuf, v);
  } else {
    synthClick(c, v);
  }
}

// Back/cancel — same click at slightly lower pitch (pitch-shifted via playbackRate)
export function playMenuBack() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = vol();
  if (v <= 0) return;

  if (clickBuf) {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = clickBuf;
    src.playbackRate.value = 0.75; // lower pitch = "back" feel
    gain.gain.value = v * 0.8;
    src.connect(gain);
    gain.connect(c.destination);
    src.start();
  } else {
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
}

// Ascending fanfare on match start (always synthesized — more epic)
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
