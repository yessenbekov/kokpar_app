export function gdAdAfterMatch(onResume) {
  if (typeof gdsdk === "undefined") { onResume?.(); return; }
  gdsdk.showAd(gdsdk.AdType?.Interstitial || "interstitial")
    .then(() => onResume?.())
    .catch(() => onResume?.());
}
