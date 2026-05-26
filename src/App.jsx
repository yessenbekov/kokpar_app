import {
  CircleDot,
  Clock3,
  Hand,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  Users,
  Volume2,
  VolumeX
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createKokparGame } from "./game/createKokparGame.js";

const DEFAULT_SETTINGS = {
  goalType: "circle",
  teamSize: 3,
  matchMinutes: 2
};

function formatTimer(minutes) {
  return `${String(minutes).padStart(2, "0")}:00`;
}

function makeInitialHud(settings = DEFAULT_SETTINGS) {
  return {
    blue: 0,
    red: 0,
    timer: formatTimer(settings.matchMinutes),
    stamina: 1,
    throwPower: 0,
    tugPower: 0,
    carry: "Кокпар на поле",
    message: "Загрузка матча",
    submessage: "Готовим поле.",
    showBanner: true,
    radar: null
  };
}

function readUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const goalParam = params.get("goal");
  const teamSizeParam = Number(params.get("teamSize") ?? params.get("players"));
  const matchMinutesParam = Number(params.get("minutes") ?? params.get("time"));

  return {
    goalType: goalParam === "kazan" ? "kazan" : "circle",
    teamSize: [3, 4, 5].includes(teamSizeParam) ? teamSizeParam : DEFAULT_SETTINGS.teamSize,
    matchMinutes: [2, 3, 5].includes(matchMinutesParam) ? matchMinutesParam : DEFAULT_SETTINGS.matchMinutes
  };
}

function shouldAutoStart() {
  return new URLSearchParams(window.location.search).get("start") === "1";
}

const initialHud = {
  ...makeInitialHud()
};

const JOYSTICK_RADIUS = 46;

function Radar({ radar, goalType }) {
  if (!radar) return null;

  const xFor = (point) => 2 + point.x * 96;
  const yFor = (point) => 2 + point.z * 62;

  return (
    <aside className="radar" aria-label="Радар поля">
      <svg viewBox="0 0 100 66" aria-hidden="true">
        <rect className="radar-field" x="2" y="2" width="96" height="62" rx="2" />
        <line className="radar-line" x1="50" y1="2" x2="50" y2="64" />
        <circle className="radar-center" cx="50" cy="33" r="7" />
        {radar.goals.map((goal) => (
          <circle
            className={`radar-goal ${goal.team} ${goalType}`}
            cx={xFor(goal)}
            cy={yFor(goal)}
            key={goal.team}
            r={goalType === "kazan" ? 4.6 : 5.3}
          />
        ))}
        {radar.riders.map((rider) => (
          <g key={rider.name}>
            {rider.holder && (
              <circle className="radar-holder-ring" cx={xFor(rider)} cy={yFor(rider)} r="3.7" />
            )}
            <circle
              className={[
                "radar-rider",
                rider.team,
                rider.human ? "human" : "",
                rider.contesting ? "contesting" : "",
                rider.supporting ? "supporting" : ""
              ].filter(Boolean).join(" ")}
              cx={xFor(rider)}
              cy={yFor(rider)}
              r={rider.human ? 2.2 : 1.75}
            />
          </g>
        ))}
        {!radar.serke.carried && (
          <path
            className={radar.serke.flight ? "radar-serke flight" : "radar-serke"}
            d={`M ${xFor(radar.serke)} ${yFor(radar.serke) - 2.8} l 2.8 2.8 -2.8 2.8 -2.8 -2.8 Z`}
          />
        )}
      </svg>
    </aside>
  );
}

