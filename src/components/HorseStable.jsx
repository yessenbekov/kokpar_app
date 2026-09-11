import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { COAT_PRESETS, DEFAULT_HORSE_TYPE_ID, HORSE_TYPES, horseTypeById } from "../game/horseTypes.js";
import { itemById } from "../app/shopItems.js";
import { HorseViewer3D } from "./HorseViewer3D.jsx";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ratingFor(score) {
  return Math.round(clamp(score * 72, 45, 96));
}

function statRowsFor(horse) {
  const s = horse.stats;
  return [
    { label: "Скорость",  score: s.speed },
    { label: "Разгон",    score: s.acceleration },
    { label: "Поворот",   score: (s.turn + s.grip + s.brake) / 3 },
    { label: "Стамина",   score: (1 / s.staminaDrain + s.staminaRecovery) / 2 },
    { label: "Борьба",    score: (s.contestPower + s.tacklePower + s.bodyCheckPower + s.stability) / 4 },
    { label: "Стойкость", score: (s.carrySpeed + s.contestPower) / 2 },
  ];
}

function paletteStyle(horse) {
  const p = horse.palette;
  return { "--coat": p.coat, "--dark": p.dark, "--muzzle": p.muzzle, "--mark": p.marking };
}

function recordRowsFor(record = {}) {
  return [
    ["Матчи",   record.matches ?? 0],
    ["Победы",  record.wins ?? 0],
    ["Голы",    record.goals ?? 0],
    ["Отборы",  record.steals ?? 0],
  ];
}

const EQUIP_SLOTS = [
  ["saddle",   "Ер"],
  ["bridle",   "Жүген"],
  ["blanket",  "Тоқым"],
  ["legWraps", "Бинты"],
];

const SLOT_LABELS = { saddle: "Седло", bridle: "Узда", blanket: "Попона", legWraps: "Бинты" };

