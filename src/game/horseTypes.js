export const DEFAULT_HORSE_TYPE_ID = "argymak";

export const HORSE_TYPES = [
  {
    id: "argymak",
    name: "Арғымақ",
    role: "Баланс",
    description: "Ровная скорость, поворот и борьба.",
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
    palette: {
      blue: { coat: "#8a5c35", dark: "#2d1b13", muzzle: "#b87a45", marking: "#ead7bd" },
      red: { coat: "#4f2b1a", dark: "#1d120d", muzzle: "#7a4a2e", marking: "#2a1810" }
    }
  },
  {
    id: "zhuyrik",
    name: "Жүйрік",
    role: "Скорость",
    description: "Быстро разгоняется, но слабее в силовой борьбе.",
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
    palette: {
      blue: { coat: "#a86c37", dark: "#3a2013", muzzle: "#c98b52", marking: "#f0dfc2" },
      red: { coat: "#6a351e", dark: "#20100a", muzzle: "#965733", marking: "#312016" }
    }
  },
  {
    id: "auyr",
    name: "Ауыр ат",
    role: "Сила",
    description: "Тяжелее и сильнее в контакте, но медленнее.",
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
    palette: {
      blue: { coat: "#5c4635", dark: "#201812", muzzle: "#80604b", marking: "#d9c5aa" },
      red: { coat: "#35231a", dark: "#160d09", muzzle: "#674231", marking: "#22130d" }
    }
  }
];

export function horseTypeById(id) {
  return HORSE_TYPES.find((type) => type.id === id) ?? HORSE_TYPES[0];
}
