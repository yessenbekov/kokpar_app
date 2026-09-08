import { Coins } from "lucide-react";
import { horseTypeById } from "../game/horseTypes.js";
import { SHOP_HORSES } from "../app/shopItems.js";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function paletteStyle(horse) {
  const palette = horse.palette;
  return {
    "--coat": palette.coat,
    "--dark": palette.dark,
    "--muzzle": palette.muzzle,
    "--mark": palette.marking
  };
}

function HorseToken({ horse }) {
  return (
    <span className="horse-token" style={paletteStyle(horse)} aria-hidden="true">
      <span className="horse-token-body" />
      <span className="horse-token-head" />
      <span className="horse-token-mark" />
    </span>
  );
}

export function Shop({ profile, onBuyHorse }) {
  const coins = profile.coins ?? 0;

  return (
    <div className="shop-panel">
      <div className="shop-coin-balance">
        <Coins size={15} strokeWidth={2.5} />
        <span>{formatCoins(coins)} күміс</span>
      </div>

      <div className="shop-horses-tab">
        {SHOP_HORSES.map((shopHorse) => {
          const ht = horseTypeById(shopHorse.typeId);
          const alreadyOwned = profile.ownedHorses.some((h) => h.typeId === shopHorse.typeId);
          const canAfford = coins >= shopHorse.price;

          return (
            <div key={shopHorse.typeId} className="shop-horse-card">
              <HorseToken horse={ht} />
              <div className="shop-horse-info">
                <strong>{shopHorse.name}</strong>
                <span className="shop-horse-role">{shopHorse.role}</span>
                <p className="shop-horse-desc">{shopHorse.description}</p>
              </div>
              <div className="shop-horse-action">
                <span className="shop-item-price">
                  <Coins size={12} strokeWidth={2.5} />
                  {formatCoins(shopHorse.price)}
                </span>
                {alreadyOwned ? (
                  <span className="equipped-badge">Имеется</span>
                ) : (
                  <button
                    type="button"
                    className="shop-buy-btn"
                    disabled={!canAfford}
                    onClick={() => onBuyHorse(shopHorse.typeId, shopHorse.name, shopHorse.price)}
                  >
                    Купить
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
