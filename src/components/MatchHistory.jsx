import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { matchHistoryStore } from "../app/matchHistoryStore.js";

function goalLabel(goalType) {
  return goalType === "kazan" ? "Казан" : "Круг";
}

function modeLabel(modeId) {
  if (modeId === "online_room") return "Онлайн";
  return "Классика";
}

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} дн`;
}

export function MatchHistory() {
  const [open, setOpen] = useState(false);

  const history = matchHistoryStore.read().slice(0, 20);
  if (history.length === 0) return null;

  return (
    <div className="match-history">
      <button className="history-toggle" type="button" onClick={() => setOpen((o) => !o)}>
        <History size={15} strokeWidth={2.4} />
        <span>История</span>
        <small className="history-count">{history.length}</small>
        {open ? <ChevronUp size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
      </button>

      {open && (
        <ul className="history-list" aria-label="История матчей">
          {history.map((entry) => (
            <li key={entry.id} className={`history-entry ${entry.won ? "win" : "loss"}`}>
              <span className="history-badge">{entry.won ? "В" : "П"}</span>
              <span className="history-score">{entry.scoreBlue}:{entry.scoreRed}</span>
              <span className="history-info">
                <span>{entry.horseName}</span>
                <small>{modeLabel(entry.modeId)} · {goalLabel(entry.goalType)} · {entry.teamSize}v{entry.teamSize}</small>
              </span>
              <span className="history-xp">+{entry.xpGain} XP</span>
              <span className="history-time">{relativeTime(entry.playedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
