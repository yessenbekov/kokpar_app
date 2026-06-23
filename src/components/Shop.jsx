import { useState } from "react";
import { Coins } from "lucide-react";
import { HORSE_TYPES, horseTypeById } from "../game/horseTypes.js";
import { SHOP_HORSES, SHOP_ITEMS, itemById } from "../app/shopItems.js";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

const EQUIPMENT_SECTIONS = [
  { slot: "saddle", label: "Седло" },
  { slot: "bridle", label: "Узда" },
  { slot: "blanket", label: "Попона" },
  { slot: "legWraps", label: "Бинты" }
];

function itemsForSlot(slot) {
  return SHOP_ITEMS.filter((item) => item.slot === slot);
}

function paletteStyle(horse) {
  const palette = horse.palette.blue;
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

export function Shop({ profile, selectedHorseId, onBuyItem, onBuyHorse }) {
  const [activeTab, setActiveTab] = useState("equipment");

  const selectedOwnedHorse = profile.ownedHorses.find((h) => h.id === selectedHorseId) ?? profile.ownedHorses[0];
  const horseType = horseTypeById(selectedOwnedHorse?.typeId);
  const equipment = selectedOwnedHorse?.equipment ?? {};
  const coins = profile.coins ?? 0;

  return (
    <div className="shop-panel">
      <div className="shop-coin-balance">
        <Coins size={15} strokeWidth={2.5} />
        <span>{formatCoins(coins)} күміс</span>
      </div>

      <div className="shop-tabs">
        <button
          type="button"
          className={activeTab === "equipment" ? "stable-tab-btn active" : "stable-tab-btn"}
          onClick={() => setActiveTab("equipment")}
        >
          Снаряжение
        </button>
        <button
          type="button"
          className={activeTab === "horses" ? "stable-tab-btn active" : "stable-tab-btn"}
          onClick={() => setActiveTab("horses")}
        >
          Лошади
        </button>
      </div>

      {activeTab === "equipment" && (
        <div className="shop-equipment-tab">
          <div className="shop-current-horse">
            <HorseToken horse={horseType} />
            <span>
              Снаряжение для: <strong>{selectedOwnedHorse?.name ?? horseType.name}</strong>
            </span>
          </div>

          {EQUIPMENT_SECTIONS.map(({ slot, label }) => (
            <div key={slot} className="shop-section">
              <h3 className="shop-section-title">{label}</h3>
              <div className="shop-items-grid">
                {itemsForSlot(slot).map((item) => {
                  const isEquipped = equipment[slot] === item.id;
                  const canAfford = coins >= item.price;

                  return (
                    <div key={item.id} className={isEquipped ? "shop-item-card equipped" : "shop-item-card"}>
                      <div className="shop-item-tier">Ур. {item.tier}</div>
                      <strong className="shop-item-name">{item.name}</strong>
                      <p className="shop-item-desc">{item.description}</p>
                      <div className="shop-item-footer">
                        <span className="shop-item-price">
                          <Coins size={12} strokeWidth={2.5} />
                          {formatCoins(item.price)}
                        </span>
                        {isEquipped ? (
                          <span className="equipped-badge">Надето</span>
                        ) : (
                          <button
                            type="button"
                            className="shop-buy-btn"
                            disabled={!canAfford}
                            onClick={() => onBuyItem(selectedOwnedHorse.id, slot, item.id, item.price)}
                          >
                            Купить и надеть
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "horses" && (
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
      )}
    </div>
  );
}
