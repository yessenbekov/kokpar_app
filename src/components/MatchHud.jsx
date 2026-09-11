import { useState } from "react";
import { Camera, Volume2, VolumeX } from "lucide-react";

export function MatchHud({
  settings,
  hud,
  feedbackEnabled,
  onRestart,
  onOpenSettings,
  onCycleCamera,
  onToggleFeedback
}) {
  const [paused, setPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const staminaPct = Math.round((hud.stamina ?? 1) * 100);
  const meterMode = hud.throwPower > 0 ? "throw" : hud.mountedContest ? "tug" : "stamina";
  const activePct =
    meterMode === "throw" ? Math.round(hud.throwPower * 100)
    : meterMode === "tug" ? Math.round(hud.tugPower * 100)
    : staminaPct;

  function handlePause() { setPaused(true); setShowExitConfirm(false); }
  function handleResume() { setPaused(false); setShowExitConfirm(false); }
  function handleExit() { setPaused(false); setShowExitConfirm(false); onOpenSettings?.(); }

  const serkeLabel =
    hud.carry === "blue" ? "Синие владеют" :
    hud.carry === "red" ? "Красные владеют" :
    "Серке";

  return (
    <section className="nh" aria-label="Match status">
      {/* ── Top bar ── */}
      <div className="nh-top">
        {/* Timer + Score */}
        <div className="nh-timer-score">
          <span className="nh-timer">{hud.timer}</span>
          <div className="nh-ts-sep" />
          <span className={`nh-score-pill nh-blue`}>{hud.blue}</span>
          <span className="nh-score-colon">:</span>
          <span className={`nh-score-pill nh-red`}>{hud.red}</span>
        </div>

        {/* Serke possession tracker */}
        <div className="nh-serke-track">
          <span className="nh-serke-label">{serkeLabel}</span>
          <div className="nh-serke-bar">
            <div className="nh-seg nh-seg-blue" />
            <div className="nh-seg nh-seg-gold" />
            <div className="nh-seg nh-seg-red" />
          </div>
        </div>

        {/* Icon buttons */}
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

      {/* ── Bottom strip ── */}
      <div className="nh-bottom">
        {/* Stamina bar */}
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

        {/* Action buttons */}
        <div className="nh-actions">
          <button className="nh-action-btn nh-action-amber" type="button">
            Поднять серке
          </button>
          <button className="nh-action-btn nh-action-dark" type="button">
            Рывок
          </button>
        </div>
      </div>

      {/* ── Pause overlay ── */}
      {paused && (
        <div className="nh-overlay">
          <div className="nh-pause-panels">
            <div className="nh-pause-menu">
              <div className="nh-pause-title">Пауза</div>
              <div className="nh-pause-score-row">
                <span className="nh-pause-score-pill nh-blue">{hud.blue}</span>
                <span className="nh-score-colon">:</span>
                <span className="nh-pause-score-pill nh-red">{hud.red}</span>
              </div>
              <button className="nh-pause-btn nh-pause-amber" type="button" onClick={handleResume}>
                Продолжить
              </button>
              <div className="nh-pause-grid">
                <button className="nh-pause-grid-btn" type="button" onClick={onOpenSettings}>
                  Настройки
                </button>
                <button className="nh-pause-grid-btn" type="button" onClick={onToggleFeedback}>
                  {feedbackEnabled ? "Звук: Вкл" : "Звук: Выкл"}
                </button>
              </div>
              <button
                className="nh-pause-btn nh-pause-red"
                type="button"
                onClick={() => setShowExitConfirm(true)}
              >
                Покинуть матч
              </button>
            </div>

            {showExitConfirm && (
              <div className="nh-exit-confirm">
                <div className="nh-exit-title">Выйти?</div>
                <div className="nh-exit-sub">Прогресс не сохранится</div>
                <button className="nh-pause-btn nh-pause-amber" type="button" onClick={handleResume}>
                  Остаться
                </button>
                <button className="nh-pause-btn nh-pause-red" type="button" onClick={handleExit}>
                  Выйти в меню
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
