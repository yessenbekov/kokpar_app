// UI click sound — loaded from /sounds/click.wav
let ctx = null;
let clickBuf = null;
let loadStarted = false;

function getCtx() {
  if (ctx) return ctx;
  const Cls = window.AudioContext ?? window.webkitAudioContext;
  if (!Cls) return null;
  ctx = new Cls();
  return ctx;
}

function ensureLoaded() {
  if (loadStarted) return;
  loadStarted = true;
  const c = getCtx();
  if (!c) return;
  fetch("/sounds/click.wav")
    .then((r) => r.arrayBuffer())
    .then((ab) => c.decodeAudioData(ab))
    .then((buf) => { clickBuf = buf; })
    .catch(() => {});
}

function sfxVol() {
  try { return Math.max(0, Math.min(100, Number(localStorage.getItem("kokpar_sfx") ?? "78"))) / 100; }
  catch { return 0.78; }
}

export function playMenuClick() {
  ensureLoaded();
  const c = getCtx();
  if (!c || !clickBuf) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const v = sfxVol();
  if (v <= 0) return;
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = clickBuf;
  gain.gain.value = v;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
}