export default function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const joystickRef = useRef(null);
  const [joystick, setJoystick] = useState({ active: false, x: 0, z: 0 });
  const [settings, setSettings] = useState(() => readUrlSettings());
  const [activeSettings, setActiveSettings] = useState(() => (shouldAutoStart() ? readUrlSettings() : null));
  const [hud, setHud] = useState(initialHud);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);

  useEffect(() => {
    if (!mountRef.current || !activeSettings) return undefined;

    const gameSettings = {
      ...activeSettings,
      matchSeconds: activeSettings.matchMinutes * 60,
      feedbackEnabled
    };

    try {
      gameRef.current = createKokparGame(mountRef.current, setHud, gameSettings);
      setReady(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown WebGL error";
      setSceneError(message);
      setReady(true);
      setHud({
        ...initialHud,
        message: "WebGL недоступен",
        submessage: "Открой игру в браузере с включенным аппаратным ускорением.",
        showBanner: true
      });
    }

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [activeSettings]);

  function setGameTouchInput(input) {
    gameRef.current?.setTouchInput?.(input);
  }

  function updateJoystick(event) {
    event.preventDefault();
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = event.clientX - (rect.left + rect.width / 2);
    const dz = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dz);
    const scale = distance > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / distance : 1;
    const x = (dx * scale) / JOYSTICK_RADIUS;
    const z = (dz * scale) / JOYSTICK_RADIUS;

    setJoystick({ active: true, x, z });
    setGameTouchInput({ x, z });
  }

  function startJoystick(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  }

  function releaseJoystick(event) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setJoystick({ active: false, x: 0, z: 0 });
    setGameTouchInput({ x: 0, z: 0 });
  }

  function pressAction(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setGameTouchInput({ action: true });
  }

  function releaseAction(event) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGameTouchInput({ action: false });
  }

  function releaseTouchControls(updateUi = true) {
    if (updateUi) setJoystick({ active: false, x: 0, z: 0 });
    setGameTouchInput({ x: 0, z: 0, action: false });
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) releaseTouchControls();
    }

    window.addEventListener("blur", releaseTouchControls);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      releaseTouchControls(false);
      window.removeEventListener("blur", releaseTouchControls);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    releaseTouchControls();
  }, [activeSettings]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function startMatch() {
    setHud(makeInitialHud(settings));
    setReady(false);
    setSceneError("");
    setActiveSettings({ ...settings });
  }

  function openSettings() {
    gameRef.current?.destroy();
    gameRef.current = null;
    setActiveSettings(null);
    setReady(false);
    setSceneError("");
    setHud(makeInitialHud(settings));
  }

  function toggleFeedback() {
    const enabled = !feedbackEnabled;
    setFeedbackEnabled(enabled);
    gameRef.current?.setFeedbackEnabled?.(enabled);
  }

  const isSetup = !activeSettings;
  const goalLabel = activeSettings?.goalType === "kazan" ? "Казан" : "Круг";
  const meterMode = hud.throwPower > 0 ? "throw" : hud.tugPower > 0 ? "tug" : "stamina";
  const activeMeterValue = meterMode === "throw" ? hud.throwPower : meterMode === "tug" ? hud.tugPower : hud.stamina;

  function renderActionButton() {
    return (
      <button
        className="touch-button touch-action"
        type="button"
        aria-label="Действие"
        title="Действие"
        onPointerDown={pressAction}
        onPointerUp={releaseAction}
        onPointerCancel={releaseAction}
        onLostPointerCapture={releaseAction}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Hand size={30} strokeWidth={2.6} />
      </button>
    );
  }

  return (
    <main className="game" aria-label="Kokpar Game">
      <div className="viewport" ref={mountRef} />

      {isSetup && (
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
                  onClick={() => updateSetting("goalType", "circle")}
                >
                  <strong>Круг</strong>
                  <span>На земле</span>
                </button>
                <button
                  className={settings.goalType === "kazan" ? "choice active" : "choice"}
                  type="button"
                  onClick={() => updateSetting("goalType", "kazan")}
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
                    onClick={() => updateSetting("teamSize", size)}
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
                    onClick={() => updateSetting("matchMinutes", minutes)}
                  >
                    <strong>{minutes}:00</strong>
                  </button>
                ))}
              </div>
            </div>

            <button className="start-button" type="button" onClick={startMatch}>
              <Play size={19} fill="currentColor" strokeWidth={2.4} />
              <span>Начать матч</span>
            </button>
          </div>
        </section>
      )}

      {activeSettings && !ready && <div className="loading">Готовим степь, коней и казаны...</div>}
      {sceneError && (
        <div className="webgl-error" role="alert">
          <strong>3D-сцена не запустилась</strong>
          <span>{sceneError}</span>
        </div>
      )}

      {activeSettings && (
      <section className="hud" aria-label="Match status">
        <div className="panel">
          <p className="label">Матч</p>
          <p className="status">{hud.timer}</p>
          <p className="small">{activeSettings.teamSize}×{activeSettings.teamSize} · {goalLabel}</p>
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
            onClick={() => gameRef.current?.restart()}
          >
            <RotateCcw size={18} strokeWidth={2.4} />
          </button>

          <button
            className="icon-button"
            type="button"
            aria-label="Настройки матча"
            title="Настройки матча"
            onClick={openSettings}
          >
            <SlidersHorizontal size={18} strokeWidth={2.4} />
          </button>

          <button
            className="icon-button"
            type="button"
            aria-label={feedbackEnabled ? "Отключить звук и отклик" : "Включить звук и отклик"}
            aria-pressed={feedbackEnabled}
            title={feedbackEnabled ? "Отключить звук и отклик" : "Включить звук и отклик"}
            onClick={toggleFeedback}
          >
            {feedbackEnabled ? <Volume2 size={18} strokeWidth={2.4} /> : <VolumeX size={18} strokeWidth={2.4} />}
          </button>
        </div>
      </section>
      )}

      {activeSettings && <Radar radar={hud.radar} goalType={activeSettings.goalType} />}

      {activeSettings && hud.showBanner && (
        <div className="banner" role="status" aria-live="polite">
          <strong>{hud.message}</strong>
          <span>{hud.submessage}</span>
        </div>
      )}

      {activeSettings && (
        <section className="touch-controls" aria-label="Сенсорное управление">
          <div
            className={joystick.active ? "touch-joystick active" : "touch-joystick"}
            ref={joystickRef}
            aria-label="Джойстик движения"
            role="application"
            style={{
              "--stick-x": joystick.x,
              "--stick-z": joystick.z
            }}
            onPointerDown={startJoystick}
            onPointerMove={(event) => {
              if (joystick.active) updateJoystick(event);
            }}
            onPointerUp={releaseJoystick}
            onPointerCancel={releaseJoystick}
            onLostPointerCapture={releaseJoystick}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span className="touch-stick-base" />
            <span className="touch-stick-knob" />
          </div>

          <div className="touch-action-wrap">
            {renderActionButton()}
          </div>
        </section>
      )}
    </main>
  );
}
