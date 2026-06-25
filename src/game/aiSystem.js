import { clamp, distance2D, normalize2D } from "./mathUtils.js";
import { TEAM, WORLD } from "./constants.js";

const TEAM_GUARD_RADIUS = 15;
const TEAM_LANE_THREAT_RADIUS = 17;
const TEAM_LANE_THREAT_LOOKAHEAD = 38;
const START_LINE_Z = WORLD.height / 2;
const START_LANE_DEPTH = 17;
const START_LANE_FIELD_BUFFER = 5.0;
const START_TEAM_BOUNDARY_GAP = 2.4;

export function createAISystem({
  riders,
  kokpar,
  scoringGoalFor,
  opponentTeam
}) {
  function ridersForTeam(team) {
    return riders.filter((rider) => rider.team === team);
  }

  function closestRider(point, candidates) {
    if (candidates.length === 0) return null;
    return candidates.reduce(
      (closest, rider) => (distance2D(rider, point) < distance2D(closest, point) ? rider : closest),
      candidates[0]
    );
  }

  function sortedRidersByDistance(point, candidates) {
    return [...candidates].sort((a, b) => distance2D(a, point) - distance2D(b, point));
  }

  function pointBetween(a, b, amount) {
    return {
      x: a.x + (b.x - a.x) * amount,
      z: a.z + (b.z - a.z) * amount
    };
  }

  function distanceToSegment2D(point, start, end) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz || 1;
    const projection = clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq, 0, 1);
    const closest = {
      x: start.x + dx * projection,
      z: start.z + dz * projection
    };
    return distance2D(point, closest);
  }

  function offsetPoint(point, toward, sideAmount, backAmount = 0) {
    const forward = normalize2D(toward.x - point.x, toward.z - point.z);
    const side = { x: -forward.z, z: forward.x };
    return {
      x: point.x - forward.x * backAmount + side.x * sideAmount,
      z: point.z - forward.z * backAmount + side.z * sideAmount
    };
  }

  function clampFieldTarget(target, margin = 6) {
    return {
      x: clamp(target.x, -WORLD.width / 2 + margin, WORLD.width / 2 - margin),
      z: clamp(target.z, -WORLD.height / 2 + margin, WORLD.height / 2 - margin)
    };
  }

  function supportPoint(holder, rider) {
    const scoringGoal = scoringGoalFor(rider.team);
    const side = rider.name.charCodeAt(0) % 2 === 0 ? -1 : 1;
    return clampFieldTarget({
      x: holder.x + (scoringGoal.x - holder.x) * 0.22,
      z: holder.z + side * 12
    });
  }

  function holderThreats(holder, opponents) {
    return sortedRidersByDistance(holder, opponents).filter(
      (opponent) => distance2D(opponent, holder) <= TEAM_GUARD_RADIUS
    );
  }

  function laneThreats(holder, opponents, scoringGoal) {
    const direction = normalize2D(scoringGoal.x - holder.x, scoringGoal.z - holder.z);

    return opponents
      .map((opponent) => {
        const toOpponent = { x: opponent.x - holder.x, z: opponent.z - holder.z };
        const forwardDistance = toOpponent.x * direction.x + toOpponent.z * direction.z;
        const laneEnd = pointBetween(holder, scoringGoal, 0.54);
        const laneDistance = distanceToSegment2D(opponent, holder, laneEnd);
        const holderDistance = distance2D(opponent, holder);

        return {
          opponent,
          forwardDistance,
          laneDistance,
          score: laneDistance + holderDistance * 0.04 - forwardDistance * 0.035
        };
      })
      .filter(
        ({ forwardDistance, laneDistance }) =>
          forwardDistance > -4 &&
          forwardDistance < TEAM_LANE_THREAT_LOOKAHEAD &&
          laneDistance <= TEAM_LANE_THREAT_RADIUS
      )
      .sort((a, b) => a.score - b.score)
      .map(({ opponent }) => opponent);
  }

  function guardPoint(holder, guard, threat, slot = 0) {
    if (!threat) return supportPoint(holder, guard);

    const leadHolder = {
      x: holder.x + holder.vx * 0.22,
      z: holder.z + holder.vz * 0.22
    };
    const side = slot % 2 === 0 ? 4.2 : -4.2;
    const shield = pointBetween(threat, leadHolder, 0.52);

    return clampFieldTarget(offsetPoint(shield, leadHolder, side, 1.2));
  }

  function laneEscortPoint(holder, slot = 0) {
    const scoringGoal = scoringGoalFor(holder.team);
    const laneAmount = 0.2 + (slot % 3) * 0.08;
    const sideSign = slot % 2 === 0 ? 1 : -1;
    const sideAmount = sideSign * (7 + Math.floor(slot / 2) * 2.5);
    const lane = pointBetween(holder, scoringGoal, laneAmount);

    return clampFieldTarget(offsetPoint(lane, scoringGoal, sideAmount, 0.8));
  }

  function startLaneBoundsForTeam(team) {
    return team === TEAM.blue
      ? { minX: -WORLD.width / 2 + 3, maxX: -START_TEAM_BOUNDARY_GAP }
      : { minX: START_TEAM_BOUNDARY_GAP, maxX: WORLD.width / 2 - 3 };
  }

  function keepRiderInStartLane(rider) {
    const bounds = startLaneBoundsForTeam(rider.team);
    const nextX = clamp(rider.x, bounds.minX, bounds.maxX);
    const nextZ = clamp(rider.z, START_LINE_Z + START_LANE_FIELD_BUFFER, START_LINE_Z + START_LANE_DEPTH);

    if (nextX !== rider.x) {
      rider.x = nextX;
      rider.vx *= 0.18;
    }

    if (nextZ !== rider.z) {
      rider.z = nextZ;
      rider.vz *= 0.18;
    }
  }

  function startLaneWarmupTarget(rider, index, time, STARTING_RIDER_SPOTS) {
    const [baseX, baseZ] = STARTING_RIDER_SPOTS[index];
    const bounds = startLaneBoundsForTeam(rider.team);
    const lateral = Math.sin(time * 0.68 + rider.aiPhase) * 2.8;
    const depth = Math.cos(time * 0.54 + rider.aiPhase * 1.3) * 2.4;

    return {
      x: clamp(baseX + lateral, bounds.minX + 1.8, bounds.maxX - 1.8),
      z: clamp(baseZ + depth, START_LINE_Z + 5.4, START_LINE_Z + START_LANE_DEPTH - 1.2)
    };
  }

  function blockerPoint(blocker, blockedRider, protectedPoint) {
    const base = blockedRider ? pointBetween(blockedRider, protectedPoint, 0.56) : protectedPoint;
    const side = blocker.name.charCodeAt(0) % 2 === 0 ? 4 : -4;
    return clampFieldTarget(offsetPoint(base, protectedPoint, side));
  }

  function chooseAITarget(rider) {
    const teammates = ridersForTeam(rider.team);
    const opponents = ridersForTeam(opponentTeam(rider.team));
    const aiTeammates = teammates.filter((teammate) => !teammate.human);
    const aiIndex = Math.max(0, aiTeammates.indexOf(rider));
    const side = rider.name.charCodeAt(0) % 2 === 0 ? 1 : -1;

    if (kokpar.holder) {
      const holder = kokpar.holder;

      if (holder === rider) {
        return {
          role: "carrier",
          target: scoringGoalFor(rider.team),
          urgency: 1.12,
          closeRadius: 2,
          wander: 0.8
        };
      }

      if (holder.team === rider.team) {
        const scoringGoal = scoringGoalFor(rider.team);
        const mountedChallenger =
          kokpar.contest.active && kokpar.contest.mode === "mounted" && kokpar.contest.holder === holder
            ? kokpar.contest.challenger
            : null;

        if (mountedChallenger) {
          const protectors = sortedRidersByDistance(
            mountedChallenger,
            aiTeammates.filter((teammate) => teammate !== holder)
          );

          if (protectors[0] === rider) {
            return {
              role: "protector",
              target: {
                x: mountedChallenger.x + mountedChallenger.vx * 0.1,
                z: mountedChallenger.z + mountedChallenger.vz * 0.1
              },
              urgency: 1.28,
              closeRadius: 1.25,
              wander: 0.28
            };
          }
        }

        const threats = holderThreats(holder, opponents);
        const threat = threats[aiIndex % Math.max(1, threats.length)];
        const guardCount = Math.min(aiTeammates.length, Math.max(2, threats.length));

        if (threat && aiIndex < guardCount) {
          return {
            role: "guard",
            target: guardPoint(holder, rider, threat, aiIndex),
            urgency: 1.12,
            closeRadius: 2.2,
            wander: 0.7
          };
        }

        const laneOpponents = laneThreats(holder, opponents, scoringGoal);
        const laneThreat = laneOpponents[aiIndex % Math.max(1, laneOpponents.length)];

        if (laneThreat && aiIndex % 2 === 1) {
          return {
            role: "lane_guard",
            target: blockerPoint(rider, laneThreat, pointBetween(holder, scoringGoal, 0.34)),
            urgency: 1.02,
            closeRadius: 2.8,
            wander: 0.9
          };
        }

        return {
          role: "escort",
          target: laneEscortPoint(holder, aiIndex),
          urgency: 0.96,
          closeRadius: 3.2,
          wander: 1.1
        };
      }

      const defensiveRank = sortedRidersByDistance(holder, teammates).indexOf(rider);
      const holderGoal = scoringGoalFor(holder.team);

      if (defensiveRank === 0) {
        const leadTime = clamp(distance2D(rider, holder) / 18, 0.12, 0.42);
        return {
          role: "tackler",
          target: { x: holder.x + holder.vx * leadTime, z: holder.z + holder.vz * leadTime },
          urgency: 1.26,
          closeRadius: 1.5,
          wander: 0.8
        };
      }

      if (defensiveRank === 1) {
        // Predict where the holder is heading 1.4s ahead and intercept that lane
        const predicted = {
          x: holder.x + holder.vx * 1.4,
          z: holder.z + holder.vz * 1.4
        };
        const interceptBase = pointBetween(predicted, holderGoal, 0.28);
        return {
          role: "lane_blocker",
          target: clampFieldTarget(offsetPoint(interceptBase, holderGoal, side * 5.5)),
          urgency: 1.06,
          closeRadius: 2.8,
          wander: 0.8
        };
      }

      // Defender: cover the near post of the threatened goal
      const goalCoverX = holderGoal.x - Math.sign(holderGoal.x) * 8;
      const goalCoverZ = clamp(holder.z * 0.35 + side * 8, -20, 20);
      return {
        role: "defender",
        target: clampFieldTarget({ x: goalCoverX, z: goalCoverZ }),
        urgency: 0.82,
        closeRadius: 5,
        wander: 1.2
      };
    }

    const looseRank = sortedRidersByDistance(kokpar, teammates).indexOf(rider);
    const closestOpponent = closestRider(kokpar, opponents);

    if (looseRank === 0) {
      return {
        role: "pickup",
        target: kokpar,
        urgency: 1.16,
        closeRadius: 1.5,
        wander: 1
      };
    }

    if (looseRank === 1) {
      return {
        role: "screen",
        target: blockerPoint(rider, closestOpponent, kokpar),
        urgency: 0.9,
        closeRadius: 3.5,
        wander: 1.4
      };
    }

    const scoringGoal = scoringGoalFor(rider.team);
    return {
      role: "outlet",
      target: clampFieldTarget(offsetPoint(kokpar, scoringGoal, side * 9, 7)),
      urgency: 0.78,
      closeRadius: 5.5,
      wander: 1.8
    };
  }

  return {
    chooseAITarget,
    keepRiderInStartLane,
    startLaneWarmupTarget,
    ridersForTeam,
    closestRider,
    sortedRidersByDistance,
    clampFieldTarget,
    supportPoint,
    holderThreats,
    laneThreats,
    guardPoint,
    laneEscortPoint,
    blockerPoint,
    pointBetween,
    offsetPoint,
    startLaneBoundsForTeam
  };
}
