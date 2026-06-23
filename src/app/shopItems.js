/**
 * Static shop catalog for the horse equipment and horse purchase system.
 * Stats are additive bonuses applied on top of the base horse stats.
 * For staminaDrain: negative bonus means less drain (better).
 */

export const SHOP_ITEMS = [
  // ── Saddle (Седло): speed + carrySpeed ───────────────────────────────────
  {
    id: "saddle_1",
    slot: "saddle",
    tier: 1,
    name: "Войлочное седло",
    description: "Лёгкое войлочное седло. Чуть прибавляет скорость.",
    price: 280,
    bonus: { speed: 0.03, carrySpeed: 0.02 }
  },
  {
    id: "saddle_2",
    slot: "saddle",
    tier: 2,
    name: "Кожаное седло",
    description: "Классическая кожа. Заметно улучшает ход и скорость с серке.",
    price: 750,
    bonus: { speed: 0.07, carrySpeed: 0.05 }
  },
  {
    id: "saddle_3",
    slot: "saddle",
    tier: 3,
    name: "Чемпионское седло",
    description: "Боевое снаряжение чемпионов. Максимальный прирост скорости.",
    price: 1800,
    bonus: { speed: 0.14, carrySpeed: 0.10 }
  },

  // ── Bridle (Узда): turn + grip + brake ───────────────────────────────────
  {
    id: "bridle_1",
    slot: "bridle",
    tier: 1,
    name: "Простая узда",
    description: "Базовая узда. Немного улучшает управляемость.",
    price: 280,
    bonus: { turn: 0.03, grip: 0.02, brake: 0.02 }
  },
  {
    id: "bridle_2",
    slot: "bridle",
    tier: 2,
    name: "Плетёная узда",
    description: "Ремённое плетение. Заметно улучшает поворот и хват.",
    price: 750,
    bonus: { turn: 0.07, grip: 0.05, brake: 0.05 }
  },
  {
    id: "bridle_3",
    slot: "bridle",
    tier: 3,
    name: "Золочёная узда",
    description: "Парадная узда с золотой отделкой. Точность управления — высшая.",
    price: 1800,
    bonus: { turn: 0.14, grip: 0.10, brake: 0.10 }
  },

  // ── Blanket (Попона): staminaDrain- + staminaRecovery+ ───────────────────
  {
    id: "blanket_1",
    slot: "blanket",
    tier: 1,
    name: "Льняная попона",
    description: "Лёгкая ткань. Конь чуть меньше устаёт.",
    price: 280,
    bonus: { staminaDrain: -0.04, staminaRecovery: 0.03 }
  },
  {
    id: "blanket_2",
    slot: "blanket",
    tier: 2,
    name: "Шерстяная попона",
    description: "Натуральная шерсть. Заметно снижает усталость и ускоряет восстановление.",
    price: 750,
    bonus: { staminaDrain: -0.09, staminaRecovery: 0.07 }
  },
  {
    id: "blanket_3",
    slot: "blanket",
    tier: 3,
    name: "Боевая попона",
    description: "Выкована из традиций. Конь почти не устаёт в бою.",
    price: 1800,
    bonus: { staminaDrain: -0.18, staminaRecovery: 0.14 }
  },

  // ── Leg Wraps (Бинты): stability + contestPower + bodyCheckPower ─────────
  {
    id: "legWraps_1",
    slot: "legWraps",
    tier: 1,
    name: "Простые бинты",
    description: "Базовая поддержка ног. Немного улучшает устойчивость.",
    price: 280,
    bonus: { stability: 0.03, contestPower: 0.02, bodyCheckPower: 0.02 }
  },
  {
    id: "legWraps_2",
    slot: "legWraps",
    tier: 2,
    name: "Кожаные бинты",
    description: "Кожаная обмотка. Заметно прибавляет силу в борьбе.",
    price: 750,
    bonus: { stability: 0.07, contestPower: 0.05, bodyCheckPower: 0.05 }
  },
  {
    id: "legWraps_3",
    slot: "legWraps",
    tier: 3,
    name: "Железные бинты",
    description: "Закалённая сталь под кожей. Непробиваемость в контакте.",
    price: 1800,
    bonus: { stability: 0.14, contestPower: 0.10, bodyCheckPower: 0.10 }
  }
];

/**
 * Horses available for purchase in the shop.
 * Argymak is the free starter horse — only zhuyrik and auyr are sold here.
 */
export const SHOP_HORSES = [
  {
    typeId: "zhuyrik",
    name: "Жүйрік",
    role: "Скорость",
    description: "Быстрейший конь степи. Рвётся вперёд, но слабее в борьбе.",
    price: 1200
  },
  {
    typeId: "auyr",
    name: "Ауыр ат",
    role: "Сила",
    description: "Тяжёлый и могучий. Непоколебим в силовой игре, но медленнее.",
    price: 1200
  }
];

/**
 * Look up a shop item by its id.
 * Returns undefined if not found.
 */
export function itemById(id) {
  return SHOP_ITEMS.find((item) => item.id === id);
}

/**
 * Apply equipment bonuses on top of a base stats object.
 * equipment: { saddle: "saddle_1" | null, bridle: ..., blanket: ..., legWraps: ... }
 * Returns a new stats object with all bonuses applied additively.
 * For staminaDrain, a negative bonus correctly reduces the drain multiplier.
 */
export function applyEquipmentToStats(baseStats, equipment = {}) {
  const result = { ...baseStats };

  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue;
    const item = itemById(itemId);
    if (!item) continue;

    for (const [stat, bonus] of Object.entries(item.bonus)) {
      if (stat in result) {
        result[stat] = result[stat] + bonus;
      }
    }
  }

  return result;
}
