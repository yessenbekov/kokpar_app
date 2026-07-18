import { clamp, distance2D, normalize2D, angleDelta, forwardVector } from "./mathUtils.js";
import { WORLD, TEAM } from "./constants.js";

const GAIT_PHASE_MIN_RATE = 1.55;
const GAIT_PHASE_SPEED_RATE = 0.62;
const AI_PASS_THREAT_RADIUS = 8.5;
const PICKUP_POSE_DECAY = 2.4;
const PULL_POSE_DECAY = 2.8;
const RIDER_FIELD_EXIT_BUFFER = 10;
const START_LINE_Z = WORLD.height / 2;
const START_LANE_DEPTH = 17;

export function createRiderMovement({
  kokpar,
  match,
  riders,
  player,
  keys,
  touchInput,
  camera,
  cameraForwardVector,
  contactSystem,
  contestSystem,
  attemptThrow,
  canThrowAtTarget,
  attemptPass,
  chooseAITarget,
  startLaneWarmupTarget,
  showMessage,
  keepRiderInStartLane,
  keepRiderOutsideCenterDuel,
  keepRiderOutsideKazanGoals,
  STARTING_RIDER_SPOTS,
  remoteRider,
  getRemoteRiderInput,
  aiDifficulty = {}
}) {
  const AI_BODY_CHECK_DIST = aiDifficulty.bodyCheckDist ?? 6.3;
  const AI_THROW_BASE = aiDifficulty.throwBase ?? 0.74;
  const AI_THROW_STAM = aiDifficulty.throwStam ?? 0.18;
  const AI_PASS_THREAT_DIST = aiDifficulty.passRadius ?? AI_PASS_THREAT_RADIUS;
  function updateRiderActionPoses(rider, dt) {
    rider.pickupPose = Math.max(0, (rider.pickupPose ?? 0) - dt * PICKUP_POSE_DECAY);
    rider.pullPose = Math.max(0, (rider.pullPose ?? 0) - dt * PULL_POSE_DECAY);
  }

  function updateRiderGaitState(rider, dt) {
    const speed = Math.hypot(rider.vx, rider.vz);
    const speedRatio = clamp(speed / Math.max(rider.maxSpeed, 1), 0, 1.3);
    const previousSpeed = rider.lastSpeed ?? speed;
    const brakingRate = Math.max(0, previousSpeed - speed) / Math.max(dt, 0.001);
    const brakingPose = previousSpeed > 4.2 ? clamp((brakingRate - 3.5) / 20, 0, 1) : 0;

    rider.gaitPhase = (rider.gaitPhase ?? rider.aiPhase) + dt * (GAIT_PHASE_MIN_RATE + speed * GAIT_PHASE_SPEED_RATE);
    rider.stopPose = Math.max(0, Math.max(rider.stopPose ?? 0, brakingPose) - dt * (1.6 + speedRatio * 0.8));
    rider.turnPose = Math.max(0, (rider.turnPose ?? 0) - dt * 2.35);
    rider.lastSpeed = speed;
  }

  function applyHorseControl(rider, direction, dt, options = {}) {
    const sprint = options.sprint ?? false;
    const urgency = options.urgency ?? 1;
    const hasDirection = Boolean(direction);
    const speed = Math.hypot(rider.vx, rider.vz);
    const speedRatio = clamp(speed / Math.max(rider.maxSpeed, 1), 0, 1.35);
    let sharpTurnAssist = 0;

    if (hasDirection) {
      const desiredRotation = Math.atan2(direction.z, direction.x);
      const rotationDelta = angleDelta(desiredRotation, rider.rotation);
      const turnMagnitude = Math.abs(rotationDelta);
      const lowSpeedPivot = clamp(1 - speedRatio / 0.62, 0, 1);
      sharpTurnAssist = clamp((turnMagnitude - 0.38) / 1.55, 0, 1);

      const turnSlowdown = clamp(1 - speed / (rider.maxSpeed * 2.35), 0.58, 1.12);
      const pivotBoost = 1 + sharpTurnAssist * (0.42 + lowSpeedPivot * 0.76);
      const urgencyBoost = clamp(urgency, 0.55, 1.4);
      const turnStep = rider.turnRate * turnSlowdown * pivotBoost * urgencyBoost * dt;
      const turn = clamp(rotationDelta, -turnStep, turnStep);
      rider.rotation += turn;
      rider.turnPose = Math.max(
        rider.turnPose ?? 0,
        sharpTurnAssist * clamp(0.25 + speedRatio * 0.9, 0, 1)
      );

      const targetLean = clamp(-turn / Math.max(dt, 0.001) * 0.06, -0.22, 0.22);
      rider.lean += (targetLean - rider.lean) * clamp(dt * 8, 0, 1);
    } else {
      if (speed > 3.2) {
        rider.stopPose = Math.max(rider.stopPose ?? 0, clamp(speed / (rider.maxSpeed * 0.85), 0, 1) * 0.82);
      }
      rider.lean += (0 - rider.lean) * clamp(dt * 6, 0, 1);
    }

    const forward = forwardVector(rider);
    const side = { x: -forward.z, z: forward.x };
    const forwardSpeed = rider.vx * forward.x + rider.vz * forward.z;
    const sideSpeed = rider.vx * side.x + rider.vz * side.z;
    const carrySlowdown = kokpar.holder === rider ? rider.carrySpeedMultiplier ?? 0.88 : 1;
    const sprintBoost = sprint ? 1.06 : 1;
    const boost = options.boost ?? 1;
    const turnSpeedPenalty = 1 - sharpTurnAssist * (0.26 + speedRatio * 0.16);
    const targetSpeed = hasDirection
      ? rider.maxSpeed * carrySlowdown * sprintBoost * boost * clamp(urgency, 0.45, 1.06) * turnSpeedPenalty
      : 0;
    const speedDelta = targetSpeed - forwardSpeed;
    const power = speedDelta >= 0 ? rider.acceleration : rider.brakePower * (1 + sharpTurnAssist * 0.5);
    const forwardChange = clamp(speedDelta, -power * dt, power * dt);
    const grip = clamp((rider.lateralGrip + sharpTurnAssist * (rider.human ? 4.5 : 3.2)) * dt, 0, 0.88);
    const surfaceDrag =
      Math.pow(hasDirection ? 0.992 : 0.965, dt * 60) *
      Math.pow(0.976, sharpTurnAssist * dt * 60);

    rider.vx += forward.x * forwardChange;
    rider.vz += forward.z * forwardChange;
    rider.vx -= side.x * sideSpeed * grip;
    rider.vz -= side.z * sideSpeed * grip;
    rider.vx *= surfaceDrag;
    rider.vz *= surfaceDrag;
  }

  function updateRiderThrowPose(rider, dt) {
    const current = rider.throwPose ?? 0;
    const target = kokpar.throwCharging && kokpar.holder === rider ? 0.58 + kokpar.throwCharge * 0.46 : 0;

    if (target > current) {
      rider.throwPose = current + (target - current) * clamp(dt * 8.5, 0, 1);
    } else {
      rider.throwPose = Math.max(0, current - dt * 3.2);
    }
  }

  const BREAKAWAY_MIN_SPEED = 8.0;
  const BREAKAWAY_CLEAR_RADIUS = 9.5;
  const BREAKAWAY_BOOST = 1.16;
  const BREAKAWAY_COOLDOWN = 8;

  function updateBreakaway(rider, dt) {
    match.breakawayCooldown = Math.max(0, (match.breakawayCooldown ?? 0) - dt);

    if (kokpar.holder !== rider || match.breakawayCooldown > 0) {
      if (rider.breakawayActive) {
        rider.breakawayActive = false;
        rider.breakawayBoost = 1;
        if (kokpar.holder !== rider) match.breakawayCooldown = BREAKAWAY_COOLDOWN;
      }
      return;
    }

    const speed = Math.hypot(rider.vx, rider.vz);
    if (speed < BREAKAWAY_MIN_SPEED) {
      rider.breakawayActive = false;
      rider.breakawayBoost = 1;
      return;
    }

    const opponents = riders.filter((r) => r.team !== rider.team);
    const nearestDist = opponents.reduce(
      (min, opp) => Math.min(min, Math.hypot(opp.x - rider.x, opp.z - rider.z)),
      Infinity
    );

    if (nearestDist > BREAKAWAY_CLEAR_RADIUS) {
      if (!rider.breakawayActive) {
        rider.breakawayActive = true;
        showMessage?.("Прорыв!", "Открытое поле — жги к воротам!", 1.6);
      }
      rider.breakawayBoost = BREAKAWAY_BOOST;
    } else {
      if (rider.breakawayActive) {
        rider.breakawayActive = false;
        rider.breakawayBoost = 1;
        match.breakawayCooldown = BREAKAWAY_COOLDOWN;
      }
    }
  }

  function cameraRelativeDirection(inputX, inputZ) {
    camera.getWorldDirection(cameraForwardVector);
    const forward = normalize2D(cameraForwardVector.x, cameraForwardVector.z);
    const right = { x: -forward.z, z: forward.x };
    return normalize2D(
      right.x * inputX - forward.x * inputZ,
      right.z * inputX - forward.z * inputZ
    );
  }

  function updateHuman(rider, dt) {
    let ax = 0;
    let az = 0;
    const actionHeld = keys.has(" ") || touchInput.action;

    if (keys.has("arrowleft") || keys.has("a")) ax -= 1;
    if (keys.has("arrowright") || keys.has("d")) ax += 1;
    if (keys.has("arrowup") || keys.has("w")) az -= 1;
    if (keys.has("arrowdown") || keys.has("s")) az += 1;

    ax += touchInput.x;
    az += touchInput.z;

    const inputStrength = clamp(Math.hypot(ax, az), 0, 1);
    const moving = inputStrength > 0.05;
    const bodyChecking = contactSystem.isBodyCheckActive(rider);
    const recovering = rider.bodyCheckRecovery > 0;
    const sprint =
      moving &&
      actionHeld &&
      !bodyChecking &&
      !recovering &&
      !kokpar.throwCharging &&
      !contestSystem.isMountedContestParticipant(rider) &&
      rider.stamina > 0.08;
    const direction = moving ? cameraRelativeDirection(ax, az) : null;

    updateBreakaway(rider, dt);
    applyHorseControl(rider, direction, dt, {
      sprint,
      urgency: bodyChecking ? 1.08 : recovering ? 0.58 : moving ? 0.38 + inputStrength * 0.68 : 1,
      boost: rider.breakawayBoost ?? 1
    });

    if (sprint && moving) {
      rider.stamina = clamp(rider.stamina - dt * 0.36 * (rider.staminaDrainMultiplier ?? 1), 0, 1);
    } else if (moving) {
      rider.stamina = clamp(rider.stamina + dt * 0.12 * (rider.staminaRecoveryMultiplier ?? 1), 0, 1);
    } else {
      rider.stamina = clamp(rider.stamina + dt * 0.22 * (rider.staminaRecoveryMultiplier ?? 1), 0, 1);
    }

    if (actionHeld && !bodyChecking && !recovering) contestSystem.attemptGrab(rider, true);
  }

  function updateRemoteRider(rider, dt) {
    const input = getRemoteRiderInput?.() ?? { x: 0, z: 0, action: false };
    const ax = input.x ?? 0;
    const az = input.z ?? 0;
    const inputStrength = clamp(Math.hypot(ax, az), 0, 1);
    const moving = inputStrength > 0.05;
    const sprint = moving && Boolean(input.sprint) && rider.stamina > 0.08;
    const direction = moving ? normalize2D(ax, az) : null;

    applyHorseControl(rider, direction, dt, {
      sprint,
      urgency: moving ? 0.38 + inputStrength * 0.68 : 1
    });

    if (sprint && moving) {
      rider.stamina = clamp(rider.stamina - dt * 0.36, 0, 1);
    } else {
      rider.stamina = clamp(rider.stamina + dt * 0.18, 0, 1);
    }

    if (Boolean(input.action) && !contactSystem.isBodyCheckActive(rider)) {
      contestSystem.attemptGrab(rider, true);
    }
  }

  function updateAI(rider, dt, time) {
    const plan = chooseAITarget(rider);
    const target = plan.target;
    rider.aiRole = plan.role;

    if (kokpar.holder === rider) {
      if (canThrowAtTarget(rider) && attemptThrow(rider, false, AI_THROW_BASE + rider.stamina * AI_THROW_STAM)) return;

      if (attemptPass && rider.throwCooldown <= 0) {
        const isUnderThreat = riders.some(
          (r) => r.team !== rider.team && distance2D(r, rider) < AI_PASS_THREAT_DIST
        );
        if (isUnderThreat && attemptPass(rider)) {
          rider.throwCooldown = 2.0;
          return;
        }
      }
    }

    const wander = {
      x: Math.cos(rider.aiPhase + time * 0.7) * plan.wander,
      z: Math.sin(rider.aiPhase * 1.6 + time * 0.62) * plan.wander
    };
    const targetDistance = Math.hypot(target.x - rider.x, target.z - rider.z);
    const direction =
      targetDistance > 0.8
        ? normalize2D(target.x + wander.x - rider.x, target.z + wander.z - rider.z)
        : null;
    const pacing =
      plan.role === "carrier" ||
      plan.role === "tackler" ||
      plan.role === "pickup" ||
      plan.role === "protector" ||
      plan.role === "guard" ||
      plan.role === "lane_guard"
        ? 1
        : clamp((targetDistance - plan.closeRadius) / 12 + 0.24, 0.2, 1);

    if (
      plan.role === "tackler" &&
      kokpar.holder &&
      kokpar.holder.team !== rider.team &&
      Math.hypot(rider.x - kokpar.holder.x, rider.z - kokpar.holder.z) < AI_BODY_CHECK_DIST &&
      Math.hypot(rider.vx, rider.vz) > 3.5
    ) {
      contactSystem.startBodyCheck(rider);
    }

    applyHorseControl(rider, direction, dt, { urgency: plan.urgency * pacing });
    if (!contactSystem.isBodyCheckActive(rider)) contestSystem.attemptGrab(rider, false);
  }

  function updateRiderMovement(dt, time) {
    riders.forEach((rider) => {
      rider.grabCooldown = Math.max(0, rider.grabCooldown - dt);
      rider.throwCooldown = Math.max(0, rider.throwCooldown - dt);
      rider.bumpCooldown = Math.max(0, rider.bumpCooldown - dt);
      contactSystem.updateRiderContactState(rider, dt);
      rider.staggerTime = Math.max(0, rider.staggerTime - dt);
      rider.hitFlash = Math.max(0, rider.hitFlash - dt * 2.8);
      updateRiderThrowPose(rider, dt);
      updateRiderActionPoses(rider, dt);

      const isWaitingDuringDuel = match.duelMode && !kokpar.holder && !match.duelRiders.has(rider);

      if (isWaitingDuringDuel) {
        rider.vx = 0;
        rider.vz = 0;
      } else if (rider.staggerTime > 0) {
        applyHorseControl(rider, null, dt);
      } else if (rider.human) {
        updateHuman(rider, dt);
      } else if (remoteRider && rider === remoteRider) {
        updateRemoteRider(rider, dt);
      } else {
        updateAI(rider, dt, time);
      }

      const inMountedContest =
        kokpar.contest.active &&
        kokpar.contest.mode === "mounted" &&
        (kokpar.contest.holder === rider || kokpar.contest.challenger === rider);
      const checkSpeedFactor = contactSystem.isBodyCheckDriving(rider)
        ? 1.12
        : rider.bodyCheckRecovery > 0
          ? 0.78
          : 1;
      const heldSpeedFactor = kokpar.holder === rider ? rider.carrySpeedMultiplier ?? 0.88 : 1.04;
      const maxSpeed = rider.maxSpeed * heldSpeedFactor * (rider.human ? (rider.breakawayBoost ?? 1) : 1) * (inMountedContest ? 0.72 : 1) * checkSpeedFactor;
      const speed = Math.hypot(rider.vx, rider.vz);

      if (speed > maxSpeed) {
        rider.vx = (rider.vx / speed) * maxSpeed;
        rider.vz = (rider.vz / speed) * maxSpeed;
      }

      rider.x = clamp(
        rider.x + rider.vx * dt,
        -WORLD.width / 2 - RIDER_FIELD_EXIT_BUFFER,
        WORLD.width / 2 + RIDER_FIELD_EXIT_BUFFER
      );
      rider.z = clamp(
        rider.z + rider.vz * dt,
        -WORLD.height / 2 - RIDER_FIELD_EXIT_BUFFER,
        START_LINE_Z + START_LANE_DEPTH
      );
      keepRiderOutsideCenterDuel(rider);
      keepRiderOutsideKazanGoals(rider);
      updateRiderGaitState(rider, dt);
    });
  }

  function updateStartLaneMovement(dt, time) {
    if (match.duelMode) return;

    riders.forEach((rider, index) => {
      rider.grabCooldown = Math.max(0, rider.grabCooldown - dt);
      rider.throwCooldown = Math.max(0, rider.throwCooldown - dt);
      rider.bumpCooldown = Math.max(0, rider.bumpCooldown - dt);
      contactSystem.updateRiderContactState(rider, dt);
      rider.staggerTime = Math.max(0, rider.staggerTime - dt);
      rider.hitFlash = Math.max(0, rider.hitFlash - dt * 2.8);
      updateRiderThrowPose(rider, dt);
      updateRiderActionPoses(rider, dt);

      if (rider.human) {
        updateHuman(rider, dt);
      } else {
        const target = startLaneWarmupTarget(rider, index, time, STARTING_RIDER_SPOTS);
        const targetDistance = Math.hypot(target.x - rider.x, target.z - rider.z);
        const direction = targetDistance > 0.8 ? normalize2D(target.x - rider.x, target.z - rider.z) : null;

        rider.aiRole = "warmup";
        applyHorseControl(rider, direction, dt, { urgency: 0.42 });
      }

      const maxSpeed = rider.maxSpeed * 0.46;
      const speed = Math.hypot(rider.vx, rider.vz);

      if (speed > maxSpeed) {
        rider.vx = (rider.vx / speed) * maxSpeed;
        rider.vz = (rider.vz / speed) * maxSpeed;
      }

      rider.x += rider.vx * dt;
      rider.z += rider.vz * dt;
      keepRiderInStartLane(rider);
      updateRiderGaitState(rider, dt);
    });
  }

  return {
    applyHorseControl,
    updateRiderMovement,
    updateStartLaneMovement,
    updateRiderGaitState,
    updateRiderActionPoses,
    updateRiderThrowPose
  };
}
