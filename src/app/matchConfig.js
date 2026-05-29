import { DEFAULT_HORSE_TYPE_ID, horseTypeById } from "../game/horseTypes.js";

export const DEFAULT_SETTINGS = {
  goalType: "circle",
  teamSize: 3,
  matchMinutes: 2,
  horseType: DEFAULT_HORSE_TYPE_ID
};

function formatTimer(minutes) {
  return `${String(minutes).padStart(2, "0")}:00`;
}

function settingsFromProfile(profile = {}) {
  const preferences = profile.matchPreferences ?? {};

  return {
    goalType: preferences.goalType === "kazan" ? "kazan" : DEFAULT_SETTINGS.goalType,
    teamSize: [3, 4, 5].includes(Number(preferences.teamSize)) ? Number(preferences.teamSize) : DEFAULT_SETTINGS.teamSize,
    matchMinutes: [2, 3, 5].includes(Number(preferences.matchMinutes))
      ? Number(preferences.matchMinutes)
      : DEFAULT_SETTINGS.matchMinutes,
    horseType: horseTypeById(profile.selectedHorseType).id
  };
}

export function makeInitialHud(settings = DEFAULT_SETTINGS) {
  const horseType = horseTypeById(settings.horseType);

  return {
    blue: 0,
    red: 0,
    timer: formatTimer(settings.matchMinutes),
    stamina: 1,
    throwPower: 0,
    tugPower: 0,
    mountedContest: false,
    contestBalance: 0.5,
    contestLeadingTeam: null,
    bodyCheckCooldown: 0,
    bodyCheckActive: false,
    bodyCheckReady: false,
    cameraMode: "Обзор",
    horseName: horseType.name,
    carry: "Кокпар на поле",
    message: "Загрузка матча",
    submessage: "Готовим поле.",
    showBanner: true,
    radar: null
  };
}

export function readUrlSettings(profile) {
  const profileSettings = settingsFromProfile(profile);
  const params = new URLSearchParams(window.location.search);
  const goalParam = params.get("goal");
  const horseParam = params.get("horse");
  const teamSizeParam = Number(params.get("teamSize") ?? params.get("players"));
  const matchMinutesParam = Number(params.get("minutes") ?? params.get("time"));

  return {
    goalType: params.has("goal") ? (goalParam === "kazan" ? "kazan" : "circle") : profileSettings.goalType,
    teamSize: [3, 4, 5].includes(teamSizeParam) ? teamSizeParam : profileSettings.teamSize,
    matchMinutes: [2, 3, 5].includes(matchMinutesParam) ? matchMinutesParam : profileSettings.matchMinutes,
    horseType: params.has("horse") ? horseTypeById(horseParam).id : profileSettings.horseType
  };
}

export function shouldAutoStart() {
  return new URLSearchParams(window.location.search).get("start") === "1";
}
