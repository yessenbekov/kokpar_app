import { useEffect, useState } from "react";
import { Check, Gauge, Pencil, Plus, Trash2, X } from "lucide-react";
import { DEFAULT_HORSE_TYPE_ID, HORSE_TYPES, horseTypeById } from "../game/horseTypes.js";
import { itemById } from "../app/shopItems.js";
import { HorseViewer3D } from "./HorseViewer3D.jsx";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ratingFor(score) {
  return Math.round(clamp(score * 72, 45, 96));
}

function statRowsFor(horse) {
  const stats = horse.stats;

  return [
    { label: "Скорость", score: stats.speed },
    { label: "Разгон", score: stats.acceleration },
    { label: "Контроль", score: (stats.turn + stats.grip + stats.brake) / 3 },
    { label: "Сила", score: (stats.contestPower + stats.tacklePower + stats.bodyCheckPower + stats.stability) / 4 },
    { label: "Выносливость", score: (1 / stats.staminaDrain + stats.staminaRecovery) / 2 },
    { label: "Серке", score: (stats.carrySpeed + stats.contestPower) / 2 }
  ];
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

function HorsePreview({ horse }) {
  return (
    <div className="horse-portrait" style={paletteStyle(horse)} aria-hidden="true">
      <span className="horse-preview-shadow" />
      <span className="horse-preview-leg front" />
      <span className="horse-preview-leg back" />
      <span className="horse-preview-body" />
      <span className="horse-preview-neck" />
      <span className="horse-preview-head" />
      <span className="horse-preview-mane" />
      <span className="horse-preview-tail" />
      <span className="horse-preview-mark" />
    </div>
  );
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

const EQUIPMENT_LABELS = [
  ["saddle", "Седло"],
  ["bridle", "Узда"],
  ["blanket", "Попона"],
  ["legWraps", "Бинты"]
];

const SLOT_LABELS = {
  saddle: "Седло",
  bridle: "Узда",
  blanket: "Попона",
  legWraps: "Бинты"
};

function recordRowsFor(record = {}) {
  return [
    ["Матчи", record.matches ?? 0],
    ["Победы", record.wins ?? 0],
    ["Голы", record.goals ?? 0],
    ["Отборы", record.steals ?? 0]
  ];
}

function InventorySection({ inventory = [], horseId, onEquipFromInventory, onListEquipment }) {
  const [equipPickerId, setEquipPickerId] = useState(null);

  if (!inventory.length) return null;

  return (
    <div className="horse-inventory">
      <strong>Инвентарь</strong>
      {inventory.map((itemId) => {
        const item = itemById(itemId);
        if (!item) return null;
        return (
          <div className="inventory-item" key={itemId}>
            <span className="inventory-item-info">
              <b>{item.name}</b>
              <small>{SLOT_LABELS[item.slot] ?? item.slot}</small>
            </span>
            <div className="inventory-item-actions">
              {equipPickerId === itemId ? (
                <span className="inventory-slot-picker">
                  {EQUIPMENT_LABELS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="horse-list-btn"
                      onClick={() => {
                        onEquipFromInventory?.(horseId, key, itemId);
                        setEquipPickerId(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="horse-list-btn muted"
                    onClick={() => setEquipPickerId(null)}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="horse-list-btn"
                  onClick={() => setEquipPickerId(itemId)}
                >
                  Надеть
                </button>
              )}
              <button
                type="button"
                className="horse-list-btn sell"
                onClick={() => onListEquipment?.(null, item.slot, itemId)}
              >
                На торги
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  onEquipFromInventory
}) {
  const stableHorses = ownedHorses.length > 0 ? ownedHorses : [];
  const selectedOwnedHorse = stableHorses.find((horse) => horse.id === horseId) ?? stableHorses[0];
  const selectedHorse = horseTypeById(selectedOwnedHorse?.typeId);
  const equipment = selectedOwnedHorse?.equipment ?? {};
  const statRows = statRowsFor(selectedHorse);
  const xpProgress = selectedOwnedHorse ? clamp(selectedOwnedHorse.xp / 100, 0, 1) : 0;
  const recordRows = recordRowsFor(selectedOwnedHorse?.record);
  const canAddMore = stableHorses.length < stableCapacity;
  const canDelete = stableHorses.length > 1;
  const inventory = profile?.inventory ?? [];

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(selectedOwnedHorse?.name ?? "");
  const [creating, setCreating] = useState(false);
  const [createTypeId, setCreateTypeId] = useState(DEFAULT_HORSE_TYPE_ID);
  const [createName, setCreateName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEditing(false);
    setDraftName(selectedOwnedHorse?.name ?? "");
    setConfirmDelete(false);
  }, [selectedOwnedHorse?.id, selectedOwnedHorse?.name]);

  function submitName(event) {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName || !selectedOwnedHorse) return;
    onHorseRename?.(selectedOwnedHorse.id, nextName);
    setEditing(false);
  }

  function submitCreate(event) {
    event.preventDefault();
    const name = createName.trim() || horseTypeById(createTypeId).name;
    onHorseCreate?.(createTypeId, name);
    setCreating(false);
    setCreateName("");
    setCreateTypeId(DEFAULT_HORSE_TYPE_ID);
  }

  function handleDelete() {
    onHorseDelete?.(selectedOwnedHorse.id);
    setConfirmDelete(false);
  }

  return (
    <div className="stable-layout">
      <div className="stable-roster setting-group" aria-label="Конюшня">
        <div className="setting-title">
          <Gauge size={17} strokeWidth={2.4} />
          <span>Лошадь</span>
        </div>
        <div className="stable-horse-list">
          {stableHorses.map((ownedHorse) => {
            const horse = horseTypeById(ownedHorse.typeId);
            const active = selectedOwnedHorse.id === ownedHorse.id;

            return (
              <div key={ownedHorse.id} className="stable-card-row">
                <button
                  className={active ? "stable-card active" : "stable-card"}
                  type="button"
                  onClick={() => onHorseChange(ownedHorse.id)}
                >
                  <HorseToken horse={horse} />
                  <span className="stable-card-copy">
                    <strong>{ownedHorse.name}</strong>
                    <span>
                      {horse.name} · Ур. {ownedHorse.level}
                    </span>
                    <span className="stable-card-xp">
                      <span className="stable-card-xp-fill" style={{ width: `${Math.round((ownedHorse.xp / 100) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="horse-tier">{horse.tier}</span>
                </button>
                {canDelete && onListHorse && (
                  <button
                    type="button"
                    className="horse-list-btn sell"
                    title="Продать лошадь"
                    onClick={(e) => { e.stopPropagation(); onListHorse(ownedHorse.id); }}
                  >
                    Продать
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {creating ? (
          <form className="horse-create-form" onSubmit={submitCreate}>
            <div className="horse-type-picker">
              {HORSE_TYPES.map((ht) => (
                <button
                  key={ht.id}
                  type="button"
                  className={createTypeId === ht.id ? "horse-type-choice active" : "horse-type-choice"}
                  onClick={() => setCreateTypeId(ht.id)}
                >
                  <HorseToken horse={ht} />
                  <span>
                    <strong>{ht.name}</strong>
                    <small>{ht.role}</small>
                  </span>
                </button>
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
              <button type="submit" aria-label="Создать лошадь">
                <Check size={15} strokeWidth={2.7} />
              </button>
              <button
                type="button"
                aria-label="Отмена"
                onClick={() => {
                  setCreating(false);
                  setCreateName("");
                }}
              >
                <X size={15} strokeWidth={2.7} />
              </button>
            </div>
          </form>
        ) : (
          canAddMore && (
            <button className="add-horse-button" type="button" onClick={() => setCreating(true)}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Добавить лошадь</span>
            </button>
          )
        )}
      </div>

      <section className="stable-detail" aria-label={selectedOwnedHorse.name}>
        {/* Hero 3D scene */}
        <div className="horse-hero-scene">
          <HorseViewer3D />
          <div className="horse-hero-overlay">
            <p className="label">{selectedHorse.role} · {selectedHorse.name}</p>
            {editing ? (
              <form className="horse-name-form" onSubmit={submitName}>
                <input
                  aria-label="Имя лошади"
                  maxLength={24}
                  onChange={(event) => setDraftName(event.target.value)}
                  value={draftName}
                />
                <button type="submit" aria-label="Сохранить имя">
                  <Check size={16} strokeWidth={2.7} />
                </button>
                <button type="button" aria-label="Отменить" onClick={() => setEditing(false)}>
                  <X size={16} strokeWidth={2.7} />
                </button>
              </form>
            ) : (
              <div className="horse-name-row">
                <h2>{selectedOwnedHorse.name}</h2>
                <button className="horse-edit-button" type="button" aria-label="Переименовать" onClick={() => setEditing(true)}>
                  <Pencil size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}
            <div className="horse-hero-footer">
              <div className="horse-tags" aria-label="Профиль лошади">
                <span>{selectedHorse.stable.line}</span>
                <span>Ур. {selectedOwnedHorse.level}</span>
                <span>Связь {selectedOwnedHorse.bond}</span>
              </div>
              <p>{selectedHorse.description}</p>
            </div>
          </div>
        </div>

        <div className="horse-progress" aria-label="Прогресс лошади">
          <span>Опыт до следующего уровня</span>
          <i>
            <b style={{ "--value": `${Math.round(xpProgress * 100)}%` }} />
          </i>
          <strong>{selectedOwnedHorse.xp}/100</strong>
        </div>

        <div className="stable-stats" aria-label="Характеристики лошади">
          {statRows.map((row) => {
            const rating = ratingFor(row.score);

            return (
              <div className="stable-stat" key={row.label}>
                <span>{row.label}</span>
                <i>
                  <b style={{ "--value": `${rating}%` }} />
                </i>
                <strong>{rating}</strong>
              </div>
            );
          })}
        </div>

        <div className="horse-meta-grid">
          <div className="horse-record" aria-label="Статистика лошади">
            <strong>Статистика</strong>
            <div>
              {recordRows.map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="horse-equipment" aria-label="Снаряжение лошади">
            <strong>Снаряжение</strong>
            <div>
              {EQUIPMENT_LABELS.map(([key, label]) => {
                const equippedId = equipment[key];
                const equippedItem = equippedId ? itemById(equippedId) : null;
                return (
                  <span key={key}>
                    <small>{label}</small>
                    {equippedItem ? (
                      <span className={`equipment-slot-filled equip-slot filled tier-${equippedItem.tier}`}>
                        <b title={equippedItem.name}>{equippedItem.name}</b>
                        <button
                          type="button"
                          className="equip-remove-btn"
                          aria-label={`Снять ${equippedItem.name}`}
                          onClick={() => onEquipItem?.(selectedOwnedHorse.id, key, null)}
                        >
                          Снять
                        </button>
                        {onListEquipment && (
                          <button
                            type="button"
                            className="equip-list-btn"
                            aria-label={`На торги ${equippedItem.name}`}
                            onClick={() => onListEquipment(selectedOwnedHorse.id, key, equippedId)}
                          >
                            На торги
                          </button>
                        )}
                      </span>
                    ) : (
                      <b>Пусто</b>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <InventorySection
          inventory={inventory}
          horseId={selectedOwnedHorse.id}
          onEquipFromInventory={onEquipFromInventory}
          onListEquipment={onListEquipment}
        />

        {canDelete &&
          (confirmDelete ? (
            <div className="horse-delete-confirm">
              <span>Удалить {selectedOwnedHorse.name}?</span>
              <button type="button" className="horse-delete-yes" onClick={handleDelete}>
                Удалить
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}>
                Отмена
              </button>
            </div>
          ) : (
            <button type="button" className="horse-delete-trigger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} strokeWidth={2.3} />
              <span>Удалить лошадь</span>
            </button>
          ))}
      </section>
    </div>
  );
}
