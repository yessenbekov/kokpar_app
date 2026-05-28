import { Camera, RotateCcw, Shield, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";

export function MatchHud({
  settings,
  hud,
  feedbackEnabled,
  onRestart,
  onOpenSettings,
  onCycleCamera,
  onToggleFeedback
}) {
  const goalLabel = settings.goalType === "kazan" ? "Казан" : "Круг";
  const meterMode = hud.throwPower > 0 ? "throw" : hud.mountedContest ? "tug" : "stamina";
  const activeMeterValue = meterMode === "throw" ? hud.throwPower : meterMode === "tug" ? hud.tugPower : hud.stamina;

  return (
    <section className="hud" aria-label="Match status">
      <div className="panel">
        <p className="label">Матч</p>
        <p className="status">{hud.timer}</p>
        <p className="small">{settings.teamSize}×{settings.teamSize} · {goalLabel}</p>
      </div>

      <div className="panel score" aria-label="Score">
        <span className="blue">{hud.blue}</span>
        <b>Кокпар 3D</b>
        <span className="red">{hud.red}</span>
      </div>

      <div className="panel right">
        <p className="label">Конь · {hud.horseName}</p>
        <p className="status">{hud.carry}</p>
        <div className="horse-status">
          <div
            className={meterMode === "throw" ? "meter throw-meter" : meterMode === "tug" ? "meter tug-meter" : "meter"}
            aria-label={meterMode === "throw" ? "Сила броска" : meterMode === "tug" ? "Усилие борьбы" : "Выносливость"}
          >
            <i style={{ "--value": `${Math.round(activeMeterValue * 100)}%` }} />
            {meterMode === "tug" && (
              <b
                className={hud.contestLeadingTeam ? `contest-balance ${hud.contestLeadingTeam}` : "contest-balance"}
                style={{ "--balance": `${Math.round(hud.contestBalance * 100)}%` }}
              />
            )}
          </div>
          <span
            className={hud.bodyCheckActive ? "check-indicator active" : hud.bodyCheckReady ? "check-indicator ready" : "check-indicator cooldown"}
            aria-label={hud.bodyCheckActive ? "Силовой прием активен" : hud.bodyCheckReady ? "Силовой прием готов" : "Силовой прием восстанавливается"}
            title="Силовой прием"
            style={{ "--cooldown": `${Math.round(hud.bodyCheckCooldown * 100)}%` }}
          >
            <Shield size={13} strokeWidth={2.6} />
          </span>
        </div>
      </div>

      <div className="hud-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={`Сменить камеру. Сейчас: ${hud.cameraMode}`}
          title={`Камера: ${hud.cameraMode}`}
          onClick={onCycleCamera}
        >
          <Camera size={18} strokeWidth={2.4} />
        </button>

        <button
          className="icon-button"
          type="button"
          aria-label="Начать новый матч"
          title="Начать новый матч"
          onClick={onRestart}
        >
          <RotateCcw size={18} strokeWidth={2.4} />
        </button>

        <button
          className="icon-button"
          type="button"
          aria-label="Настройки матча"
          title="Настройки матча"
          onClick={onOpenSettings}
        >
          <SlidersHorizontal size={18} strokeWidth={2.4} />
        </button>

        <button
          className="icon-button"
          type="button"
          aria-label={feedbackEnabled ? "Отключить звук и отклик" : "Включить звук и отклик"}
          aria-pressed={feedbackEnabled}
          title={feedbackEnabled ? "Отключить звук и отклик" : "Включить звук и отклик"}
          onClick={onToggleFeedback}
        >
          {feedbackEnabled ? <Volume2 size={18} strokeWidth={2.4} /> : <VolumeX size={18} strokeWidth={2.4} />}
        </button>
      </div>
    </section>
  );
}
