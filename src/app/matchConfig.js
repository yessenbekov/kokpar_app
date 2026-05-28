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

export function readUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const goalParam = params.get("goal");
  const horseParam = params.get("horse");
  const teamSizeParam = Number(params.get("teamSize") ?? params.get("players"));
  const matchMinutesParam = Number(params.get("minutes") ?? params.get("time"));

  return {
    goalType: goalParam === "kazan" ? "kazan" : "circle",
    teamSize: [3, 4, 5].includes(teamSizeParam) ? teamSizeParam : DEFAULT_SETTINGS.teamSize,
    matchMinutes: [2, 3, 5].includes(matchMinutesParam) ? matchMinutesParam : DEFAULT_SETTINGS.matchMinutes,
    horseType: horseTypeById(horseParam).id
  };
}

export function shouldAutoStart() {
  return new URLSearchParams(window.location.search).get("start") === "1";
}
