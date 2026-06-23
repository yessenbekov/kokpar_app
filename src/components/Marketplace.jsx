import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, X } from "lucide-react";
import { itemById, SHOP_HORSES } from "../app/shopItems.js";
import { fetchActiveListings, fetchMyListings, purchaseListing } from "../app/marketplaceStore.js";

function formatCoins(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

const SLOT_LABELS = {
  saddle: "Седло",
  bridle: "Узда",
  blanket: "Попона",
  legWraps: "Бинты"
};

function horseTypeName(typeId) {
  const horse = SHOP_HORSES.find((h) => h.typeId === typeId);
  if (horse) return horse.name;
  if (typeId === "argymak") return "Арғымақ";
  return typeId ?? "Лошадь";
}

function tierStars(tier) {
  return "★".repeat(Math.max(1, Math.min(tier ?? 1, 5)));
}

function ListingCard({ listing, profile, onPurchase, onCancel, isOwn }) {
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");

  const item = listing.item_type === "equipment" ? itemById(listing.item_id) : null;
  const canAfford = profile.coins >= listing.price;

  async function handleBuy() {
    if (!confirmBuy) {
      setConfirmBuy(true);
      return;
    }
    setBuying(true);
    setBuyError("");
    try {
      const result = await purchaseListing(listing.id);
      onPurchase(result, listing.price);
    } catch (err) {
      setBuyError(err.message ?? "Ошибка покупки");
      setConfirmBuy(false);
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="listing-card">
      <div className="listing-card-type">
        {listing.item_type === "equipment"
          ? SLOT_LABELS[listing.slot_key] ?? listing.slot_key
          : "Лошадь"}
      </div>
      <div className="listing-card-name">
        {listing.item_type === "equipment"
          ? (item?.name ?? listing.item_id)
          : `${horseTypeName(listing.horse_type_id)} · ${listing.horse_name}`}
      </div>
      {listing.item_type === "equipment" && item && (
        <div className="listing-card-tier">{tierStars(item.tier)}</div>
      )}
      {listing.item_type === "horse" && (
        <div className="listing-card-tier">Ур. {listing.horse_level ?? 1}</div>
      )}
      <div className="listing-card-seller">Продавец: {listing.seller_name}</div>
      <div className="listing-card-price">
        <span className="coin-icon">₸</span>
        <strong>{formatCoins(listing.price)}</strong>
      </div>

      {buyError && <div className="listing-buy-error">{buyError}</div>}

      {isOwn ? (
        <button
          type="button"
          className="listing-cancel-btn"
          onClick={() => onCancel(listing.id)}
        >
          Снять с торгов
        </button>
      ) : confirmBuy ? (
        <div className="listing-confirm-row">
          <span>Купить за {formatCoins(listing.price)} ₸?</span>
          <button
            type="button"
            className="listing-confirm-yes"
            onClick={handleBuy}
            disabled={buying}
          >
            {buying ? "..." : "Да"}
          </button>
          <button
            type="button"
            className="listing-confirm-no"
            onClick={() => { setConfirmBuy(false); setBuyError(""); }}
            disabled={buying}
          >
            Нет
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="listing-buy-btn"
          onClick={handleBuy}
          disabled={!canAfford}
          title={!canAfford ? "Недостаточно монет" : undefined}
        >
          {canAfford ? "Купить" : "Недостаточно монет"}
        </button>
      )}
    </div>
  );
}

function SellModal({ draft, onSubmit, onCancel }) {
  const [price, setPrice] = useState(draft.defaultPrice ?? 200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const item = draft.itemType === "equipment" ? itemById(draft.itemId) : null;
  const label = draft.itemType === "equipment"
    ? (item?.name ?? draft.itemId ?? "Снаряжение")
    : (draft.horseName ?? "Лошадь");

  async function handleSubmit(e) {
    e.preventDefault();
    const parsedPrice = Math.round(Number(price));
    if (!parsedPrice || parsedPrice < 1) {
      setError("Введите цену >= 1");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(draft.itemType, draft.itemId ?? null, draft.slotKey ?? null, draft.horseId ?? null, parsedPrice);
    } catch (err) {
      setError(err.message ?? "Ошибка");
      setSubmitting(false);
    }
  }

  return (
    <div className="listing-form-overlay">
      <div className="listing-form-modal">
        <div className="listing-form-header">
          <ShoppingBag size={16} strokeWidth={2.4} />
          <span>Выставить лот</span>
          <button type="button" className="listing-form-close" onClick={onCancel} aria-label="Закрыть">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <div className="listing-form-item">{label}</div>
        {item && (
          <div className="listing-form-slot">
            {SLOT_LABELS[item.slot] ?? item.slot} · {tierStars(item.tier)}
          </div>
        )}
        <form onSubmit={handleSubmit} className="listing-form-body">
          <input
            type="number"
            min="1"
            step="1"
            className="listing-price-input"
            placeholder="Цена в монетах"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Цена"
            autoFocus
          />
          {error && <div className="listing-buy-error">{error}</div>}
          <div className="listing-form-actions">
            <button type="submit" className="listing-submit-btn" disabled={submitting}>
              {submitting ? "Выставляем..." : "Выставить"}
            </button>
            <button type="button" className="listing-cancel-btn" onClick={onCancel} disabled={submitting}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Marketplace({ profile, listingDraft, onPurchase, onListItem, onCancelListing }) {
  const [tab, setTab] = useState("browse");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeDraft, setActiveDraft] = useState(listingDraft ?? null);

  // Open sell modal when listingDraft prop changes
  useEffect(() => {
    if (listingDraft) {
      setActiveDraft(listingDraft);
    }
  }, [listingDraft]);

  async function loadListings() {
    setLoading(true);
    setError("");
    try {
      const [all, mine] = await Promise.all([fetchActiveListings(), fetchMyListings()]);
      setListings(all);
      setMyListings(mine);
    } catch (err) {
      setError(err.message ?? "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, [tab]);

  const myIds = new Set(myListings.map((l) => l.id));

  const filteredListings = listings.filter((l) => {
    if (filterType === "equipment") return l.item_type === "equipment";
    if (filterType === "horse") return l.item_type === "horse";
    return true;
  });

  async function handlePurchase(result, cost) {
    onPurchase?.(result, cost);
    await loadListings();
  }

  async function handleCancel(listingId) {
    try {
      await onCancelListing?.(listingId);
      await loadListings();
    } catch (err) {
      setError(err.message ?? "Ошибка отмены");
    }
  }

  async function handleListItem(itemType, itemId, slotKey, horseId, price) {
    await onListItem?.(itemType, itemId, slotKey, horseId, price);
    setActiveDraft(null);
    await loadListings();
  }

  return (
    <div className="marketplace-panel">
      {activeDraft && (
        <SellModal
          draft={activeDraft}
          onSubmit={handleListItem}
          onCancel={() => setActiveDraft(null)}
        />
      )}

      <div className="marketplace-header">
        <div className="marketplace-balance">
          <span className="coin-icon">₸</span>
          <strong>{formatCoins(profile.coins)}</strong>
          <span className="marketplace-balance-label">монет</span>
        </div>
        <div className="marketplace-tabs">
          <button
            type="button"
            className={tab === "browse" ? "stable-tab-btn active" : "stable-tab-btn"}
            onClick={() => setTab("browse")}
          >
            Площадка
          </button>
          <button
            type="button"
            className={tab === "mine" ? "stable-tab-btn active" : "stable-tab-btn"}
            onClick={() => setTab("mine")}
          >
            Мои торги {myListings.length > 0 && `(${myListings.length})`}
          </button>
        </div>
      </div>

      {tab === "browse" && (
        <>
          <div className="market-filter-row">
            {[["all", "Всё"], ["equipment", "Снаряжение"], ["horse", "Лошади"]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filterType === key ? "market-filter-btn active" : "market-filter-btn"}
                onClick={() => setFilterType(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="marketplace-loading">
              <Loader2 size={20} strokeWidth={2.2} className="spin-icon" />
              <span>Загрузка...</span>
            </div>
          ) : error ? (
            <div className="marketplace-error">{error}</div>
          ) : filteredListings.length === 0 ? (
            <div className="marketplace-empty">Нет активных лотов</div>
          ) : (
            <div className="listing-grid">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  profile={profile}
                  onPurchase={handlePurchase}
                  onCancel={handleCancel}
                  isOwn={myIds.has(listing.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <>
          {loading ? (
            <div className="marketplace-loading">
              <Loader2 size={20} strokeWidth={2.2} className="spin-icon" />
              <span>Загрузка...</span>
            </div>
          ) : error ? (
            <div className="marketplace-error">{error}</div>
          ) : myListings.length === 0 ? (
            <div className="marketplace-empty">У вас нет активных лотов</div>
          ) : (
            <div className="listing-grid">
              {myListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  profile={profile}
                  onPurchase={handlePurchase}
                  onCancel={handleCancel}
                  isOwn={true}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
