import { COAT_PRESETS, DEFAULT_HORSE_TYPE_ID, HORSE_TYPES, coatPresetById, horseTypeById } from "../game/horseTypes.js";
import { DEFAULT_MODE_ID, gameModeById } from "./gameModes.js";

const HORSE_IDS = new Set(HORSE_TYPES.map((horse) => horse.id));
const DEFAULT_OWNED_HORSES = [
  createOwnedHorse({
    id: "horse-kulager",
    name: "Құлагер",
    typeId: "argymak",
    bond: 18
  })
];

export const DEFAULT_PLAYER_PROFILE = {
  riderName: "Шабандоз",
  level: 1,
  coins: 600,
  reputation: 0,
  selectedHorseId: DEFAULT_OWNED_HORSES[0].id,
  selectedHorseType: DEFAULT_OWNED_HORSES[0].typeId,
  ownedHorses: DEFAULT_OWNED_HORSES,
  stableCapacity: 6,
  inventory: [],
  matchPreferences: {
    modeId: DEFAULT_MODE_ID,
    goalType: "circle",
    teamSize: 3,
    matchMinutes: 2,
    teamSide: "blue"
  }
};

export function newOwnedHorse(typeId, name, coatId) {
  const id = `horse-${typeId}-${Date.now()}`;
  const safeName = typeof name === "string" && name.trim() ? name.trim().slice(0, 24) : horseTypeById(typeId).name;
  const safeCoatId = coatPresetById(coatId).id;
  return createOwnedHorse({ id, name: safeName, typeId, coatId: safeCoatId });
}

function createOwnedHorse({ id, name, typeId, coatId, level = 1, xp = 0, bond = 0, equipment = {}, record = {} }) {
  const horseType = horseTypeById(typeId);
  return {
    id,
    name,
    typeId: horseType.id,
    coatId: coatPresetById(coatId ?? horseType.defaultCoatId).id,
    level,
    xp,
    bond,
    equipment: {
      saddle: equipment.saddle ?? null,
      bridle: equipment.bridle ?? null,
      blanket: equipment.blanket ?? null,
      legWraps: equipment.legWraps ?? null
    },
    record: {
      matches: record.matches ?? 0,
      wins: record.wins ?? 0,
      goals: record.goals ?? 0,
      steals: record.steals ?? 0
    }
  };
}

function safeNumber(value, fallback, allowedValues) {
  const number = Number(value);
  if (allowedValues?.includes(number)) return number;
  return Number.isFinite(number) ? number : fallback;
}

function safeText(value, fallback, maxLength = 24) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function sanitizeOwnedHorse(value, index = 0) {
  if (typeof value === "string") {
    const typeId = horseTypeById(value).id;
    const fallbackHorse = DEFAULT_OWNED_HORSES.find((horse) => horse.typeId === typeId) ?? DEFAULT_OWNED_HORSES[index];
    return createOwnedHorse({
      id: fallbackHorse?.id ?? `horse-${typeId}-${index + 1}`,
      name: fallbackHorse?.name ?? HORSE_TYPES.find((horse) => horse.id === typeId)?.name ?? `Ат ${index + 1}`,
      typeId
    });
  }

  const typeId = horseTypeById(value?.typeId ?? value?.horseType ?? value?.id).id;
  const fallbackHorse = DEFAULT_OWNED_HORSES[index] ?? DEFAULT_OWNED_HORSES[0];

  return createOwnedHorse({
    id: safeText(value?.id, `horse-${typeId}-${index + 1}`, 42),
    name: safeText(value?.name, fallbackHorse?.typeId === typeId ? fallbackHorse.name : horseTypeById(typeId).name),
    typeId,
    level: Math.max(1, Math.round(safeNumber(value?.level, 1))),
    xp: Math.max(0, Math.round(safeNumber(value?.xp, 0))),
    bond: Math.max(0, Math.round(safeNumber(value?.bond, 0))),
    equipment: value?.equipment,
    record: value?.record
  });
}

function sanitizeOwnedHorses(value, legacyOwnedHorseTypes) {
  const source = Array.isArray(value) && value.length > 0 ? value : legacyOwnedHorseTypes;
  if (!Array.isArray(source)) return DEFAULT_OWNED_HORSES.map((horse) => ({ ...horse }));

  const seen = new Set();
  const owned = source
    .map((horse, index) => sanitizeOwnedHorse(horse, index))
    .filter((horse) => {
      if (!HORSE_IDS.has(horse.typeId) || seen.has(horse.id)) return false;
      seen.add(horse.id);
      return true;
    });

  return owned.length > 0 ? owned : DEFAULT_OWNED_HORSES.map((horse) => ({ ...horse }));
}

function sanitizeMatchPreferences(value = {}) {
  const mode = gameModeById(value.modeId);

  return {
    modeId: mode.id,
    goalType: mode.goalLocked ? mode.defaultGoalType : value.goalType === "kazan" ? "kazan" : mode.defaultGoalType,
    teamSize: [3, 4, 5].includes(Number(value.teamSize)) ? Number(value.teamSize) : 3,
    matchMinutes: [2, 3, 5].includes(Number(value.matchMinutes)) ? Number(value.matchMinutes) : 2,
    teamSide: value.teamSide === "red" ? "red" : "blue"
  };
}

export function sanitizePlayerProfile(value = {}) {
  const ownedHorses = sanitizeOwnedHorses(value.ownedHorses, value.ownedHorseTypes);
  const selectedHorseType = horseTypeById(value.selectedHorseType).id;
  const selectedHorseById = ownedHorses.find((horse) => horse.id === value.selectedHorseId);
  const selectedHorseByType = ownedHorses.find((horse) => horse.typeId === selectedHorseType);
  const selectedHorse = selectedHorseById ?? selectedHorseByType ?? ownedHorses[0];

  return {
    ...DEFAULT_PLAYER_PROFILE,
    ...value,
    riderName: typeof value.riderName === "string" && value.riderName.trim() ? value.riderName.trim() : DEFAULT_PLAYER_PROFILE.riderName,
    level: Math.max(1, Math.round(safeNumber(value.level, DEFAULT_PLAYER_PROFILE.level))),
    coins: Math.max(0, Math.round(safeNumber(value.coins, DEFAULT_PLAYER_PROFILE.coins))),
    reputation: Math.max(0, Math.round(safeNumber(value.reputation, DEFAULT_PLAYER_PROFILE.reputation))),
    selectedHorseId: selectedHorse.id,
    selectedHorseType: selectedHorse.typeId,
    ownedHorses,
    stableCapacity: Math.max(ownedHorses.length, Math.round(safeNumber(value.stableCapacity, DEFAULT_PLAYER_PROFILE.stableCapacity))),
    inventory: Array.isArray(value?.inventory) ? value.inventory.filter((id) => typeof id === "string") : [],
    matchPreferences: sanitizeMatchPreferences(value.matchPreferences)
  };
}

export function selectedHorseFromProfile(profile) {
  const safeProfile = sanitizePlayerProfile(profile);
  return safeProfile.ownedHorses.find((horse) => horse.id === safeProfile.selectedHorseId) ?? safeProfile.ownedHorses[0];
}

export function ownedHorseById(profile, horseId) {
  const safeProfile = sanitizePlayerProfile(profile);
  return safeProfile.ownedHorses.find((horse) => horse.id === horseId) ?? selectedHorseFromProfile(safeProfile);
}
