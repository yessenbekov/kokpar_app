// PWA detection helpers + global beforeinstallprompt capture

export function isInPwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

let _deferredPrompt = null;
const _listeners = new Set();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredPrompt = e;
  for (const fn of _listeners) fn(e);
});

export function getInstallPrompt() {
  return _deferredPrompt;
}

export function onInstallPromptAvailable(fn) {
  _listeners.add(fn);
  if (_deferredPrompt) fn(_deferredPrompt);
  return () => _listeners.delete(fn);
}
