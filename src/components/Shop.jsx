import { useState } from "react";
import { horseTypeById } from "../game/horseTypes.js";
import { SHOP_HORSES } from "../app/shopItems.js";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function ratingFor(score) { return Math.round(clamp(score * 72, 45, 96)); }

function statRows(horse) {
  const s = horse.stats;
  return [
    { id: "speed",    label: "СКОРОСТЬ",  val: ratingFor(s.speed) },
    { id: "accel",    label: "РАЗГОН",    val: ratingFor(s.acceleration) },
    { id: "turn",     label: "ПОВОРОТ",   val: ratingFor((s.turn + s.grip + s.brake) / 3) },
    { id: "fight",    label: "БОРЬБА",    val: ratingFor((s.contestPower + s.tacklePower + s.bodyCheckPower + s.stability) / 4) },
    { id: "carry",    label: "УСТОЙЧ.",   val: ratingFor((s.carrySpeed + s.contestPower) / 2) },
    { id: "stamina",  label: "ВЫНОСЛ.",   val: ratingFor((1 / s.staminaDrain + s.staminaRecovery) / 2) },
  ];
}

const HORSE_IMAGE = {
  zhuyrik: "/images/modes/mode-kokpar.webp",
  auyr:    "/images/modes/mode-training.webp",
};

export function Shop({ profile, onBuyHorse, t: _t }) {
  const t = _t ?? ((ru) => ru);
  const coins = profile.coins ?? 0;
  const [detail, setDetail] = useState(null);

  const currentOwned = profile.ownedHorses?.find(h => h.id === (profile.horseId ?? profile.ownedHorses?.[0]?.id))
    ?? profile.ownedHorses?.[0];
  const currentType = currentOwned ? horseTypeById(currentOwned.typeId) : null;

  if (detail) {
    const shopHorse = detail;
    const ht = horseTypeById(shopHorse.typeId);
    const alreadyOwned = profile.ownedHorses.some(h => h.typeId === shopHorse.typeId);
    const canAfford = coins >= shopHorse.price;
    const shopRows = statRows(ht);
    const myRows = currentType ? statRows(currentType) : null;
    const bondVal = currentOwned?.bond ?? 0;
    const imgSrc = HORSE_IMAGE[shopHorse.typeId] ?? "/images/modes/mode-kokpar.webp";

    return (
      <div className="shop-detail-screen">
        {/* Header */}
        <div className="wizard-step-header" style={{ padding: "8px 0 14px" }}>
          <button type="button" className="wizard-back-btn" onClick={() => setDetail(null)}>‹</button>
          <span className="wizard-step-title">{t("Конюшня", "Қора", "Stable")}</span>
        </div>

        {/* Hero image */}
        <div className="shop-detail-hero">
          <img src={imgSrc} alt={shopHorse.name} className="shop-detail-hero-img" />
          <div className="shop-detail-hero-overlay" />
          <div className="shop-detail-hero-badges">
            {currentType && (
              <span className="shop-detail-badge-saddle">{t("В СЕДЛЕ", "ЕРДЕ", "IN SADDLE")} · {currentType.name}</span>
            )}
            {currentOwned && (
              <span className="shop-detail-badge-tier">{t("ТИР", "ТИР", "TIER")} {horseTypeById(currentOwned.typeId)?.tier} · {t("УР.", "ДЕҢ.", "LV.")} {currentOwned.level}</span>
            )}
          </div>
          <div className="shop-detail-horse-title">{shopHorse.name}</div>
        </div>

        {/* VS stats */}
        <div className="shop-detail-stats">
          <div className="shop-detail-vs-header">
            <span className="shop-detail-vs-left">{currentType?.name ?? "—"}</span>
            <span className="shop-detail-vs-center">VS</span>
            <span className="shop-detail-vs-right">{shopHorse.name}</span>
          </div>
          {shopRows.map((row, i) => {
            const myVal = myRows?.[i]?.val ?? 0;
            const shopVal = row.val;
            return (
              <div key={row.id} className="shop-detail-stat-row">
                <span className={`shop-stat-val left${myVal >= shopVal ? " better" : ""}`}>{myVal}</span>
                <span className="shop-stat-bar-wrap left">
                  <span className="shop-stat-bar-fill left" style={{ width: `${myVal}%` }} />
                </span>
                <span className="shop-stat-label">{row.label}</span>
                <span className="shop-stat-bar-wrap right">
                  <span className="shop-stat-bar-fill right" style={{ width: `${shopVal}%` }} />
                </span>
                <span className={`shop-stat-val right${shopVal > myVal ? " better" : ""}`}>{shopVal}</span>
              </div>
            );
          })}
          <div className="shop-detail-bond-row">
            <span className="shop-stat-label-solo">{t("СВЯЗЬ", "БАЙЛ.", "BOND")}</span>
            <span className="shop-stat-bar-wrap full">
              <span className="shop-stat-bar-fill bond" style={{ width: `${bondVal}%` }} />
            </span>
            <span className="shop-stat-val-solo">{bondVal}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="shop-detail-footer">
          {alreadyOwned ? (
            <div className="shop-detail-owned">{t("Уже в конюшне", "Қорада бар", "Already owned")}</div>
          ) : (
            <button
              type="button"
              className="shop-detail-buy-btn"
              disabled={!canAfford}
              onClick={() => { onBuyHorse(shopHorse.typeId, shopHorse.name, shopHorse.price); setDetail(null); }}
            >
              <span>{t("КУПИТЬ", "САТЫП АЛУ", "BUY")} {shopHorse.name}</span>
              <span className="shop-detail-price">{formatCoins(shopHorse.price)} ⌾</span>
            </button>
          )}
          <button type="button" className="shop-detail-equip-btn">
            {t("СНАРЯЖЕНИЕ", "ЖАБДЫҚ", "EQUIPMENT")} · 1/4
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-panel">
      <div className="shop-coin-balance">
        <span>{formatCoins(coins)} ⌾</span>
      </div>

      <div className="shop-horses-tab">
        {SHOP_HORSES.map((shopHorse) => {
          const ht = horseTypeById(shopHorse.typeId);
          const alreadyOwned = profile.ownedHorses.some(h => h.typeId === shopHorse.typeId);
          const canAfford = coins >= shopHorse.price;
          const imgSrc = HORSE_IMAGE[shopHorse.typeId] ?? "/images/modes/mode-kokpar.webp";

          return (
            <div
              key={shopHorse.typeId}
              className="shop-horse-card"
              onClick={() => setDetail(shopHorse)}
              style={{ cursor: "pointer" }}
            >
              <div className="shop-horse-thumb">
                <img src={imgSrc} alt={shopHorse.name} className="shop-horse-thumb-img" />
              </div>
              <div className="shop-horse-info">
                <strong>{shopHorse.name}</strong>
                <span className="shop-horse-role">{shopHorse.role}</span>
                <p className="shop-horse-desc">{shopHorse.description}</p>
              </div>
              <div className="shop-horse-action">
                <span className="shop-item-price">{formatCoins(shopHorse.price)} ⌾</span>
                {alreadyOwned ? (
                  <span className="equipped-badge">{t("Имеется", "Бар", "Owned")}</span>
                ) : (
                  <button
                    type="button"
                    className="shop-buy-btn"
                    disabled={!canAfford}
                    onClick={(e) => { e.stopPropagation(); onBuyHorse(shopHorse.typeId, shopHorse.name, shopHorse.price); }}
                  >
                    {t("Купить", "Сатып алу", "Buy")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
