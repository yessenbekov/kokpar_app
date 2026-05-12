import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createKokparGame } from "./game/createKokparGame.js";

const initialHud = {
  blue: 0,
  red: 0,
  timer: "02:00",
  stamina: 1,
  carry: "Кокпар на поле",
  message: "Загрузка матча",
  submessage: "Готовим поле.",
  showBanner: true
};

export default function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [hud, setHud] = useState(initialHud);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState("");

  useEffect(() => {
    if (!mountRef.current) return undefined;

    try {
      gameRef.current = createKokparGame(mountRef.current, setHud);
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
  }, []);

  return (
    <main className="game" aria-label="Kokpar Game">
      <div className="viewport" ref={mountRef} />

      {!ready && <div className="loading">Готовим степь, коней и казаны...</div>}
      {sceneError && (
        <div className="webgl-error" role="alert">
          <strong>3D-сцена не запустилась</strong>
          <span>{sceneError}</span>
        </div>
      )}

      <section className="hud" aria-label="Match status">
        <div className="panel">
          <p className="label">Матч</p>
          <p className="status">{hud.timer}</p>
          <p className="small">Команда синих</p>
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

        <button
          className="icon-button"
          type="button"
          aria-label="Начать новый матч"
          title="Начать новый матч"
          onClick={() => gameRef.current?.restart()}
        >
          <RotateCcw size={18} strokeWidth={2.4} />
        </button>
      </section>

      {hud.showBanner && (
        <div className="banner" role="status" aria-live="polite">
          <strong>{hud.message}</strong>
          <span>{hud.submessage}</span>
        </div>
      )}
    </main>
  );
}
