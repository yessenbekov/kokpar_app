import { useState, useEffect } from "react";
import { isInPwa, isIos, isAndroid } from "../app/pwa.js";

const DISMISSED_KEY = "pwa_install_dismissed";

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Never show if already in PWA
    if (isInPwa()) return;
    // Never show if user permanently dismissed
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    // Only show on mobile
    if (!isIos() && !isAndroid()) return;

    // For Android: wait for beforeinstallprompt
    if (isAndroid()) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      // Show instructions banner even without beforeinstallprompt after short delay
      const timer = setTimeout(() => setVisible(true), 1800);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(timer);
      };
    }

    // For iOS: show after short delay
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
            <div className="pwa-modal-heading">Поставьте игру на экран «Домой»</div>
            <div className="pwa-modal-sub">
              Полный экран без адресной строки, быстрый запуск с иконки
            </div>
          </div>
        </div>

        {ios ? (
          <div className="pwa-steps">
            <div className="pwa-step">
              <span className="pwa-step-num">1</span>
              <span>
                Нажмите{" "}
                <span className="pwa-share-icon" aria-label="Share">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#f0c347" strokeWidth="2"/>
                    <path d="M12 3v11M9 6l3-3 3 3" stroke="#f0c347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>{" "}
                «Поделиться» в Safari
              </span>
            </div>
            <div className="pwa-step">
              <span className="pwa-step-num">2</span>
              <span>
                Выберите{" "}
                <span className="pwa-badge">
                  <span className="pwa-plus">+</span>
                  На экран «Домой»
                </span>
              </span>
            </div>
            <div className="pwa-step">
              <span className="pwa-step-num">3</span>
              <span>Подтвердите «Добавить» и открывайте игру с иконки</span>
            </div>
          </div>
        ) : (
          <div className="pwa-android-hint">
            Установите как приложение — быстрый запуск, полный экран, работает без браузера
          </div>
        )}

        <div className="pwa-actions">
          {ios ? (
            <button className="pwa-btn-primary" onClick={dismissForever}>
              Понятно
            </button>
          ) : (
            <button className="pwa-btn-primary" onClick={handleAndroidInstall} disabled={installing}>
              {installing ? "Устанавливаем…" : "Установить"}
            </button>
          )}
          <button className="pwa-btn-secondary" onClick={dismissSession}>
            Играть в браузере
          </button>
        </div>
      </div>
    </div>
  );
}
