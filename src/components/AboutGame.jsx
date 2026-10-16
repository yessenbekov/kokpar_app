import { useState, useEffect } from "react";
import { isInPwa, isIos, isAndroid, getInstallPrompt, onInstallPromptAvailable } from "../app/pwa.js";
import { supabase } from "../app/supabaseClient.js";

const WAIT_FULL_KEY = "kokpar_wait_full";

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

export function AboutGame({ t, onBack, auth }) {
  const [waitFull, setWaitFull] = useState(() => lsGet(WAIT_FULL_KEY) === "1");
  const [copied, setCopied] = useState(null); // "card" | "email"
  const [installTab, setInstallTab] = useState(() => isIos() ? "ios" : "android");
  const [installPrompt, setInstallPrompt] = useState(() => getInstallPrompt());
  const [installing, setInstalling] = useState(false);
  const inPwa = isInPwa();

  useEffect(() => {
    return onInstallPromptAvailable((e) => setInstallPrompt(e));
  }, []);

  async function handleWaitFull() {
    if (waitFull) return;
    lsSet(WAIT_FULL_KEY, "1");
    setWaitFull(true);
    if (auth?.status === "signed-in" && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").upsert(
            { user_id: user.id, waits_full_version: true },
            { onConflict: "user_id", ignoreDuplicates: false }
          );
        }
      } catch {}
    }
  }

  function copyText(text, which) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(which);
    setTimeout(() => setCopied(null), 1600);
  }

  async function handleAndroidInstall() {
    if (!installPrompt) return;
    setInstalling(true);
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstalling(false);
  }

  return (
    <div className="tab-pane about-page">
      {/* Left column: header + hero + wait button (landscape: sticky; portrait: inline) */}
      <div className="about-left-col">
        <div className="wizard-step-header">
          <button type="button" className="wizard-back-btn" onClick={onBack}>‹</button>
          <span className="wizard-step-title">{t("Об игре", "Ойын туралы", "About")}</span>
        </div>
        <div className="about-hero">
          <div className="about-hero-img" />
          <div className="about-hero-overlay" />
          <div className="about-hero-content">
            <div className="about-hero-badge">◆ {t("ВЕБ-ВЕРСИЯ · РАННИЙ ДОСТУП", "ВЕБ-НҰСҚА · ЕРТЕ ҚОЛЖЕТІМДІЛІК", "WEB VERSION · EARLY ACCESS")}</div>
            <div className="about-hero-title">{t("Это только начало", "Бұл тек басталуы", "This is just the beginning")}</div>
            <p className="about-hero-text">
              {t(
                "Вы играете в лёгкую браузерную версию Көкпар. Полноценная игра сейчас в разработке.",
                "Сіз Көкпардың жеңіл браузерлік нұсқасын ойнайсыз. Толық ойын қазір әзірленуде.",
                "You're playing the lightweight browser version of Kokpar. The full game is in development."
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`about-wait-btn${waitFull ? " about-wait-btn--done" : ""}`}
          onClick={handleWaitFull}
        >
          {waitFull
            ? t("Вы в списке ✓ — сообщим о релизе", "Тізімдесіз ✓ — шығарылым туралы хабарлаймыз", "You're on the list ✓ — we'll notify you")
            : t("ЖДУ ПОЛНУЮ ВЕРСИЮ", "ТОЛЫҚ НҰСҚАНЫ КҮТЕМІН", "WAITING FOR FULL VERSION")}
        </button>
      </div>

      {/* Right column: scrollable sections */}
      <div className="about-scroll">

        {/* 2. Why */}
        <div className="about-section-label">{t("ЗАЧЕМ ЭТА ВЕРСИЯ", "БҰЛ НҰСҚА НЕ ҮШІН", "WHY THIS VERSION")}</div>
        <p className="about-body-text">
          {t(
            "Хочу понять, нужен ли людям цифровой көкпар, прежде чем вкладывать годы в большую игру. Каждый ваш матч, отзыв и нажатие кнопки ниже — сигнал, что продолжать стоит.",
            "Үлкен ойынға жылдарды салмай, адамдарға цифрлық көкпар керек пе екенін түсінгім келеді. Матчыңыз, пікіріңіз және төмендегі батырманы басуыңыз — жалғастыру керек деген сигнал.",
            "I want to know if people need digital kokpar before investing years in a full game. Every match, review, and button press below is a signal that it's worth continuing."
          )}
        </p>

        {/* 3. Full version features */}
        <div className="about-section-label">{t("ЧТО БУДЕТ В ПОЛНОЙ ВЕРСИИ", "ТОЛЫҚ НҰСҚАДА НЕ БОЛАДЫ", "WHAT'S IN THE FULL VERSION")}</div>
        <div className="about-features-card">
          {[
            t("Заметно лучше графика: детальные лошади, арены, свет", "Әлдеқайда жақсы графика: егжей-тегжейлі жылқылар, арена, жарық", "Much better graphics: detailed horses, arenas, lighting"),
            t("Прокачка как в World of Tanks: играете матчи и открываете новых лошадей, снаряжение и уровни по дереву развития", "World of Tanks сияқты жетілдіру: матч ойнап жаңа жылқылар, жабдықтар мен даму ағашын ашасыз", "Progression like World of Tanks: play matches and unlock new horses, gear, and skill trees"),
            t("Онлайн-матчи с друзьями и рейтинг", "Достармен онлайн матчтар және рейтинг", "Online matches with friends and rankings"),
            t("Больше пород лошадей, арен и снаряжения", "Көбірек жылқы тұқымдары, арена мен жабдықтар", "More horse breeds, arenas, and gear"),
            t("Приложения для iOS и Android", "iOS және Android қосымшалары", "iOS and Android apps"),
          ].map((item, i) => (
            <div key={i} className="about-feature-item">
              <span className="about-feature-diamond">◆</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* 4. Who makes it */}
        <div className="about-section-label">{t("КТО ДЕЛАЕТ", "КІМ ЖАСАЙДЫ", "WHO MAKES IT")}</div>
        <div className="about-maker-card">
          <div className="about-maker-photo">
            <div className="about-maker-photo-placeholder">Фото</div>
          </div>
          <div className="about-maker-info">
            <div className="about-maker-name">Талгат</div>
            <div className="about-maker-role">{t("Один разработчик · код, графика, звук", "Бір әзірлеуші · код, графика, дыбыс", "Solo developer · code, art, sound")}</div>
          </div>
        </div>
        <p className="about-body-text">
          {t(
            "Делаю Көкпар в свободное время, без студии и инвесторов. Поэтому обновления выходят не так часто, как хочется, а каждое мнение игрока доходит напрямую до меня.",
            "Бос уақытымда студиясыз және инвесторсыз Көкпар жасаймын. Сондықтан жаңартулар жиі шықпайды, бірақ әр ойыншының пікірі тікелей маған жетеді.",
            "I make Kokpar in my free time, without a studio or investors. Updates come slower than I'd like, but every player's opinion reaches me directly."
          )}
        </p>

        {/* 5. Install — hidden in PWA */}
        {!inPwa && (
          <>
            <div className="about-section-label about-section-label--install">
              {t("УСТАНОВИТЬ НА ТЕЛЕФОН", "ТЕЛЕФОНҒА ОРНАТУ", "INSTALL ON PHONE")}
              <span className="about-install-hint">{t("скрыто, если уже установлено", "орнатылса жасырылады", "hidden if already installed")}</span>
            </div>
            <div className="about-install-card">
              <div className="about-install-top">
                <img src="/icons/icon-192.png" className="about-install-icon" alt="Кокпар" />
                <span className="about-install-desc">
                  {t("Иконка на экране, полный экран без адресной строки, быстрый запуск.", "Экрандағы белгіше, толық экран, жылдам іске қосу.", "Icon on screen, fullscreen, fast launch.")}
                </span>
              </div>
              <div className="about-install-tabs">
                <button
                  type="button"
                  className={`about-install-tab${installTab === "ios" ? " active" : ""}`}
                  onClick={() => setInstallTab("ios")}
                >iPhone</button>
                <button
                  type="button"
                  className={`about-install-tab${installTab === "android" ? " active" : ""}`}
                  onClick={() => setInstallTab("android")}
                >Android</button>
              </div>

              {installTab === "ios" ? (
                <div className="about-install-steps">
                  {[
                    <>{t("Откройте", "Ашыңыз", "Open")} <strong>kokpar.online</strong> {t("в", "браузерінде", "in")} <strong>Safari</strong></>,
                    t("Нажмите «Поделиться» — квадрат со стрелкой вверх", "«Бөлісу» батырмасын басыңыз — жоғары бағытталған жебесі бар шаршы", "Tap \"Share\" — square with arrow pointing up"),
                    t("Выберите «На экран «Домой»» → «Добавить»", "«Басты экранға» тармағын таңдаңыз → «Қосу»", "Select \"Add to Home Screen\" → \"Add\""),
                  ].map((step, i) => (
                    <div key={i} className="about-install-step">
                      <span className="about-install-num">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="about-android-section">
                  <button
                    type="button"
                    className="about-android-install-btn"
                    onClick={handleAndroidInstall}
                    disabled={installing || !installPrompt}
                  >
                    {installing
                      ? t("Устанавливаем…", "Орнатылуда…", "Installing…")
                      : t("Установить приложение", "Қосымшаны орнату", "Install app")}
                  </button>
                  <p className="about-android-hint">
                    {t(
                      "Кнопки нет или не сработала? В Chrome: меню ⋮ → «Добавить на главный экран» → «Установить».",
                      "Батырма жоқ немесе жұмыс істемеді? Chrome-да: мәзір ⋮ → «Басты экранға қосу» → «Орнату».",
                      "Button missing or didn't work? In Chrome: menu ⋮ → \"Add to Home Screen\" → \"Install\"."
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* 6. Support / Donate */}
        <div className="about-donate-card">
          <div className="about-donate-glow" />
          <div className="about-section-label" style={{ margin: 0 }}>{t("Помочь проекту", "Жобаға көмектесу", "Support the project")}</div>
          <p className="about-body-text" style={{ margin: "8px 0 12px" }}>
            {t(
              "Если хотите поддержать разработку, можно перевести любую сумму на карту. Деньги идут на серверы, модели, музыку и время на полную версию.",
              "Әзірлеуді қолдағыңыз келсе, кез келген соманы картаға аударуға болады. Ақша серверлерге, модельдерге, музыкаға және толық нұсқаға жұмсалады.",
              "If you'd like to support development, you can transfer any amount to the card. Money goes to servers, models, music, and time for the full version."
            )}
          </p>
          <div className="about-card-block">
            <div className="about-card-header">
              <span className="about-card-label">{t("НОМЕР КАРТЫ", "КАРТА НӨМІРІ", "CARD NUMBER")}</span>
              <span className="about-card-name">Талгат Е.</span>
            </div>
            <div className="about-card-number">4400 4302 9438 5213</div>
            <button
              type="button"
              className="about-copy-btn"
              onClick={() => copyText("4400430294385213", "card")}
            >
              {copied === "card" ? t("Скопировано ✓", "Көшірілді ✓", "Copied ✓") : t("Скопировать", "Көшіру", "Copy")}
            </button>
          </div>
          <p className="about-donate-disclaimer">
            {t(
              "Это добровольная поддержка: она не даёт игрового преимущества.",
              "Бұл ерікті қолдау: ол ойындағы артықшылық бермейді.",
              "This is voluntary support: it gives no in-game advantage."
            )}
          </p>
        </div>

        {/* 7. Contact */}
        <div className="about-section-label">{t("СВЯЗЬ", "БАЙЛАНЫС", "CONTACT")}</div>
        <div className="about-contact-card">
          <a href="mailto:talgat.yessenbekov@gmail.com" className="about-contact-email">
            talgat.yessenbekov@gmail.com
          </a>
          <p className="about-contact-sub">{t("Ошибки, идеи, отзывы, сотрудничество", "Қателер, идеялар, пікірлер, ынтымақтастық", "Bugs, ideas, feedback, collaboration")}</p>
          <button
            type="button"
            className="about-copy-btn about-copy-btn--email"
            onClick={() => copyText("talgat.yessenbekov@gmail.com", "email")}
          >
            {copied === "email" ? t("Скопировано ✓", "Көшірілді ✓", "Copied ✓") : t("Скопировать", "Көшіру", "Copy")}
          </button>
        </div>
        <a
          href="https://instagram.com/kokpar.online"
          target="_blank"
          rel="noopener noreferrer"
          className="about-instagram-card"
        >
          <span className="about-instagram-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
            </svg>
          </span>
          <span className="about-instagram-body">
            <span className="about-instagram-handle">@kokpar.online</span>
            <span className="about-instagram-sub">{t("Instagram игры · новости и процесс разработки", "Ойын Instagram-ы · жаңалықтар мен әзірлеу процесі", "Game Instagram · news and dev process")}</span>
          </span>
          <span className="about-instagram-arrow">›</span>
        </a>

        {/* 8. Brand / Sponsor */}
        <div className="about-sponsor-card">
          <div className="about-section-label" style={{ margin: 0 }}>{t("Ваш бренд на арене", "Арнадағы брендіңіз", "Your brand on the arena")}</div>
          <p className="about-body-text" style={{ margin: "8px 0 12px" }}>
            {t(
              "Рекламные щиты вокруг поля открыты для спонсоров. Напишите на почту.",
              "Алаң айналасындағы жарнама тақталары демеушілер үшін ашық. Поштаға жазыңыз.",
              "Advertising boards around the field are open for sponsors. Write to us."
            )}
          </p>
          <a
            href="mailto:talgat.yessenbekov@gmail.com?subject=Спонсорство Көкпар"
            className="about-sponsor-btn"
          >
            {t("Написать", "Жазу", "Write")}
          </a>
        </div>

        {/* 9. Footer */}
        <div className="about-footer">
          kokpar ◆ online · {t("веб-версия", "веб-нұсқа", "web version")}
        </div>

      </div>{/* /about-scroll */}
    </div>
  );
}
