import { useEffect, useState } from "react";
import { Camera, Volume2, VolumeX } from "lucide-react";

export function MatchHud({
  settings,
  hud,
  feedbackEnabled,
  onRestart,
  onQuitMatch,
  onSetPaused,
  onCycleCamera,
  onToggleFeedback,
  onSettingChange
}) {
  const [paused, setPausedState] = useState(false);
  const [showInGameSettings, setShowInGameSettings] = useState(false);

  const [sfxVol, setSfxVol] = useState(settings.sfxVol ?? 78);
  const [musicVol, setMusicVol] = useState(settings.musicVol ?? 42);
  const [vibration, setVibration] = useState(settings.vibration ?? true);
  const [cameraModeSt, setCameraModeSt] = useState(settings.cameraMode ?? "back");
  const [leftHand, setLeftHand] = useState(settings.leftHand ?? false);
  const [hints, setHints] = useState(settings.hints ?? true);
  const [joystickSensitivity, setJoystickSensitivity] = useState(settings.joystickSensitivity ?? 50);

  useEffect(() => {
    onSetPaused?.(paused);
  }, [paused]);

  const staminaPct = Math.round((hud.stamina ?? 1) * 100);
  const meterMode = hud.throwPower > 0 ? "throw" : hud.mountedContest ? "tug" : "stamina";
  const activePct =
    meterMode === "throw" ? Math.round(hud.throwPower * 100)
    : meterMode === "tug" ? Math.round(hud.tugPower * 100)
    : staminaPct;

  function handlePause() { setPausedState(true); setShowInGameSettings(false); }
  function handleResume() { setPausedState(false); setShowInGameSettings(false); }
  function handleQuit() { setPausedState(false); setShowInGameSettings(false); onQuitMatch?.(); }

  function saveSetting(key, value) { onSettingChange?.(key, value); }

  const lang = settings.lang ?? "ru";
  function t(ru, kz, en) { return lang === "kz" ? kz : lang === "en" ? (en ?? ru) : ru; }

  const serkeLabel =
    hud.serkeTeam === "blue" ? "Синие владеют" :
    hud.serkeTeam === "red" ? "Красные владеют" :
    "Серке";

  const goalLabel = settings.goalType === "kazan" ? "Казан" : "Круг";

  return (
    <section className="hud" aria-label="Match status">
      {/* ── Top bar ── */}
      <div className="nh-top">
        {/* Timer block */}
        <div className="nh-left-group">
          <div className="nh-timer-block">
            <div className="nh-timer">{hud.timer}</div>
            <div className="nh-timer-sub">{settings.teamSize}×{settings.teamSize} · {goalLabel}</div>
          </div>
          {/* Score block */}
          <div className="nh-score-block">
            <div className="nh-score-col">
              <span className="nh-score-pill nh-blue">{hud.blue}</span>
              <span className="nh-score-team">{t("Синие", "Көк", "Blue")}</span>
            </div>
            <span className="nh-score-colon">:</span>
            <div className="nh-score-col">
              <span className="nh-score-pill nh-red">{hud.red}</span>
              <span className="nh-score-team">{t("Красные", "Қызыл", "Red")}</span>
            </div>
          </div>
        </div>

        {/* Serke possession tracker */}
        <div className="nh-serke-track">
          <div className="nh-serke-top-row">
            <span className="nh-serke-label">
              <span className={`nh-serke-diamond${hud.serkeTeam ? "" : " active"}`} />
              {serkeLabel}
            </span>
            {hud.serkeDistance > 0 && (
              <span className="nh-serke-distance">{Math.round(hud.serkeDistance)} м</span>
            )}
          </div>
          <div className="nh-serke-bar">
            <div className={`nh-seg nh-seg-blue${hud.serkeTeam === "blue" ? " nh-seg-glow" : ""}`} />
            <div className={`nh-seg nh-seg-gold${!hud.serkeTeam ? " nh-seg-glow" : ""}`} />
            <div className={`nh-seg nh-seg-red${hud.serkeTeam === "red" ? " nh-seg-glow" : ""}`} />
          </div>
          <div className="nh-possession-row">
            <span>{t("Владение", "Иелену", "Poss.")} {Math.round((hud.blueScore ?? 48))}%</span>
            <span>{Math.round((hud.redScore ?? 52))}%</span>
          </div>
        </div>

        {/* Icon buttons */}
        <div className="nh-icons-wrap">
          <div className="nh-icons">
            <button className="nh-icon-btn" type="button" onClick={onCycleCamera} aria-label="Камера">
              <Camera size={16} strokeWidth={2.2} />
            </button>
            <button className="nh-icon-btn" type="button" onClick={onToggleFeedback} aria-label="Звук">
              {feedbackEnabled ? <Volume2 size={16} strokeWidth={2.2} /> : <VolumeX size={16} strokeWidth={2.2} />}
            </button>
            <button className="nh-icon-btn" type="button" onClick={handlePause} aria-label="Пауза">
              <span className="nh-pause-icon">❙❙</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div className="nh-bottom">
        <div className="nh-stamina-wrap">
          <span className="nh-stamina-label">
            {meterMode === "throw" ? "Бросок" : meterMode === "tug" ? "Борьба" : "Стамина"}
          </span>
          <div className={`nh-stamina-track${meterMode !== "stamina" ? " nh-stamina-active" : ""}`}>
            <div
              className={`nh-stamina-fill${meterMode === "throw" ? " throw" : meterMode === "tug" ? " tug" : ""}`}
              style={{ width: `${activePct}%` }}
            />
            {meterMode === "tug" && (
              <div
                className={`nh-tug-marker${hud.contestLeadingTeam ? " " + hud.contestLeadingTeam : ""}`}
                style={{ left: `${Math.round((hud.contestBalance ?? 0.5) * 100)}%` }}
              />
            )}
          </div>
        </div>

        <div className="nh-actions">
          <button className="nh-action-btn nh-action-amber" type="button">
            <span className="nh-action-amber-icon" />
            Поднять серке
          </button>
          <button className="nh-action-btn nh-action-dark" type="button">
            Рывок
            {hud.bodyCheckCooldown > 0 && (
              <span className="nh-action-cooldown">
                {(hud.bodyCheckCooldown * 1.45).toFixed(1)}с
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Pause overlay ── */}
      {paused && !showInGameSettings && (
        <div className="nh-overlay">
          <div className="nh-pause-panels">
            <div className="nh-pause-menu">
              <div className="nh-pause-header">
                <span className="nh-pause-icon-lg">⏸</span>
                <span className="nh-pause-title">{t("Пауза", "Үзіліс", "Pause")}</span>
              </div>
              <p className="nh-pause-subtitle">{settings.teamSize}×{settings.teamSize} · {goalLabel.toUpperCase()} · {hud.timer}</p>
              <div className="nh-pause-score-row">
                <span className="nh-pause-score-pill nh-blue">{hud.blue}</span>
                <span className="nh-score-colon">:</span>
                <span className="nh-pause-score-pill nh-red">{hud.red}</span>
              </div>
              <button className="nh-pause-btn nh-pause-amber" type="button" onClick={handleResume}>
                {t("Продолжить", "Жалғастыру", "Resume")}
              </button>
              <div className="nh-pause-grid">
                <button className="nh-pause-grid-btn" type="button" onClick={() => setShowInGameSettings(true)}>
                  {t("Настройки", "Баптаулар", "Settings")}
                </button>
                <button className="nh-pause-grid-btn" type="button" onClick={onCycleCamera}>
                  {t("Камера", "Камера", "Camera")}
                </button>
              </div>
              <button className="nh-pause-btn nh-pause-red" type="button" onClick={handleQuit}>
                {t("Покинуть матч", "Матчтан шығу", "Quit Match")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-game settings overlay ── */}
      {paused && showInGameSettings && (
        <div className="nh-overlay">
          <div className="nh-pause-panels">
            <div className="nh-pause-menu nh-pause-menu--settings">
              <div className="nh-settings-header">
                <button type="button" className="nh-settings-back" onClick={() => setShowInGameSettings(false)}>‹</button>
                <span className="nh-pause-title">{t("Настройки", "Баптаулар", "Settings")}</span>
              </div>

              <div className="nh-settings-body">
                <div className="settings-section-label">{t("Звук", "Дыбыс", "Sound")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Эффекты", "Эффекттер", "Effects")}</span>
                    <input type="range" className="settings-slider" min={0} max={100} value={sfxVol}
                      style={{ "--fill": `${sfxVol}%` }}
                      onChange={(e) => { const v = Number(e.target.value); setSfxVol(v); saveSetting("sfxVol", v); }} />
                    <span className="settings-row-val">{sfxVol}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Музыка", "Музыка", "Music")}</span>
                    <input type="range" className="settings-slider" min={0} max={100} value={musicVol}
                      style={{ "--fill": `${musicVol}%` }}
                      onChange={(e) => { const v = Number(e.target.value); setMusicVol(v); saveSetting("musicVol", v); }} />
                    <span className="settings-row-val">{musicVol}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Вибрация", "Діріл", "Vibration")}</span>
                    <button type="button" className={`settings-toggle${vibration ? " on" : ""}`}
                      onClick={() => { const v = !vibration; setVibration(v); saveSetting("vibration", v); }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                </div>

                <div className="settings-section-label">{t("Управление", "Басқару", "Controls")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Камера", "Камера", "Camera")}</span>
                    <div className="settings-seg-sm">
                      <button type="button" className={`settings-seg-btn-sm${cameraModeSt === "tv" ? " active" : ""}`}
                        onClick={() => { setCameraModeSt("tv"); saveSetting("cameraMode", "tv"); }}>ТВ</button>
                      <button type="button" className={`settings-seg-btn-sm${cameraModeSt !== "tv" ? " active" : ""}`}
                        onClick={() => { setCameraModeSt("back"); saveSetting("cameraMode", "back"); }}>
                        {t("За спиной", "Артта", "Behind")}
                      </button>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Джойстик", "Джойстик", "Joystick")}</span>
                    <input type="range" className="settings-slider" min={10} max={100} value={joystickSensitivity}
                      style={{ "--fill": `${joystickSensitivity}%` }}
                      onChange={(e) => { const v = Number(e.target.value); setJoystickSensitivity(v); saveSetting("joystickSensitivity", v); }} />
                    <span className="settings-row-val">{joystickSensitivity}</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Левша", "Сол қол", "Left hand")}</span>
                    <button type="button" className={`settings-toggle${leftHand ? " on" : ""}`}
                      onClick={() => { const v = !leftHand; setLeftHand(v); saveSetting("leftHand", v); }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Подсказки", "Кеңестер", "Hints")}</span>
                    <button type="button" className={`settings-toggle${hints ? " on" : ""}`}
                      onClick={() => { const v = !hints; setHints(v); saveSetting("hints", v); }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
