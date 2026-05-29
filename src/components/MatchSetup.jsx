import { CircleDot, Clock3, Play, Trophy, Users } from "lucide-react";
import { HorseStable } from "./HorseStable.jsx";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function MatchSetup({ profile, settings, onSettingChange, onStart }) {
  const ownedCount = profile.ownedHorseTypes.length;

  return (
    <section className="setup" aria-label="Настройки матча">
      <div className="setup-panel stable-panel">
        <div className="setup-head">
          <div>
            <p className="label">Кокпар 3D</p>
            <h1>Конюшня</h1>
          </div>
          <div className="profile-strip" aria-label="Профиль игрока">
            <span className="profile-avatar">{profile.riderName.slice(0, 1)}</span>
            <span className="profile-name">
              <span>Профиль</span>
              <strong>{profile.riderName}</strong>
            </span>
            <span className="profile-chip">Ур. {profile.level}</span>
            <span className="profile-chip">{formatCoins(profile.coins)} күміс</span>
            <span className="profile-chip">
              {ownedCount}/{profile.stableCapacity}
            </span>
          </div>
          <Trophy size={30} strokeWidth={2.2} />
        </div>

        <HorseStable
          ownedHorseTypes={profile.ownedHorseTypes}
          horseType={settings.horseType}
          onHorseChange={(horseType) => onSettingChange("horseType", horseType)}
        />

        <div className="match-options">
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
        </div>

        <button className="start-button" type="button" onClick={onStart}>
          <Play size={19} fill="currentColor" strokeWidth={2.4} />
          <span>Начать матч</span>
        </button>
      </div>
    </section>
  );
}
