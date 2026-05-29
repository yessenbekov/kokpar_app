import { Gauge } from "lucide-react";
import { horseTypeById } from "../game/horseTypes.js";

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

export function HorseStable({ horseId, ownedHorses = [], onHorseChange }) {
  const stableHorses = ownedHorses.length > 0 ? ownedHorses : [];
  const selectedOwnedHorse = stableHorses.find((horse) => horse.id === horseId) ?? stableHorses[0];
  const selectedHorse = horseTypeById(selectedOwnedHorse?.typeId);
  const statRows = statRowsFor(selectedHorse);
  const xpProgress = selectedOwnedHorse ? clamp(selectedOwnedHorse.xp / 100, 0, 1) : 0;

  return (
    <div className="stable-layout">
      <div className="stable-roster setting-group" aria-label="Конюшня">
        <div className="setting-title">
          <Gauge size={17} strokeWidth={2.4} />
          <span>Лошадь</span>
        </div>
        <div className="stable-horse-list">
          {stableHorses.map((ownedHorse) => {
            const horse = horseTypeById(ownedHorse.typeId);
            const active = selectedOwnedHorse.id === ownedHorse.id;

            return (
              <button
                className={active ? "stable-card active" : "stable-card"}
                type="button"
                key={ownedHorse.id}
                onClick={() => onHorseChange(ownedHorse.id)}
              >
                <HorseToken horse={horse} />
                <span className="stable-card-copy">
                  <strong>{ownedHorse.name}</strong>
                  <span>
                    {horse.name} · Ур. {ownedHorse.level}
                  </span>
                </span>
                <span className="horse-tier">{horse.tier}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="stable-detail" style={paletteStyle(selectedHorse)} aria-label={selectedOwnedHorse.name}>
        <div className="stable-detail-head">
          <HorsePreview horse={selectedHorse} />
          <div className="stable-copy">
            <p className="label">
              {selectedHorse.role} · {selectedHorse.name}
            </p>
            <h2>{selectedOwnedHorse.name}</h2>
            <p>{selectedHorse.description}</p>
            <div className="horse-tags" aria-label="Профиль лошади">
              <span>{selectedHorse.stable.line}</span>
              <span>Ур. {selectedOwnedHorse.level}</span>
              <span>Связь {selectedOwnedHorse.bond}</span>
            </div>
          </div>
        </div>

        <div className="horse-progress" aria-label="Прогресс лошади">
          <span>Опыт до следующего уровня</span>
          <i>
            <b style={{ "--value": `${Math.round(xpProgress * 100)}%` }} />
          </i>
          <strong>{selectedOwnedHorse.xp}/100</strong>
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
