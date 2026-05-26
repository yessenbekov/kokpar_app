import { RotateCcw, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";

export function MatchHud({
  settings,
  hud,
  feedbackEnabled,
  onRestart,
  onOpenSettings,
  onToggleFeedback
}) {
  const goalLabel = settings.goalType === "kazan" ? "Казан" : "Круг";
  const meterMode = hud.throwPower > 0 ? "throw" : hud.tugPower > 0 ? "tug" : "stamina";
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
        <p className="label">Конь</p>
        <p className="status">{hud.carry}</p>
        <div
          className={meterMode === "throw" ? "meter throw-meter" : meterMode === "tug" ? "meter tug-meter" : "meter"}
          aria-label={meterMode === "throw" ? "Сила броска" : meterMode === "tug" ? "Усилие борьбы" : "Выносливость"}
        >
          <i style={{ "--value": `${Math.round(activeMeterValue * 100)}%` }} />
        </div>
      </div>

      <div className="hud-actions">
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
