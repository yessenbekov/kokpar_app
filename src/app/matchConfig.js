import { DEFAULT_HORSE_TYPE_ID, horseTypeById } from "../game/horseTypes.js";
import { DEFAULT_MODE_ID, gameModeById } from "./gameModes.js";
import { ownedHorseById, selectedHorseFromProfile } from "./playerProfile.js";

export const DEFAULT_SETTINGS = {
  modeId: DEFAULT_MODE_ID,
  goalType: "circle",
  teamSize: 3,
  matchMinutes: 2,
  horseType: DEFAULT_HORSE_TYPE_ID,
  teamSide: "blue"
};

function formatTimer(minutes) {
  return `${String(minutes).padStart(2, "0")}:00`;
}

function settingsFromProfile(profile = {}) {
  const preferences = profile.matchPreferences ?? {};
  const mode = gameModeById(preferences.modeId);
  const selectedHorse = selectedHorseFromProfile(profile);

  return {
    modeId: mode.id,
    goalType: mode.goalLocked ? mode.defaultGoalType : preferences.goalType === "kazan" ? "kazan" : mode.defaultGoalType,
    teamSize: [3, 4, 5].includes(Number(preferences.teamSize)) ? Number(preferences.teamSize) : DEFAULT_SETTINGS.teamSize,
    matchMinutes: [2, 3, 5].includes(Number(preferences.matchMinutes))
      ? Number(preferences.matchMinutes)
      : DEFAULT_SETTINGS.matchMinutes,
    horseId: selectedHorse.id,
    horseType: selectedHorse.typeId,
    horseName: selectedHorse.name,
    teamSide: preferences.teamSide === "red" ? "red" : "blue"
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
    horseName: settings.horseName ?? horseType.name,
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
  const mode = gameModeById(params.get("mode") ?? params.get("modeId") ?? profileSettings.modeId);
  const goalParam = params.get("goal");
  const horseIdParam = params.get("horseId");
  const horseParam = params.get("horse");
  const teamSizeParam = Number(params.get("teamSize") ?? params.get("players"));
  const matchMinutesParam = Number(params.get("minutes") ?? params.get("time"));
  const selectedHorse = horseIdParam
    ? ownedHorseById(profile, horseIdParam)
    : params.has("horse")
      ? (profile?.ownedHorses ?? []).find((horse) => horse.typeId === horseTypeById(horseParam).id) ?? {
          id: profileSettings.horseId,
          typeId: horseTypeById(horseParam).id,
          name: horseTypeById(horseParam).name
        }
      : {
          id: profileSettings.horseId,
          typeId: profileSettings.horseType,
          name: profileSettings.horseName
        };

  return {
    modeId: mode.id,
    goalType: mode.goalLocked
      ? mode.defaultGoalType
      : params.has("goal")
        ? goalParam === "kazan"
          ? "kazan"
          : "circle"
        : profileSettings.goalType,
    teamSize: [3, 4, 5].includes(teamSizeParam) ? teamSizeParam : profileSettings.teamSize,
    matchMinutes: [2, 3, 5].includes(matchMinutesParam) ? matchMinutesParam : profileSettings.matchMinutes,
    horseId: selectedHorse.id,
    horseType: selectedHorse.typeId,
    horseName: selectedHorse.name,
    teamSide: params.get("side") === "red" || params.get("teamSide") === "red" ? "red" : profileSettings.teamSide
  };
}

export function shouldAutoStart() {
  return new URLSearchParams(window.location.search).get("start") === "1";
}
