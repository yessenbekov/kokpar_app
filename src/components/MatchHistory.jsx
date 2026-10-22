import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { matchHistoryStore } from "../app/matchHistoryStore.js";

function goalLabel(t, goalType) {
  return goalType === "kazan" ? t("Казан", "Қазан", "Kazan") : t("Круг", "Шеңбер", "Circle");
}

function modeLabel(t, modeId) {
  if (modeId === "online_room") return t("Онлайн", "Онлайн", "Online");
  return t("Классика", "Классика", "Classic");
}

function relativeTime(t, isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("только что", "жаңа ғана", "just now");
  if (minutes < 60) return `${minutes} ${t("мин", "мин", "min")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t("ч", "сағ", "h")}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t("дн", "күн", "d")}`;
}

export function MatchHistory({ t: _t }) {
  const t = _t ?? ((ru) => ru);
  const [open, setOpen] = useState(false);

  const history = matchHistoryStore.read().slice(0, 20);
  if (history.length === 0) return null;

  return (
    <div className="match-history">
      <button className="history-toggle" type="button" onClick={() => setOpen((o) => !o)}>
        <History size={15} strokeWidth={2.4} />
        <span>{t("История", "Тарих", "History")}</span>
        <small className="history-count">{history.length}</small>
        {open ? <ChevronUp size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
      </button>

      {open && (
        <ul className="history-list" aria-label={t("История матчей", "Матч тарихы", "Match history")}>
          {history.map((entry) => (
            <li key={entry.id} className={`history-entry ${entry.won ? "win" : "loss"}`}>
              <span className="history-badge">{entry.won ? t("В", "Ж", "W") : t("П", "Ж", "L")}</span>
              <span className="history-score">{entry.scoreBlue}:{entry.scoreRed}</span>
              <span className="history-info">
                <span>{entry.horseName}</span>
                <small>{modeLabel(t, entry.modeId)} · {goalLabel(t, entry.goalType)} · {entry.teamSize}v{entry.teamSize}</small>
              </span>
              <span className="history-xp">+{entry.xpGain} XP</span>
              <span className="history-time">{relativeTime(t, entry.playedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
