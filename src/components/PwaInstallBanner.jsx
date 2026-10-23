import { useState, useEffect } from "react";
import { isInPwa, isIos, isAndroid } from "../app/pwa.js";

const DISMISSED_KEY = "pwa_install_dismissed";

function getLang() {
  try { return localStorage.getItem("kokpar_lang") ?? "ru"; } catch { return "ru"; }
}
function t(ru, kz, en, ky) {
  const lang = getLang();
  if (lang === "ky") return ky ?? kz ?? ru;
  if (lang === "kz") return kz ?? ru;
  if (lang === "en") return en ?? ru;
  return ru;
}

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInPwa()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    if (!isIos() && !isAndroid()) return;

    if (isAndroid()) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      const timer = setTimeout(() => setVisible(true), 1800);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(timer);
      };
    }

    const timer = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  function dismissForever() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  function dismissSession() {
    setVisible(false);
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) {
      setVisible(false);
      return;
    }
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
    if (outcome === "accepted") {
      dismissForever();
    } else {
      setVisible(false);
    }
  }

  if (!visible) return null;

  const ios = isIos();

  return (
    <div className="pwa-overlay" onClick={dismissSession}>
      <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-modal-top">
          <div className="pwa-app-icon">
            <img src="/icons/icon-192.png" alt="Кокпар" />
          </div>
          <div className="pwa-modal-title">
            <div className="pwa-modal-heading">
              {t("Поставьте игру на экран «Домой»", "Ойынды «Бас экранға» орнатыңыз", "Add game to Home Screen")}
            </div>
            <div className="pwa-modal-sub">
              {t(
                "Полный экран без адресной строки, быстрый запуск с иконки",
                "Мекенжай жолынсыз толық экран, белгішеден жылдам іске қосу",
                "Full screen without address bar, quick launch from icon"
              )}
            </div>
          </div>
        </div>

        {ios ? (
          <div className="pwa-steps">
            <div className="pwa-step">
              <span className="pwa-step-num">1</span>
              <span>
                {t("Нажмите", "Басыңыз", "Tap")}{" "}
                <span className="pwa-share-icon" aria-label="Share">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#f0c347" strokeWidth="2"/>
                    <path d="M12 3v11M9 6l3-3 3 3" stroke="#f0c347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>{" "}
                {t("«Поделиться» в Safari", "Safari-дегі «Бөлісу»", "Share in Safari")}
              </span>
            </div>
            <div className="pwa-step">
              <span className="pwa-step-num">2</span>
              <span>
                {t("Выберите", "Таңдаңыз", "Select")}{" "}
                <span className="pwa-badge">
                  <span className="pwa-plus">+</span>
                  {t("На экран «Домой»", "«Бас экранға»", "Add to Home Screen")}
                </span>
              </span>
            </div>
            <div className="pwa-step">
              <span className="pwa-step-num">3</span>
              <span>{t("Подтвердите «Добавить» и открывайте игру с иконки", "«Қосу» батырмасын растаңыз және ойынды белгішеден ашыңыз", "Confirm Add and launch the game from the icon")}</span>
            </div>
          </div>
        ) : (
          <div className="pwa-android-hint">
            {t(
              "Установите как приложение — быстрый запуск, полный экран, работает без браузера",
              "Қолданба ретінде орнатыңыз — жылдам іске қосу, толық экран, браузерсіз жұмыс істейді",
              "Install as an app — quick launch, full screen, works without a browser"
            )}
          </div>
        )}

        <div className="pwa-actions">
          {ios ? (
            <button className="pwa-btn-primary" onClick={dismissForever}>
              {t("Понятно", "Түсінікті", "Got it")}
            </button>
          ) : (
            <button className="pwa-btn-primary" onClick={handleAndroidInstall} disabled={installing}>
              {installing ? t("Устанавливаем…", "Орнатылуда...", "Installing…") : t("Установить", "Орнату", "Install")}
            </button>
          )}
          <button className="pwa-btn-secondary" onClick={dismissSession}>
            {t("Играть в браузере", "Браузерде ойнау", "Play in browser")}
          </button>
        </div>
      </div>
    </div>
  );
}
