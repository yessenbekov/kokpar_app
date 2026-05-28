import { CircleDot, Clock3, Gauge, Play, Trophy, Users } from "lucide-react";
import { HORSE_TYPES } from "../game/horseTypes.js";

export function MatchSetup({ settings, onSettingChange, onStart }) {
  return (
    <section className="setup" aria-label="Настройки матча">
      <div className="setup-panel">
        <div className="setup-head">
          <div>
            <p className="label">Кокпар 3D</p>
            <h1>Матч</h1>
          </div>
          <Trophy size={30} strokeWidth={2.2} />
        </div>

        <div className="setting-group" aria-label="Тип цели">
          <div className="setting-title">
            <CircleDot size={17} strokeWidth={2.4} />
            <span>Цель</span>
          </div>
          <div className="choice-grid two">
            <button
              className={settings.goalType === "circle" ? "choice active" : "choice"}
              type="button"
              onClick={() => onSettingChange("goalType", "circle")}
            >
              <strong>Круг</strong>
              <span>На земле</span>
            </button>
            <button
              className={settings.goalType === "kazan" ? "choice active" : "choice"}
              type="button"
              onClick={() => onSettingChange("goalType", "kazan")}
            >
              <strong>Казан</strong>
              <span>С бортом</span>
            </button>
          </div>
        </div>

        <div className="setting-group" aria-label="Лошадь">
          <div className="setting-title">
            <Gauge size={17} strokeWidth={2.4} />
            <span>Лошадь</span>
          </div>
          <div className="choice-grid horse-grid">
            {HORSE_TYPES.map((horse) => (
              <button
                className={settings.horseType === horse.id ? "choice horse-choice active" : "choice horse-choice"}
                type="button"
                key={horse.id}
                onClick={() => onSettingChange("horseType", horse.id)}
              >
                <strong>{horse.name}</strong>
                <span>{horse.role}</span>
                <i>
                  <b style={{ "--value": `${Math.round(horse.stats.speed * 72)}%` }} />
                  <b style={{ "--value": `${Math.round(horse.stats.turn * 72)}%` }} />
                  <b style={{ "--value": `${Math.round(horse.stats.contestPower * 72)}%` }} />
                </i>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group" aria-label="Количество игроков">
          <div className="setting-title">
            <Users size={17} strokeWidth={2.4} />
            <span>Игроки</span>
          </div>
          <div className="choice-grid three">
            {[3, 4, 5].map((size) => (
              <button
                className={settings.teamSize === size ? "choice active" : "choice"}
                type="button"
                key={size}
                onClick={() => onSettingChange("teamSize", size)}
              >
                <strong>{size}×{size}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group" aria-label="Время матча">
          <div className="setting-title">
            <Clock3 size={17} strokeWidth={2.4} />
            <span>Время</span>
          </div>
          <div className="choice-grid three">
            {[2, 3, 5].map((minutes) => (
              <button
                className={settings.matchMinutes === minutes ? "choice active" : "choice"}
                type="button"
                key={minutes}
                onClick={() => onSettingChange("matchMinutes", minutes)}
              >
                <strong>{minutes}:00</strong>
              </button>
            ))}
          </div>
        </div>

        <button className="start-button" type="button" onClick={onStart}>
          <Play size={19} fill="currentColor" strokeWidth={2.4} />
          <span>Начать матч</span>
        </button>
      </div>
    </section>
  );
}
