import { useState } from "react";
import { COAT_PRESETS, HORSE_TYPES, coatPresetById } from "../game/horseTypes.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ratingFor(score) {
  return Math.round(clamp(score * 72, 45, 96));
}

function paletteStyle(coat) {
  return {
    "--coat": coat.coat,
    "--dark": coat.dark,
    "--muzzle": coat.muzzle,
    "--mark": coat.marking
  };
}

function HorsePreview({ horse, coatId }) {
  const coat = coatPresetById(coatId ?? horse.defaultCoatId);
  return (
    <div className="horse-portrait" style={paletteStyle(coat)} aria-hidden="true">
      <span className="horse-preview-shadow" />
      <span className="horse-preview-leg front" />
      <span className="horse-preview-leg back" />
      <span className="horse-preview-body" />
      <span className="horse-preview-neck" />
      <span className="horse-preview-head" />
      <span className="horse-preview-mane" />
      <span className="horse-preview-tail" />
      <span className="horse-preview-mark" />
    </div>
  );
}

const ONBOARDING_STAT_ROWS = [
  { label: "Скорость", key: "speed" },
  { label: "Поворот", key: "turn" },
  { label: "Сила", key: "contestPower" }
];

export function HorseOnboarding({ onComplete }) {
  const [selectedTypeId, setSelectedTypeId] = useState(HORSE_TYPES[0].id);
  const [horseName, setHorseName] = useState("");
  const [riderName, setRiderName] = useState("");
  const [selectedCoatId, setSelectedCoatId] = useState(HORSE_TYPES[0].defaultCoatId);

  const selectedHorse = HORSE_TYPES.find((ht) => ht.id === selectedTypeId) ?? HORSE_TYPES[0];

  function selectHorseType(id) {
    const ht = HORSE_TYPES.find((h) => h.id === id) ?? HORSE_TYPES[0];
    setSelectedTypeId(ht.id);
    setSelectedCoatId(ht.defaultCoatId);
  }

  function handleStart(event) {
    event.preventDefault();
    onComplete(selectedTypeId, horseName.trim() || null, riderName.trim() || null, selectedCoatId);
  }

  return (
    <div className="horse-onboarding" role="dialog" aria-modal="true" aria-label="Выбор первого коня">
      <div className="horse-onboarding-card">
        <h2 className="horse-onboarding-title">Выбери своего первого коня</h2>
        <p className="horse-onboarding-subtitle">Каждый конь открывает свой стиль игры</p>

        <div className="onboarding-horse-grid">
          {HORSE_TYPES.map((ht) => {
            const isSelected = ht.id === selectedTypeId;
            return (
              <button
                key={ht.id}
                type="button"
                className={isSelected ? "onboarding-horse-card selected" : "onboarding-horse-card"}
                onClick={() => selectHorseType(ht.id)}
                aria-pressed={isSelected}
              >
                <HorsePreview horse={ht} coatId={isSelected ? selectedCoatId : ht.defaultCoatId} />
                <strong className="onboarding-horse-name">{ht.name}</strong>
                <span className="onboarding-horse-role">{ht.role}</span>
                <div className="onboarding-horse-stats">
                  {ONBOARDING_STAT_ROWS.map(({ label, key }) => {
                    const rating = ratingFor(ht.stats[key]);
                    return (
                      <div key={key} className="onboarding-stat-row">
                        <span className="onboarding-stat-label">{label}</span>
                        <div className="onboarding-stat-bar-wrap">
                          <div className="onboarding-stat-bar" style={{ "--value": `${rating}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="onboarding-horse-desc">{ht.description}</p>
              </button>
            );
          })}
        </div>

        <div className="coat-picker">
          <span className="coat-picker-label">Масть</span>
          {COAT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={selectedCoatId === preset.id ? "coat-swatch selected" : "coat-swatch"}
              style={{ background: preset.coat }}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={selectedCoatId === preset.id}
              onClick={() => setSelectedCoatId(preset.id)}
            />
          ))}
        </div>

        <form className="onboarding-inputs" onSubmit={handleStart}>
          <div className="onboarding-input-group">
            <label htmlFor="onboarding-rider-name">Имя всадника</label>
            <input
              id="onboarding-rider-name"
              type="text"
              placeholder="Шабандоз"
              maxLength={24}
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
            />
          </div>
          <div className="onboarding-input-group">
            <label htmlFor="onboarding-horse-name">Имя коня</label>
            <input
              id="onboarding-horse-name"
              type="text"
              placeholder={selectedHorse.name}
              maxLength={24}
              value={horseName}
              onChange={(e) => setHorseName(e.target.value)}
            />
          </div>
          <button type="submit" className="onboarding-start-btn">
            Начать путь
          </button>
        </form>
      </div>
    </div>
  );
}
