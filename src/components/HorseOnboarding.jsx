import { useState } from "react";
import { HORSE_TYPES } from "../game/horseTypes.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ratingFor(score) {
  return Math.round(clamp(score * 72, 45, 96));
}

function paletteStyle(horse) {
  const palette = horse.palette.blue;
  return {
    "--coat": palette.coat,
    "--dark": palette.dark,
    "--muzzle": palette.muzzle,
    "--mark": palette.marking
  };
}

function HorsePreview({ horse }) {
  return (
    <div className="horse-portrait" style={paletteStyle(horse)} aria-hidden="true">
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

  const selectedHorse = HORSE_TYPES.find((ht) => ht.id === selectedTypeId) ?? HORSE_TYPES[0];

  function handleStart(event) {
    event.preventDefault();
    onComplete(selectedTypeId, horseName.trim() || null, riderName.trim() || null);
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
                onClick={() => setSelectedTypeId(ht.id)}
                aria-pressed={isSelected}
              >
                <HorsePreview horse={ht} />
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
