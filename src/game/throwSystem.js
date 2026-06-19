import { clamp, normalize2D, rotate2D } from "./mathUtils.js";
import { TEAM } from "./constants.js";

export const THROW_MIN_SPEED = 12;
export const THROW_MAX_SPEED = 24;
export const THROW_CHARGE_SECONDS = 0.92;
export const THROW_GRAVITY = 14;
export const THROW_PREVIEW_STEPS = 22;
export const THROW_PREVIEW_STEP_SECONDS = 0.075;
export const THROW_AIM_MAX_ANGLE = Math.PI * 0.18;
export const THROW_AIM_RATE = 1.18;
export const THROW_READY_EXTRA_RADIUS = 8.5;
export const THROW_HINT_EXTRA_RADIUS = 16;
export const LOOSE_SERKE_HEIGHT = 0.72;
export const CARRIED_SERKE_HEIGHT = 1.78;

export function createThrowSystem({
  kokpar,
  match,
  player,
  keys,
  touchInput,
  scoreRadius,
  scoringGoalFor,
  goalDistanceFor,
  targetName,
  throwPreviewLine,
  throwPreviewGeometry,
  throwPreviewPositions,
  throwLandingMarker,
  throwPointScores,
  clearContest,
  showMessage,
  feedback
}) {
  function forwardVector(rider) {
    return { x: Math.cos(rider.rotation), z: Math.sin(rider.rotation) };
  }

  function isThrownSerkeScoring() {
    return throwPointScores(kokpar.flightTeam, kokpar.x, kokpar.y, kokpar.z, kokpar.flightTime);
  }

  function resetThrowCharge() {
    kokpar.throwCharging = false;
    kokpar.throwCharge = 0;
    kokpar.throwAimOffset = 0;
  }

  function startThrowCharge(rider) {
    if (match.phase !== "live" || match.over) return false;
    if (kokpar.holder !== rider || rider.throwCooldown > 0 || kokpar.contest.active) return false;

    const distanceToGoal = goalDistanceFor(rider);
    if (distanceToGoal > scoreRadius + THROW_READY_EXTRA_RADIUS) {
      if (distanceToGoal <= scoreRadius + THROW_HINT_EXTRA_RADIUS) {
        rider.throwCooldown = 0.45;
        showMessage(
          "Еще ближе",
          `Подведи коня к ${targetName()}у и удерживай Space для броска.`,
          1.1
        );
      }
      return false;
    }

    kokpar.throwCharging = true;
    kokpar.throwCharge = Math.max(kokpar.throwCharge, 0.16);
    kokpar.throwAimOffset = 0;
    showMessage("Готовишь бросок", "Отпусти Space, чтобы забросить серке.", 0.85);
    return true;
  }

  function throwAimInput() {
    let input = 0;
    if (keys.has("arrowleft") || keys.has("a")) input -= 1;
    if (keys.has("arrowright") || keys.has("d")) input += 1;
    input += touchInput.x;
    return clamp(input, -1, 1);
  }

  function updateThrowCharge(dt) {
    if (!kokpar.throwCharging) return;

    if (match.phase !== "live" || match.over || kokpar.holder !== player || kokpar.contest.active) {
      resetThrowCharge();
      return;
    }

    kokpar.throwAimOffset = clamp(
      kokpar.throwAimOffset + throwAimInput() * THROW_AIM_RATE * dt,
      -THROW_AIM_MAX_ANGLE,
      THROW_AIM_MAX_ANGLE
    );
    kokpar.throwCharge = clamp(kokpar.throwCharge + dt / THROW_CHARGE_SECONDS, 0.16, 1);
  }

  function releaseThrowCharge(rider) {
    if (!kokpar.throwCharging || kokpar.holder !== rider) return false;

    const power = kokpar.throwCharge;
    const aimOffset = kokpar.throwAimOffset;
    resetThrowCharge();
    return attemptThrow(rider, true, power, aimOffset);
  }

  function calculateThrowPlan(rider, chargePower = 0.78, aimOffset = 0) {
    const forward = forwardVector(rider);
    const side = { x: -forward.z, z: forward.x };
    const carrySide = rider.team === TEAM.blue ? -1 : 1;
    const startX = rider.x + forward.x * 1.15 + side.x * carrySide * 1.05;
    const startZ = rider.z + forward.z * 1.15 + side.z * carrySide * 1.05;
    const target = scoringGoalFor(rider.team);
    const toGoal = normalize2D(target.x - startX, target.z - startZ);
    const aimedGoal = rotate2D(toGoal, clamp(aimOffset, -THROW_AIM_MAX_ANGLE, THROW_AIM_MAX_ANGLE));
    const aim = normalize2D(aimedGoal.x * 0.88 + forward.x * 0.12, aimedGoal.z * 0.88 + forward.z * 0.12);
    const throwDistance = Math.hypot(target.x - startX, target.z - startZ);
    const riderSpeed = Math.hypot(rider.vx, rider.vz);
    const power = clamp(chargePower, 0.2, 1);
    const powerScale = 0.62 + power * 0.58;
    const throwSpeed = clamp((throwDistance * 1.18 + riderSpeed * 0.28) * powerScale, THROW_MIN_SPEED * 0.5, THROW_MAX_SPEED * 1.12);

    return {
      x: startX,
      y: CARRIED_SERKE_HEIGHT + 0.22,
      z: startZ,
      vx: aim.x * throwSpeed + rider.vx * 0.18,
      vy: (4.1 + clamp(throwDistance / 10, 0, 2.1)) * (0.75 + power * 0.55),
      vz: aim.z * throwSpeed + rider.vz * 0.18
    };
  }

  function attemptThrow(rider, active = false, chargePower = 0.78, aimOffset = 0) {
    if (match.phase !== "live" || match.over) return false;
    if (kokpar.holder !== rider || rider.throwCooldown > 0) return false;
    if (kokpar.contest.active) return false;

    const distanceToGoal = goalDistanceFor(rider);
    const readyDistance = scoreRadius + THROW_READY_EXTRA_RADIUS;
    const shouldHint = active && rider.human && distanceToGoal <= scoreRadius + THROW_HINT_EXTRA_RADIUS;

    if (distanceToGoal > readyDistance) {
      if (shouldHint) {
        rider.throwCooldown = 0.45;
        showMessage(
          "Еще ближе",
          `Подведи коня к ${targetName()}у и нажми Space для броска.`,
          1.1
        );
      }
      return false;
    }

    const throwPlan = calculateThrowPlan(rider, chargePower, aimOffset);

    kokpar.holder = null;
    kokpar.flightTeam = rider.team;
    kokpar.flightScorer = rider;
    kokpar.flightTime = 0;
    kokpar.lastThrowHuman = rider.human;
    resetThrowCharge();
    kokpar.x = throwPlan.x;
    kokpar.y = throwPlan.y;
    kokpar.z = throwPlan.z;
    kokpar.vx = throwPlan.vx;
    kokpar.vy = throwPlan.vy;
    kokpar.vz = throwPlan.vz;
    kokpar.looseCooldown = 0.52;
    rider.throwPose = Math.max(rider.throwPose ?? 0, 1.25);
    rider.pullPose = Math.max(rider.pullPose ?? 0, 0.36);
    rider.throwCooldown = 0.8;
    rider.grabCooldown = Math.max(rider.grabCooldown, 0.35);
    clearContest();
    feedback.throw();

    if (active || rider.human) {
      showMessage("Бросок!", `Серке летит в ${targetName()}.`, 0.9);
    }

    return true;
  }

  function predictThrowPath(rider, chargePower, aimOffset = 0) {
    const state = calculateThrowPlan(rider, chargePower, aimOffset);
    const points = [];
    let scores = false;
    let flightTime = 0;

    for (let i = 0; i <= THROW_PREVIEW_STEPS; i += 1) {
      points.push({ x: state.x, y: Math.max(state.y, LOOSE_SERKE_HEIGHT), z: state.z });

      if (throwPointScores(rider.team, state.x, state.y, state.z, flightTime)) {
        scores = true;
      }

      state.vy -= THROW_GRAVITY * THROW_PREVIEW_STEP_SECONDS;
      state.x += state.vx * THROW_PREVIEW_STEP_SECONDS;
      state.y += state.vy * THROW_PREVIEW_STEP_SECONDS;
      state.z += state.vz * THROW_PREVIEW_STEP_SECONDS;
      state.vx *= Math.pow(0.988, THROW_PREVIEW_STEP_SECONDS * 60);
      state.vz *= Math.pow(0.988, THROW_PREVIEW_STEP_SECONDS * 60);
      flightTime += THROW_PREVIEW_STEP_SECONDS;

      if (state.y <= LOOSE_SERKE_HEIGHT) {
        points.push({ x: state.x, y: LOOSE_SERKE_HEIGHT, z: state.z });
        break;
      }
    }

    return { points, scores };
  }

  function updateThrowPreview(time) {
    if (!kokpar.throwCharging || kokpar.holder !== player) {
      throwPreviewLine.visible = false;
      throwLandingMarker.visible = false;
      return;
    }

    const preview = predictThrowPath(player, kokpar.throwCharge, kokpar.throwAimOffset);
    const points = preview.points;
    if (points.length < 2) {
      throwPreviewLine.visible = false;
      throwLandingMarker.visible = false;
      return;
    }

    points.forEach((point, index) => {
      const offset = index * 3;
      throwPreviewPositions[offset] = point.x;
      throwPreviewPositions[offset + 1] = point.y + 0.06;
      throwPreviewPositions[offset + 2] = point.z;
    });

    throwPreviewGeometry.setDrawRange(0, points.length);
    throwPreviewGeometry.attributes.position.needsUpdate = true;
    throwPreviewLine.material.color.set(preview.scores ? "#f0c347" : "#f7e7b8");
    throwPreviewLine.material.opacity = preview.scores ? 0.94 : 0.72;
    throwPreviewLine.visible = true;

    const landing = points[points.length - 1];
    throwLandingMarker.position.set(landing.x, 0.16, landing.z);
    throwLandingMarker.material.color.set(preview.scores ? "#f0c347" : "#f7e7b8");
    throwLandingMarker.material.opacity = preview.scores ? 0.94 : 0.72;
    throwLandingMarker.scale.setScalar((preview.scores ? 1.2 : 0.95) + Math.sin(time * 9) * 0.04);
    throwLandingMarker.visible = true;
  }

  return {
    isThrownSerkeScoring,
    resetThrowCharge,
    startThrowCharge,
    updateThrowCharge,
    releaseThrowCharge,
    calculateThrowPlan,
    attemptThrow,
    predictThrowPath,
    updateThrowPreview
  };
}
