import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, Clock3, Cloud, HardDrive, LoaderCircle, LogIn, LogOut, Mail, Play, Trophy, Users } from "lucide-react";
import { gameModeById } from "../app/gameModes.js";
import { HorseStable } from "./HorseStable.jsx";
import { ModeSelector } from "./ModeSelector.jsx";
import { OnlineRoomLobby } from "./OnlineRoomLobby.jsx";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function accountView(auth) {
  if (auth.status === "signed-in") {
    if (auth.syncStatus === "syncing") {
      return {
        mode: "syncing",
        label: "Синхронизация",
        title: auth.email || "Аккаунт Supabase",
        detail: "Обновляем облачный профиль",
        icon: LoaderCircle
      };
    }

    if (auth.syncStatus === "error") {
      return {
        mode: "error",
        label: "Ошибка",
        title: auth.email || "Аккаунт Supabase",
        detail: auth.error || "Пока сохраняем локально",
        icon: AlertTriangle
      };
    }

    return {
      mode: "cloud",
      label: "Облако",
      title: auth.email || "Аккаунт Supabase",
      detail: auth.message || "Профиль сохранен в Supabase",
      icon: Cloud
    };
  }

  if (auth.syncStatus === "sent") {
    return {
      mode: "pending",
      label: "Письмо",
      title: auth.email || "Magic link отправлен",
      detail: "Открой ссылку из email, затем вернись в игру",
      icon: Mail
    };
  }

  if (auth.status === "unconfigured") {
    return {
      mode: "local",
      label: "Локально",
      title: "Гостевой профиль",
      detail: "Supabase не настроен",
      icon: HardDrive
    };
  }

  if (auth.error) {
    return {
      mode: "error",
      label: "Ошибка",
      title: "Гостевой профиль",
      detail: auth.error,
      icon: AlertTriangle
    };
  }

  return {
    mode: "local",
    label: "Локально",
    title: auth.message || "Гостевой профиль",
    detail: "Вход через email сохранит конюшню в облаке",
    icon: HardDrive
  };
}

function AccountPanel({ auth, onBackToLogin, onSignOut }) {
  const signedIn = auth.status === "signed-in";
  const view = accountView(auth);
  const AccountIcon = view.icon;

  return (
    <div className={`auth-panel ${view.mode}${signedIn ? " signed-in" : ""}`} aria-label="Аккаунт">
      <div className="auth-copy">
        <span className="auth-provider">
          <AccountIcon size={14} strokeWidth={2.6} />
          <span>{view.label}</span>
        </span>
        <strong>{view.title}</strong>
        <small>{view.detail}</small>
      </div>

      <div className="auth-actions">
        <span className={`sync-pill ${view.mode}`}>
          {view.mode === "cloud" && <CheckCircle2 size={13} strokeWidth={2.7} />}
          {view.mode === "syncing" && <LoaderCircle size={13} strokeWidth={2.7} />}
          {view.mode === "pending" && <Mail size={13} strokeWidth={2.7} />}
          {view.mode === "error" && <AlertTriangle size={13} strokeWidth={2.7} />}
          {view.mode === "local" && <HardDrive size={13} strokeWidth={2.7} />}
          <span>{view.label}</span>
        </span>

        {signedIn ? (
          <button className="auth-action" type="button" onClick={onSignOut}>
            <LogOut size={15} strokeWidth={2.5} />
            <span>Выйти</span>
          </button>
        ) : (
          <button className="auth-action" type="button" onClick={onBackToLogin}>
            <LogIn size={15} strokeWidth={2.5} />
            <span>{auth.syncStatus === "sent" ? "Другой email" : "Вход"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function MatchSetup({ profile, settings, auth, onBackToLogin, onSignOut, onHorseRename, onSettingChange, onStart }) {
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
          <div className="profile-stack">
            <span className="profile-strip" aria-label="Профиль игрока">
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
            </span>
            <AccountPanel auth={auth} onBackToLogin={onBackToLogin} onSignOut={onSignOut} />
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
          <OnlineRoomLobby
            auth={auth}
            profile={profile}
            selectedHorse={selectedHorse}
            settings={settings}
            ready={onlineReady}
            onReadyChange={setOnlineReady}
            onTeamChange={(teamSide) => onSettingChange("teamSide", teamSide)}
            onBackToLogin={onBackToLogin}
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
