import { Dumbbell, Radio, Swords } from "lucide-react";
import { GAME_MODES } from "../app/gameModes.js";

const MODE_ICONS = {
  kokpar: Swords,
  training: Dumbbell,
  online_room: Radio
};

export function ModeSelector({ modeId, onModeChange }) {
  return (
    <div className="setting-group mode-group" aria-label="Режим игры">
      <div className="setting-title">
        <Swords size={17} strokeWidth={2.4} />
        <span>Режим</span>
      </div>
      <div className="mode-grid">
        {GAME_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode.id] ?? Swords;

          return (
            <button
              className={modeId === mode.id ? "mode-choice active" : "mode-choice"}
              type="button"
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
            >
              <Icon size={18} strokeWidth={2.35} />
              <span>
                <strong>{mode.name}</strong>
                <small>{mode.role}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
