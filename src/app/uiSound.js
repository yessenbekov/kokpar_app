// Light UI click / tap sounds for menu buttons
let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  const Cls = window.AudioContext ?? window.webkitAudioContext;
  if (!Cls) return null;
  ctx = new Cls();
  return ctx;
}

function sfxVol() {
  try { return Math.max(0, Math.min(100, Number(localStorage.getItem("kokpar_sfx") ?? "78"))) / 100; }
  catch { return 0.78; }
}

function tone(c, freq, startTime, dur, gain) {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.001, startTime);
  env.gain.exponentialRampToValueAtTime(gain, startTime + 0.006);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.02);
}

export function playMenuClick() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = sfxVol();
  if (v <= 0) return;
  tone(c, 720, c.currentTime, 0.05, 0.07 * v);
  tone(c, 960, c.currentTime + 0.018, 0.04, 0.04 * v);
}

export function playMenuBack() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = sfxVol();
  if (v <= 0) return;
  tone(c, 520, c.currentTime, 0.05, 0.06 * v);
  tone(c, 380, c.currentTime + 0.018, 0.04, 0.04 * v);
}

export function playMatchStart() {
  const c = getCtx();
  if (!c || c.state === "suspended") return;
  const v = sfxVol();
  if (v <= 0) return;
  [0, 0.10, 0.20].forEach((delay, i) => {
    const freqs = [392, 523, 659];
    tone(c, freqs[i], c.currentTime + delay, 0.18, 0.12 * v);
  });
}
