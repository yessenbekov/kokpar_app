import { CircleDot, Clock3, Play, RotateCcw, SlidersHorizontal, Trophy, Users } from "lucide-react";
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
    carry: "Кокпар на поле",
    message: "Загрузка матча",
    submessage: "Готовим поле.",
    showBanner: true
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

export default function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [settings, setSettings] = useState(() => readUrlSettings());
  const [activeSettings, setActiveSettings] = useState(() => (shouldAutoStart() ? readUrlSettings() : null));
  const [hud, setHud] = useState(initialHud);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState("");

  useEffect(() => {
    if (!mountRef.current || !activeSettings) return undefined;

    const gameSettings = {
      ...activeSettings,
      matchSeconds: activeSettings.matchMinutes * 60
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

  const isSetup = !activeSettings;
  const goalLabel = activeSettings?.goalType === "kazan" ? "Казан" : "Круг";

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
          <div className="meter" aria-label="Выносливость">
            <i style={{ "--value": `${Math.round(hud.stamina * 100)}%` }} />
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
        </div>
      </section>
      )}

      {activeSettings && hud.showBanner && (
        <div className="banner" role="status" aria-live="polite">
          <strong>{hud.message}</strong>
          <span>{hud.submessage}</span>
        </div>
      )}
    </main>
  );
}