export function HorseStable({
  horseId,
  ownedHorses = [],
  stableCapacity = 6,
  profile,
  onHorseChange,
  onHorseRename,
  onHorseCreate,
  onHorseDelete,
  onEquipItem,
  onListEquipment,
  onListHorse,
  onEquipFromInventory,
  onGoToShop,
  onGoToMatch,
  onCardOpenChange,
}) {
  const stableHorses = ownedHorses.length > 0 ? ownedHorses : [];
  const selectedOwnedHorse = stableHorses.find((h) => h.id === horseId) ?? stableHorses[0];
  const selectedHorse = horseTypeById(selectedOwnedHorse?.typeId);
  const canAddMore = stableHorses.length < stableCapacity;
  const canDelete = stableHorses.length > 1;

  const [showCard, setShowCard] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(selectedOwnedHorse?.name ?? "");
  const [creating, setCreating] = useState(false);
  const [createTypeId, setCreateTypeId] = useState(DEFAULT_HORSE_TYPE_ID);
  const [createCoatId, setCreateCoatId] = useState(horseTypeById(DEFAULT_HORSE_TYPE_ID).defaultCoatId);
  const [createName, setCreateName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [equipPickerId, setEquipPickerId] = useState(null);

  useEffect(() => {
    setEditing(false);
    setDraftName(selectedOwnedHorse?.name ?? "");
    setConfirmDelete(false);
  }, [selectedOwnedHorse?.id, selectedOwnedHorse?.name]);

  useEffect(() => {
    onCardOpenChange?.(showCard);
  }, [showCard]);

  function submitName(e) {
    e.preventDefault();
    const next = draftName.trim();
    if (!next || !selectedOwnedHorse) return;
    onHorseRename?.(selectedOwnedHorse.id, next);
    setEditing(false);
  }

  function submitCreate(e) {
    e.preventDefault();
    const name = createName.trim() || horseTypeById(createTypeId).name;
    onHorseCreate?.(createTypeId, name, createCoatId);
    setCreating(false);
    setCreateName("");
    setCreateTypeId(DEFAULT_HORSE_TYPE_ID);
    setCreateCoatId(horseTypeById(DEFAULT_HORSE_TYPE_ID).defaultCoatId);
  }

  function handleDelete() {
    onHorseDelete?.(selectedOwnedHorse.id);
    setConfirmDelete(false);
    setShowCard(false);
  }

  /* ───────────────────────────────────────────
     1e — Horse card screen
  ─────────────────────────────────────────── */
  if (showCard && selectedOwnedHorse) {
    const horse = selectedHorse;
    const owned = selectedOwnedHorse;
    const equipment = owned.equipment ?? {};
    const statRows = statRowsFor(horse);
    const xpPct = Math.round((owned.xp / 100) * 100);
    const recordRows = recordRowsFor(owned.record);

    return (
      <div className="horse-card-screen">

        {/* Hero 300px */}
        <div className="horse-card-hero">
          <div className="horse-card-hero-bg" />
          <HorseViewer3D coatId={owned.coatId} />

          {/* Floating back button */}
          <button
            type="button"
            className="horse-card-back"
            onClick={() => setShowCard(false)}
          >‹</button>

          {/* Gradient overlay with horse info */}
          <div className="horse-card-hero-overlay">
            <div className="horse-card-breed">{horse.role} · {horse.name}</div>
            <div className="horse-card-name-row">
              {editing ? (
                <form className="horse-name-form" onSubmit={submitName} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    aria-label="Имя лошади"
                    maxLength={24}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    style={{ background: "rgba(0,0,0,.5)", border: "1px solid rgba(208,160,48,.4)", borderRadius: 6, padding: "4px 8px", color: "#f2e2b8", font: "600 18px Oswald, sans-serif", width: 140 }}
                    autoFocus
                  />
                  <button type="submit" style={{ background: "none", border: "none", color: "#f0c347", cursor: "pointer" }}><Check size={16} strokeWidth={2.7} /></button>
                  <button type="button" style={{ background: "none", border: "none", color: "rgba(214,178,110,.7)", cursor: "pointer" }} onClick={() => setEditing(false)}><X size={16} strokeWidth={2.7} /></button>
                </form>
              ) : (
                <>
                  <span className="horse-card-name">{owned.name}</span>
                  <span className="horse-card-tier-badge">Тир {horse.tier}</span>
                  <button type="button" className="horse-card-edit-btn" onClick={() => { setDraftName(owned.name); setEditing(true); }}>
                    <Pencil size={13} strokeWidth={2.4} />
                  </button>
                </>
              )}
            </div>
            <div className="horse-card-traits">
              <span>{horse.stable?.line ?? horse.name}</span>
              <span>Связь {owned.bond ?? 0}/100</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="horse-card-content">

          {/* XP row */}
          <div className="horse-card-xp-row">
            <span className="horse-card-xp-label">Ур. {owned.level}</span>
            <span className="horse-card-xp-bar">
              <span className="horse-card-xp-fill" style={{ width: `${xpPct}%` }} />
            </span>
            <span className="horse-card-xp-val">{owned.xp} / 100</span>
          </div>

          {/* Stats grid 2 columns */}
          <div className="horse-card-stats">
            {statRows.map((row) => {
              const r = ratingFor(row.score);
              return (
                <div key={row.label} className="horse-card-stat-row">
                  <span className="horse-card-stat-label">{row.label}</span>
                  <span className="horse-card-stat-bar">
                    <span className="horse-card-stat-fill" style={{ width: `${r}%` }} />
                  </span>
                  <span className="horse-card-stat-val">{r}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom panels */}
          <div className="horse-card-panels">

            {/* Статистика */}
            <div className="horse-card-panel">
              <div className="horse-card-panel-title">Статистика</div>
              <div className="horse-card-panel-grid">
                {recordRows.map(([label, value]) => (
                  <div key={label} className="horse-card-panel-cell">
                    <div className="horse-card-panel-cell-label">{label}</div>
                    <div className="horse-card-panel-cell-val">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Экипировка */}
            <div className="horse-card-panel">
              <div className="horse-card-panel-title">Экипировка</div>
              <div className="horse-card-panel-grid">
                {EQUIP_SLOTS.map(([key, label]) => {
                  const equippedId = equipment[key];
                  const item = equippedId ? itemById(equippedId) : null;
                  return (
                    <div
                      key={key}
                      className={item ? "horse-card-panel-cell equipped" : "horse-card-panel-cell empty"}
                    >
                      <div className="horse-card-panel-cell-label">{label}</div>
                      {item ? (
                        <div className="horse-card-panel-cell-val equipped-name">{item.name}</div>
                      ) : (
                        <div className="horse-card-panel-cell-val empty-val">пусто</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inventory */}
          {(profile?.inventory ?? []).length > 0 && (
            <div className="horse-card-inventory">
              <div className="horse-card-panel-title">Инвентарь</div>
              {(profile.inventory ?? []).map((itemId) => {
                const it = itemById(itemId);
                if (!it) return null;
                return (
                  <div className="horse-card-inv-item" key={itemId}>
                    <span>{it.name}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {equipPickerId === itemId ? (
                        <>
                          {EQUIP_SLOTS.map(([k, l]) => (
                            <button key={k} type="button" className="horse-card-inv-btn" onClick={() => { onEquipFromInventory?.(owned.id, k, itemId); setEquipPickerId(null); }}>{l}</button>
                          ))}
                          <button type="button" className="horse-card-inv-btn" onClick={() => setEquipPickerId(null)}><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="horse-card-inv-btn" onClick={() => setEquipPickerId(itemId)}>Надеть</button>
                          <button type="button" className="horse-card-inv-btn sell" onClick={() => onListEquipment?.(null, it.slot, itemId)}>На торги</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delete */}
          {canDelete && (
            confirmDelete ? (
              <div className="horse-delete-confirm">
                <span>Удалить {owned.name}?</span>
                <button type="button" className="horse-delete-yes" onClick={handleDelete}>Удалить</button>
                <button type="button" onClick={() => setConfirmDelete(false)}>Отмена</button>
              </div>
            ) : (
              <button type="button" className="horse-delete-trigger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} strokeWidth={2.3} />
                <span>Удалить лошадь</span>
              </button>
            )
          )}

          <div style={{ height: 16 }} />
        </div>

        {/* Footer */}
        <div className="horse-card-footer">
          <button
            type="button"
            className="horse-card-footer-btn secondary"
            onClick={() => onListHorse?.(owned.id)}
            disabled={!canDelete}
          >
            Продать
          </button>
          <button
            type="button"
            className="horse-card-footer-btn primary"
            onClick={() => { onHorseChange?.(owned.id); setShowCard(false); onGoToMatch?.(); }}
          >
            Выбрать
          </button>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────────
     1d — Stable list screen
  ─────────────────────────────────────────── */
  return (
    <div className="stable-screen">

      {/* Horse list */}
      <div className="stable-horse-list">
        {stableHorses.map((ownedHorse) => {
          const horse = horseTypeById(ownedHorse.typeId);
          const active = selectedOwnedHorse?.id === ownedHorse.id;
          const xpPct = Math.round((ownedHorse.xp / 100) * 100);

          return (
            <div key={ownedHorse.id} className="stable-card-row">
              <button
                className={active ? "stable-card active" : "stable-card"}
                type="button"
                onClick={() => { onHorseChange(ownedHorse.id); setShowCard(true); }}
              >
                <div className="stable-card-thumb" />
                <div className="stable-card-copy">
                  <div className="stable-card-name-row">
                    <strong>{ownedHorse.name}</strong>
                    <span className="stable-tier-badge">{horse.tier}</span>
                  </div>
                  <span className="stable-card-sub">{horse.name} · {horse.role} · Ур. {ownedHorse.level}</span>
                  <span className="stable-card-xp">
                    <span className="stable-card-xp-fill" style={{ width: `${xpPct}%` }} />
                  </span>
                </div>
                {active && <span className="stable-card-selected">Выбран</span>}
              </button>
            </div>
          );
        })}

        {/* Add horse */}
        {creating ? (
          <form className="horse-create-form" onSubmit={submitCreate}>
            <div className="horse-type-picker">
              {HORSE_TYPES.map((ht) => (
                <button
                  key={ht.id}
                  type="button"
                  className={createTypeId === ht.id ? "horse-type-choice active" : "horse-type-choice"}
                  onClick={() => { setCreateTypeId(ht.id); setCreateCoatId(ht.defaultCoatId); }}
                >
                  <span style={{ fontFamily: "Oswald", fontWeight: 600 }}>{ht.name}</span>
                  <small style={{ color: "rgba(214,178,110,.7)", fontSize: 11 }}>{ht.role}</small>
                </button>
              ))}
            </div>
            <div className="coat-picker">
              {COAT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={createCoatId === preset.id ? "coat-swatch selected" : "coat-swatch"}
                  style={{ background: preset.coat }}
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => setCreateCoatId(preset.id)}
                />
              ))}
            </div>
            <div className="horse-create-row">
              <input
                className="horse-create-input"
                placeholder={horseTypeById(createTypeId).name}
                maxLength={24}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                aria-label="Имя новой лошади"
                autoFocus
              />
              <button type="submit" aria-label="Создать лошадь"><Check size={15} strokeWidth={2.7} /></button>
              <button type="button" aria-label="Отмена" onClick={() => { setCreating(false); setCreateName(""); }}>
                <X size={15} strokeWidth={2.7} />
              </button>
            </div>
          </form>
        ) : (
          canAddMore && (
            <button className="add-horse-button" type="button" onClick={() => setCreating(true)}>
              <span>+ Купить лошадь</span>
            </button>
          )
        )}

        {/* Empty stall slots */}
        {!creating && Array.from({ length: Math.max(0, stableCapacity - stableHorses.length - 1) }).map((_, i) => (
          <div key={`empty-${i}`} className="stable-empty-slot">
            <div className="stable-empty-thumb" />
            <span className="stable-empty-label">Свободное стойло</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="horse-card-footer">
        <button type="button" className="horse-card-footer-btn secondary" onClick={onGoToShop}>
          Магазин
        </button>
        <button type="button" className="horse-card-footer-btn primary" onClick={onGoToMatch}>
          К матчу
        </button>
      </div>
    </div>
  );
}
