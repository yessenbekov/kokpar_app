export const DEFAULT_SETTINGS = {
  goalType: "circle",
  teamSize: 3,
  matchMinutes: 2
};

function formatTimer(minutes) {
  return `${String(minutes).padStart(2, "0")}:00`;
}

export function makeInitialHud(settings = DEFAULT_SETTINGS) {
  return {
    blue: 0,
    red: 0,
    timer: formatTimer(settings.matchMinutes),
    stamina: 1,
    throwPower: 0,
    tugPower: 0,
    bodyCheckCooldown: 0,
    bodyCheckActive: false,
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
  const teamSizeParam = Number(params.get("teamSize") ?? params.get("players"));
  const matchMinutesParam = Number(params.get("minutes") ?? params.get("time"));

  return {
    goalType: goalParam === "kazan" ? "kazan" : "circle",
    teamSize: [3, 4, 5].includes(teamSizeParam) ? teamSizeParam : DEFAULT_SETTINGS.teamSize,
    matchMinutes: [2, 3, 5].includes(matchMinutesParam) ? matchMinutesParam : DEFAULT_SETTINGS.matchMinutes
  };
}

export function shouldAutoStart() {
  return new URLSearchParams(window.location.search).get("start") === "1";
}
