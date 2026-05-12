export const WORLD = {
  width: 120,
  height: 78,
  groundWidth: 190,
  groundHeight: 130
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
  return team === TEAM.blue ? { x: -52, z: 0 } : { x: 52, z: 0 };
}
