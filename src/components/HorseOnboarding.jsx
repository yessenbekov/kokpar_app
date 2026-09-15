import { useState } from "react";
import { COAT_PRESETS, HORSE_TYPES, coatPresetById } from "../game/horseTypes.js";

const TOTAL_STEPS = 3;
const SUGGESTED_NAMES = ["Алмас_07", "Серке_Ханы", "Батыр", "Тулпар_2", "Жорға"];

export function HorseOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem("kokpar_lang") || "ru"; } catch { return "ru"; }
  });
  const [riderName, setRiderName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState(HORSE_TYPES[0].id);
  const [horseName, setHorseName] = useState("");
  const [selectedCoatId, setSelectedCoatId] = useState(HORSE_TYPES[0].defaultCoatId);

  function selectHorseType(id) {
    const ht = HORSE_TYPES.find((h) => h.id === id) ?? HORSE_TYPES[0];
    setSelectedTypeId(ht.id);
    setSelectedCoatId(ht.defaultCoatId);
  }

  function handleComplete() {
    try { localStorage.setItem("kokpar_lang", language); } catch {}
    onComplete(selectedTypeId, horseName.trim() || null, riderName.trim() || null, selectedCoatId, language);
  }

  const lang = language;
  function tl(ru, kz, en) {
    if (lang === "kz") return kz ?? ru;
    if (lang === "en") return en ?? ru;
    return ru;
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else handleComplete();
  }

  return (
    <div className="ob-wizard" role="dialog" aria-modal="true" aria-label="Настройка профиля">
      <div className="ob-progress">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`ob-progress-seg${i <= step ? " ob-progress-seg--active" : ""}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="ob-header">
            <div className="ob-step-label">Шаг 1 из {TOTAL_STEPS}</div>
            <div className="ob-step-title">Тіл · Язык · Language</div>
            <div className="ob-step-desc">Интерфейс и комментарий матча. Можно сменить в настройках.</div>
          </div>
          <div className="ob-body">
            <button
              type="button"
              className={`ob-lang-card${language === "kz" ? " ob-lang-card--selected" : ""}`}
              onClick={() => setLanguage("kz")}
            >
              <span className="ob-lang-code">ҚАЗ</span>
              <div className="ob-lang-text">
                <div className="ob-lang-name">Қазақша</div>
                <div className="ob-lang-desc">Толық аударма · дауыстық түсініктеме</div>
              </div>
              {language === "kz" && <span className="ob-check-circle">✓</span>}
            </button>
            <button
              type="button"
              className={`ob-lang-card${language === "ru" ? " ob-lang-card--selected" : ""}`}
              onClick={() => setLanguage("ru")}
            >
              <span className="ob-lang-code">РУС</span>
              <div className="ob-lang-text">
                <div className="ob-lang-name">Русский</div>
                <div className="ob-lang-desc">Полный перевод · озвучка комментатора</div>
              </div>
              {language === "ru" && <span className="ob-check-circle">✓</span>}
            </button>
            <button
              type="button"
              className={`ob-lang-card${language === "en" ? " ob-lang-card--selected" : ""}`}
              onClick={() => setLanguage("en")}
            >
              <span className="ob-lang-code">ENG</span>
              <div className="ob-lang-text">
                <div className="ob-lang-name">English</div>
                <div className="ob-lang-desc">Full translation · commentary voice</div>
              </div>
              {language === "en" && <span className="ob-check-circle">✓</span>}
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="ob-header">
            <div className="ob-step-label">{tl("Шаг 2 из", "Қадам 2 /", "Step 2 of")} {TOTAL_STEPS}</div>
            <div className="ob-step-title">{tl("Кто вы на поле", "Далада кімсіз", "Who are you on the field")}</div>
          </div>
          <div className="ob-body">
            <div className="ob-field-group">
              <div className="ob-field-label">{tl("Имя всадника", "Салт атшының аты", "Rider name")}</div>
              <input
                className="ob-rider-name-input"
                type="text"
                placeholder={tl("Алмас", "Алмас", "Almas")}
                maxLength={24}
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
              />
              <div className="ob-suggestions">
                {SUGGESTED_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="ob-suggestion-pill"
                    onClick={() => setRiderName(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="ob-header">
            <div className="ob-step-label">{tl("Шаг 3 из", "Қадам 3 /", "Step 3 of")} {TOTAL_STEPS}</div>
            <div className="ob-step-title">{tl("Выберите коня", "Жылқы таңдаңыз", "Choose your horse")}</div>
            <div className="ob-step-desc">{tl("Один конь достаётся бесплатно. Остальные стойла откроете за монеты.", "Бір жылқы тегін беріледі. Қалған орындарды монетаға ашасыз.", "One horse is free. Unlock more stalls with coins.")}</div>
          </div>
          <div className="ob-body">
            {HORSE_TYPES.map((ht) => {
              const isSelected = ht.id === selectedTypeId;
              const coat = coatPresetById(isSelected ? selectedCoatId : ht.defaultCoatId);
              return (
                <button
                  key={ht.id}
                  type="button"
                  className={`ob-horse-card${isSelected ? " ob-horse-card--selected" : ""}`}
                  onClick={() => selectHorseType(ht.id)}
                >
                  <div
                    className="ob-horse-thumb"
                    style={{ background: `linear-gradient(150deg, ${coat.coat}, ${coat.dark})` }}
                  />
                  <div className="ob-horse-info">
                    <div className="ob-horse-title">{ht.name} · {ht.role}</div>
                    <div className="ob-horse-desc">{ht.description}</div>
                  </div>
                  {isSelected && <span className="ob-check-circle">✓</span>}
                </button>
              );
            })}

            <div className="ob-coat-picker">
              <div className="ob-field-label">{tl("Масть", "Жүн", "Coat")}</div>
              <div className="ob-coat-swatches">
                {COAT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`ob-coat-swatch${selectedCoatId === preset.id ? " ob-coat-swatch--active" : ""}`}
                    style={{ background: preset.coat }}
                    title={preset.label}
                    aria-label={preset.label}
                    aria-pressed={selectedCoatId === preset.id}
                    onClick={() => setSelectedCoatId(preset.id)}
                  />
                ))}
              </div>
            </div>

            <div className="ob-field-group">
              <div className="ob-field-label">{tl("Имя коня", "Жылқының аты", "Horse name")}</div>
              <input
                className="ob-rider-name-input"
                type="text"
                placeholder={HORSE_TYPES.find((h) => h.id === selectedTypeId)?.name ?? "Құлагер"}
                maxLength={24}
                value={horseName}
                onChange={(e) => setHorseName(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="ob-footer">
        <button className="ob-continue-btn" type="button" onClick={next}>
          {step < TOTAL_STEPS - 1 ? tl("Продолжить", "Жалғастыру", "Continue") : tl("Начать путь", "Жолды бастау", "Start journey")}
        </button>
        {step === 0 && (
          <button className="ob-skip-btn" type="button" onClick={handleComplete}>
            {tl("Пропустить", "Өткізіп жіберу", "Skip")}
          </button>
        )}
        {step > 0 && (
          <button className="ob-skip-btn" type="button" onClick={() => setStep((s) => s - 1)}>
            ‹ {tl("Назад", "Артқа", "Back")}
          </button>
        )}
      </div>
    </div>
  );
}
