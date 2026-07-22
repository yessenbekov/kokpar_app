import { Star, Target, Sword } from "lucide-react";

export function MatchReward({ reward, onRestart, onLobby }) {
  if (!reward) return null;

  const { won, scoreBlue, scoreRed, teamSide, playerGoals, playerSteals, xpGain, coinsGain, leveledUp, newLevel, horseName } = reward;

  const playerScore = teamSide === "red" ? scoreRed : scoreBlue;
  const opponentScore = teamSide === "red" ? scoreBlue : scoreRed;

  return (
    <div className="match-result-overlay" role="dialog" aria-modal="true" aria-label="Итоги матча">
      <div className="match-result-card">
        <div className={`match-result-outcome ${won ? "match-result-outcome--win" : "match-result-outcome--lose"}`}>
          {won ? "ПОБЕДА" : "ПОРАЖЕНИЕ"}
        </div>

        <div className="match-result-score">
          <span className={teamSide === "blue" ? "match-result-score__team--active" : ""}>{scoreBlue}</span>
          <span className="match-result-score__sep">:</span>
          <span className={teamSide === "red" ? "match-result-score__team--active" : ""}>{scoreRed}</span>
        </div>

        <div className="match-result-stats">
          <div className="match-result-stat">
            <Target size={16} strokeWidth={2} />
            <span className="match-result-stat__label">Голы</span>
            <span className="match-result-stat__value">{playerGoals}</span>
          </div>
          <div className="match-result-stat">
            <Sword size={16} strokeWidth={2} />
            <span className="match-result-stat__label">Отборы</span>
            <span className="match-result-stat__value">{playerSteals}</span>
          </div>
        </div>

        <div className="match-result-rewards">
          <div className="match-result-reward-row">
            <span className="match-result-reward-row__label">Опыт</span>
            <span className="match-result-reward-row__value match-result-reward-row__value--xp">+{xpGain} XP</span>
          </div>
          {coinsGain > 0 && (
            <div className="match-result-reward-row">
              <span className="match-result-reward-row__label">Монеты</span>
              <span className="match-result-reward-row__value match-result-reward-row__value--coins">+{coinsGain}</span>
            </div>
          )}
          <div className="match-result-reward-row">
            <span className="match-result-reward-row__label">Связь с {horseName}</span>
            <span className="match-result-reward-row__value">+1</span>
          </div>
          {leveledUp && (
            <div className="match-result-levelup">
              <Star size={14} strokeWidth={2.5} />
              <span>{horseName} достиг уровня {newLevel}!</span>
            </div>
          )}
        </div>

        <div className="match-result-actions">
          <button className="match-result-btn match-result-btn--secondary" type="button" onClick={onLobby}>
            В конюшню
          </button>
          <button className="match-result-btn match-result-btn--primary" type="button" onClick={onRestart}>
            Ещё раз
          </button>
        </div>
      </div>
    </div>
  );
}
