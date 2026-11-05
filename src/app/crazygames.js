let cgSdk = null;

export async function initCG() {
  if (typeof window === "undefined" || !window.CrazyGames) return;
  try {
    await window.CrazyGames.SDK.init();
    cgSdk = window.CrazyGames.SDK;
  } catch (e) {}
}

export function cgAdAfterMatch(onResume) {
  if (!cgSdk) { onResume?.(); return; }
  cgSdk.ad.requestAd("midgame", {
    adStarted: () => {},
    adError: () => onResume?.(),
    adFinished: () => onResume?.(),
  });
}
