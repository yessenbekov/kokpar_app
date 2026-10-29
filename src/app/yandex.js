let ysdk = null;

export async function initYandex() {
  if (typeof YaGames === "undefined") return;
  try {
    ysdk = await YaGames.init();
    ysdk.features.LoadingAPI?.ready();
  } catch (e) {
    // not on Yandex Games — ignore
  }
}

export function yandexAdAfterMatch(onResume) {
  if (!ysdk) { onResume?.(); return; }
  ysdk.adv.showFullscreenAdv({
    callbacks: {
      onClose: () => onResume?.(),
      onError: () => onResume?.(),
    },
  });
}
