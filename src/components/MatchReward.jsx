import { Star, Target, Sword } from "lucide-react";

function getLang() {
  try { return localStorage.getItem("kokpar_lang") || "ru"; } catch { return "ru"; }
}

function t(ru, kz, en) {
  const lang = getLang();
  if (lang === "kz") return kz ?? ru;
  if (lang === "en") return en ?? ru;
  return ru;
}

export function MatchReward({ reward, onRestart, onLobby }) {
  if (!reward) return null;

  const { won, scoreBlue, scoreRed, teamSide, playerGoals, playerSteals, xpGain, coinsGain, dailyBonusCoins, leveledUp, newLevel, horseName } = reward;

  return (
    <div className="mr-overlay" role="dialog" aria-modal="true" aria-label={t("Итоги матча", "Матч нәтижесі", "Match Results")}>
      <div className="mr-card">
        <div className="mr-top">
          <div className="mr-outcome-badge" data-won={won ? "true" : "false"}>
            {won
              ? t("ПОБЕДА", "ЖЕҢІС", "VICTORY")
              : t("ПОРАЖЕНИЕ", "ЖЕҢІЛІС", "DEFEAT")
            }
          </div>

          <div className="mr-score-row">
            <div className={`mr-score-team mr-score-team--blue${teamSide === "blue" ? " mr-score-team--active" : ""}`}>
              {scoreBlue}
            </div>
            <div className="mr-score-sep">{t("vs", "vs", "vs")}</div>
            <div className={`mr-score-team mr-score-team--red${teamSide === "red" ? " mr-score-team--active" : ""}`}>
              {scoreRed}
            </div>
          </div>

          <div className="mr-score-labels">
            <span>{t("Синие", "Көк", "Blue")}</span>
            <span style={{ opacity: 0 }}>·</span>
            <span>{t("Красные", "Қызыл", "Red")}</span>
          </div>
        </div>

        <div className="mr-body">
          <div className="mr-stats-panel">
            <div className="mr-stat-item">
              <span className="mr-stat-label"><Target size={13} strokeWidth={2.2} /> {t("Голы", "Голдер", "Goals")}</span>
              <span className="mr-stat-value">{playerGoals}</span>
            </div>
            <div className="mr-stat-item">
              <span className="mr-stat-label"><Sword size={13} strokeWidth={2.2} /> {t("Отборы", "Тартыстар", "Steals")}</span>
              <span className="mr-stat-value">{playerSteals}</span>
            </div>
            <div className="mr-stat-item">
              <span className="mr-stat-label">{t("XP", "XP", "XP")}</span>
              <span className="mr-stat-value mr-stat-value--xp">+{xpGain}</span>
            </div>
            {(coinsGain ?? 0) > 0 && (
              <div className="mr-stat-item">
                <span className="mr-stat-label">⌾</span>
                <span className="mr-stat-value mr-stat-value--coins">+{coinsGain}</span>
              </div>
            )}
          </div>

          {dailyBonusCoins > 0 && (
            <div className="mr-daily-row">
              <span>🎁 {t("Ежедневный бонус", "Күнделікті бонус", "Daily bonus")}</span>
              <span className="mr-daily-val">+{dailyBonusCoins} ⌾</span>
            </div>
          )}

          <div className="mr-bond-row">
            <span className="mr-bond-text">{t(`Связь с ${horseName}`, `${horseName} байланысы`, `Bond with ${horseName}`)}</span>
            <span className="mr-bond-val">+1</span>
          </div>

          {leveledUp && (
            <div className="mr-levelup">
              <Star size={14} strokeWidth={2.5} />
              <span>{t(`${horseName} достиг уровня ${newLevel}!`, `${horseName} ${newLevel} деңгейге жетті!`, `${horseName} reached level ${newLevel}!`)}</span>
            </div>
          )}
        </div>

        <div className="mr-actions">
          <button className="mr-btn mr-btn--secondary" type="button" onClick={onLobby}>
            {t("В конюшню", "Қораға", "To Stable")}
          </button>
          <button className="mr-btn mr-btn--primary" type="button" onClick={onRestart}>
            {t("Ещё раз", "Тағы рет", "Play again")}
          </button>
        </div>
      </div>
    </div>
  );
}
