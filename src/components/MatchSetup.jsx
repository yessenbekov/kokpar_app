import { useEffect, useState } from "react";
import { CircleDot, Clock3, Play, Trophy, Users } from "lucide-react";
import { gameModeById } from "../app/gameModes.js";
import { HorseStable } from "./HorseStable.jsx";
import { MockOnlineLobby } from "./MockOnlineLobby.jsx";
import { ModeSelector } from "./ModeSelector.jsx";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function MatchSetup({ profile, settings, onHorseRename, onSettingChange, onStart }) {
  const ownedCount = profile.ownedHorses.length;
  const selectedHorse = profile.ownedHorses.find((horse) => horse.id === settings.horseId) ?? profile.ownedHorses[0];
  const selectedMode = gameModeById(settings.modeId);
  const onlineMode = selectedMode.id === "online_room";
  const [onlineReady, setOnlineReady] = useState(false);
  const canStart = !onlineMode || onlineReady;

  useEffect(() => {
    setOnlineReady(false);
  }, [settings.modeId, settings.teamSide, settings.horseId]);

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
          ownedHorses={profile.ownedHorses}
          horseId={settings.horseId}
          onHorseChange={(horseId) => onSettingChange("horseId", horseId)}
          onHorseRename={onHorseRename}
        />

        <ModeSelector modeId={settings.modeId} onModeChange={(modeId) => onSettingChange("modeId", modeId)} />

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
                disabled={selectedMode.goalLocked}
                onClick={() => onSettingChange("goalType", "circle")}
              >
                <strong>Круг</strong>
                <span>На земле</span>
              </button>
              <button
                className={settings.goalType === "kazan" ? "choice active" : "choice"}
                type="button"
                disabled={selectedMode.goalLocked}
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

        {onlineMode && (
          <MockOnlineLobby
            profile={profile}
            selectedHorse={selectedHorse}
            settings={settings}
            ready={onlineReady}
            onReadyChange={setOnlineReady}
            onTeamChange={(teamSide) => onSettingChange("teamSide", teamSide)}
          />
        )}

        <button className="start-button" type="button" onClick={onStart} disabled={!canStart}>
          <Play size={19} fill="currentColor" strokeWidth={2.4} />
          <span>{canStart ? selectedMode.startLabel : "Нужно быть готовым"}</span>
        </button>
      </div>
    </section>
  );
}
