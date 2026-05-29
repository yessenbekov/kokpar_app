import { DEFAULT_HORSE_TYPE_ID, HORSE_TYPES, horseTypeById } from "../game/horseTypes.js";

const PROFILE_STORAGE_KEY = "kokpar.playerProfile.v1";
const HORSE_IDS = new Set(HORSE_TYPES.map((horse) => horse.id));

export const DEFAULT_PLAYER_PROFILE = {
  riderName: "Шабандоз",
  level: 1,
  coins: 1200,
  reputation: 0,
  selectedHorseType: DEFAULT_HORSE_TYPE_ID,
  ownedHorseTypes: HORSE_TYPES.map((horse) => horse.id),
  stableCapacity: 6,
  matchPreferences: {
    goalType: "circle",
    teamSize: 3,
    matchMinutes: 2
  }
};

function safeNumber(value, fallback, allowedValues) {
  const number = Number(value);
  if (allowedValues?.includes(number)) return number;
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeOwnedHorseTypes(value) {
  if (!Array.isArray(value)) return [...DEFAULT_PLAYER_PROFILE.ownedHorseTypes];

  const owned = value.filter((id, index, array) => HORSE_IDS.has(id) && array.indexOf(id) === index);
  return owned.length > 0 ? owned : [DEFAULT_HORSE_TYPE_ID];
}

function sanitizeMatchPreferences(value = {}) {
  return {
    goalType: value.goalType === "kazan" ? "kazan" : "circle",
    teamSize: [3, 4, 5].includes(Number(value.teamSize)) ? Number(value.teamSize) : 3,
    matchMinutes: [2, 3, 5].includes(Number(value.matchMinutes)) ? Number(value.matchMinutes) : 2
  };
}

export function sanitizePlayerProfile(value = {}) {
  const ownedHorseTypes = sanitizeOwnedHorseTypes(value.ownedHorseTypes);
  const selectedHorseType = horseTypeById(value.selectedHorseType).id;
  const safeSelectedHorseType = ownedHorseTypes.includes(selectedHorseType) ? selectedHorseType : ownedHorseTypes[0];

  return {
    ...DEFAULT_PLAYER_PROFILE,
    ...value,
    riderName: typeof value.riderName === "string" && value.riderName.trim() ? value.riderName.trim() : DEFAULT_PLAYER_PROFILE.riderName,
    level: Math.max(1, Math.round(safeNumber(value.level, DEFAULT_PLAYER_PROFILE.level))),
    coins: Math.max(0, Math.round(safeNumber(value.coins, DEFAULT_PLAYER_PROFILE.coins))),
    reputation: Math.max(0, Math.round(safeNumber(value.reputation, DEFAULT_PLAYER_PROFILE.reputation))),
    selectedHorseType: safeSelectedHorseType,
    ownedHorseTypes,
    stableCapacity: Math.max(ownedHorseTypes.length, Math.round(safeNumber(value.stableCapacity, DEFAULT_PLAYER_PROFILE.stableCapacity))),
    matchPreferences: sanitizeMatchPreferences(value.matchPreferences)
  };
}

export function readPlayerProfile() {
  if (typeof window === "undefined") return DEFAULT_PLAYER_PROFILE;

  try {
    const storedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return sanitizePlayerProfile(storedProfile ? JSON.parse(storedProfile) : DEFAULT_PLAYER_PROFILE);
  } catch {
    return DEFAULT_PLAYER_PROFILE;
  }
}

export function savePlayerProfile(profile) {
  const nextProfile = sanitizePlayerProfile(profile);

  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
  } catch {
    // Safari private mode can reject localStorage writes; the in-memory profile still works.
  }

  return nextProfile;
}
