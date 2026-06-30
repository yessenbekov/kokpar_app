export const DEFAULT_HORSE_TYPE_ID = "argymak";

export const HORSE_TYPES = [
  {
    id: "argymak",
    name: "Арғымақ",
    role: "Баланс",
    description: "Ровная скорость, поворот и борьба.",
    tier: "I",
    stable: {
      line: "Стартовая линия",
      temperament: "Ровный",
      specialty: "Контроль серке"
    },
    stats: {
      speed: 1,
      acceleration: 1,
      brake: 1,
      turn: 1,
      grip: 1,
      staminaDrain: 1,
      staminaRecovery: 1,
      carrySpeed: 0.88,
      contestPower: 1,
      tacklePower: 1,
      stability: 1,
      bodyCheckPower: 1,
      bodyCheckLunge: 1
    },
    palette: { coat: "#9b6030", dark: "#2e1608", muzzle: "#c8834c", marking: "#ecdcc0" }
  },
  {
    id: "zhuyrik",
    name: "Жүйрік",
    role: "Скорость",
    description: "Быстро разгоняется, но слабее в силовой борьбе.",
    tier: "I",
    stable: {
      line: "Спринтер",
      temperament: "Горячий",
      specialty: "Рывок к серке"
    },
    stats: {
      speed: 1.11,
      acceleration: 1.14,
      brake: 0.94,
      turn: 1.07,
      grip: 0.96,
      staminaDrain: 1.18,
      staminaRecovery: 0.95,
      carrySpeed: 0.82,
      contestPower: 0.88,
      tacklePower: 0.9,
      stability: 0.9,
      bodyCheckPower: 0.9,
      bodyCheckLunge: 1.08
    },
    palette: { coat: "#b8b0a0", dark: "#5a5650", muzzle: "#d4cec6", marking: "#f4f2ee" }
  },
  {
    id: "auyr",
    name: "Ауыр ат",
    role: "Сила",
    description: "Тяжелее и сильнее в контакте, но медленнее.",
    tier: "I",
    stable: {
      line: "Силовая линия",
      temperament: "Упрямый",
      specialty: "Борьба верхом"
    },
    stats: {
      speed: 0.92,
      acceleration: 0.88,
      brake: 1.08,
      turn: 0.9,
      grip: 1.1,
      staminaDrain: 0.92,
      staminaRecovery: 1.06,
      carrySpeed: 0.93,
      contestPower: 1.18,
      tacklePower: 1.14,
      stability: 1.16,
      bodyCheckPower: 1.18,
      bodyCheckLunge: 0.94
    },
    palette: { coat: "#28180e", dark: "#100a06", muzzle: "#5a3828", marking: "#7a5040" }
  }
];

export function horseTypeById(id) {
  return HORSE_TYPES.find((type) => type.id === id) ?? HORSE_TYPES[0];
}
