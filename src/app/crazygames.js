let cgSdk = null;

export async function initCG() {
  if (typeof window === "undefined" || !window.CrazyGames) return;
  try {
    cgLoadingStart();
    await window.CrazyGames.SDK.init();
    cgSdk = window.CrazyGames.SDK;
  } catch (e) {}
}

export function cgLoadingStart() {
  try { window.CrazyGames?.SDK?.game?.loadingStart(); } catch (e) {}
}

export function cgLoadingStop() {
  try { cgSdk?.game?.loadingStop(); } catch (e) {}
}

export function cgGameplayStart() {
  try { cgSdk?.game?.gameplayStart(); } catch (e) {}
}

export function cgGameplayStop() {
  try { cgSdk?.game?.gameplayStop(); } catch (e) {}
}

export function cgAdAfterMatch(onResume) {
  if (!cgSdk) { onResume?.(); return; }
  cgSdk.ad.requestAd("midgame", {
    adStarted: () => cgGameplayStop(),
    adError: () => onResume?.(),
    adFinished: () => onResume?.(),
  });
}
