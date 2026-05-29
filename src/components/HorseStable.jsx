import { Gauge } from "lucide-react";
import { HORSE_TYPES, horseTypeById } from "../game/horseTypes.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ratingFor(score) {
  return Math.round(clamp(score * 72, 45, 96));
}

function statRowsFor(horse) {
  const stats = horse.stats;

  return [
    { label: "Скорость", score: stats.speed },
    { label: "Разгон", score: stats.acceleration },
    { label: "Контроль", score: (stats.turn + stats.grip + stats.brake) / 3 },
    { label: "Сила", score: (stats.contestPower + stats.tacklePower + stats.bodyCheckPower + stats.stability) / 4 },
    { label: "Выносливость", score: (1 / stats.staminaDrain + stats.staminaRecovery) / 2 },
    { label: "Серке", score: (stats.carrySpeed + stats.contestPower) / 2 }
  ];
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

function HorseToken({ horse }) {
  return (
    <span className="horse-token" style={paletteStyle(horse)} aria-hidden="true">
      <span className="horse-token-body" />
      <span className="horse-token-head" />
      <span className="horse-token-mark" />
    </span>
  );
}

export function HorseStable({ horseType, onHorseChange }) {
  const selectedHorse = horseTypeById(horseType);
  const statRows = statRowsFor(selectedHorse);

  return (
    <div className="stable-layout">
      <div className="stable-roster setting-group" aria-label="Конюшня">
        <div className="setting-title">
          <Gauge size={17} strokeWidth={2.4} />
          <span>Лошадь</span>
        </div>
        <div className="stable-horse-list">
          {HORSE_TYPES.map((horse) => (
            <button
              className={selectedHorse.id === horse.id ? "stable-card active" : "stable-card"}
              type="button"
              key={horse.id}
              onClick={() => onHorseChange(horse.id)}
            >
              <HorseToken horse={horse} />
              <span className="stable-card-copy">
                <strong>{horse.name}</strong>
                <span>{horse.role}</span>
              </span>
              <span className="horse-tier">{horse.tier}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="stable-detail" style={paletteStyle(selectedHorse)} aria-label={selectedHorse.name}>
        <div className="stable-detail-head">
          <HorsePreview horse={selectedHorse} />
          <div className="stable-copy">
            <p className="label">{selectedHorse.role}</p>
            <h2>{selectedHorse.name}</h2>
            <p>{selectedHorse.description}</p>
            <div className="horse-tags" aria-label="Профиль лошади">
              <span>{selectedHorse.stable.line}</span>
              <span>{selectedHorse.stable.temperament}</span>
              <span>{selectedHorse.stable.specialty}</span>
            </div>
          </div>
        </div>

        <div className="stable-stats" aria-label="Характеристики лошади">
          {statRows.map((row) => {
            const rating = ratingFor(row.score);

            return (
              <div className="stable-stat" key={row.label}>
                <span>{row.label}</span>
                <i>
                  <b style={{ "--value": `${rating}%` }} />
                </i>
                <strong>{rating}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
