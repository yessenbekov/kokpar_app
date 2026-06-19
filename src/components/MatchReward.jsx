import { useEffect } from "react";
import { ChevronUp, Star } from "lucide-react";

export function MatchReward({ reward, onDismiss }) {
  useEffect(() => {
    if (!reward) return;
    const t = setTimeout(onDismiss, 5500);
    return () => clearTimeout(t);
  }, [reward, onDismiss]);

  if (!reward) return null;

  return (
    <button className="match-reward" type="button" onClick={onDismiss} aria-label="Закрыть награду">
      {reward.leveledUp ? (
        <Star size={20} strokeWidth={2.4} />
      ) : (
        <ChevronUp size={20} strokeWidth={2.5} />
      )}
      <div className="match-reward-body">
        <strong>{reward.horseName}</strong>
        <span>
          {reward.leveledUp
            ? `Уровень ${reward.newLevel} — +${reward.xpGain} XP`
            : `+${reward.xpGain} XP`}
        </span>
      </div>
    </button>
  );
}
