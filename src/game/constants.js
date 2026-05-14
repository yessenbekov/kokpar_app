export const WORLD = {
  width: 138,
  height: 90,
  groundWidth: 215,
  groundHeight: 150
};

export const GOAL_RADIUS = 7.2;
export const MATCH_SECONDS = 120;

export const TEAM = {
  blue: "blue",
  red: "red"
};

export const COLORS = {
  blue: "#176d9f",
  blueAlt: "#2f86bd",
  red: "#bb3c31",
  horse: "#704527",
  horseDark: "#2d1b13",
  sand: "#c6a25d",
  sky: "#cfa96a"
};

export function goalFor(team) {
  const goalX = WORLD.width / 2 - 8;
  return team === TEAM.blue ? { x: -goalX, z: 0 } : { x: goalX, z: 0 };
}
