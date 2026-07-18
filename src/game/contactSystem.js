import { TEAM } from "./constants.js";
import { clamp, distance2D, forwardVector, normalize2D } from "./mathUtils.js";

const TACKLE_DROP_THRESHOLD = 0.94;
const TACKLE_MOUNTED_CONTEST_THRESHOLD = 0.36;
const TACKLE_STAGGER_THRESHOLD = 0.4;
const RIDER_COLLISION_RADIUS = 3.6;
const BODY_CHECK_STAMINA_COST = 0.2;
const BODY_CHECK_LUNGE_SPEED = 4.8;
const BODY_CHECK_CONTACT_BONUS = 0.22;
const BODY_CHECK_PUSH = 2.45;
const BODY_CHECK_MISS_RECOVERY_SECONDS = 0.2;
const BODY_CHECK_HIT_RECOVERY_SECONDS = 0.34;
const IMPACT_REACTION_SECONDS = 0.44;
const TEAM_GUARD_BLOCK_RADIUS = 8.5;
const TEAM_GUARD_PUSH = 1.25;
const TEAM_GUARD_INTERVENTION_COOLDOWN = 0.56;

export const BODY_CHECK_WINDUP_SECONDS = 0.14;
export const BODY_CHECK_WINDOW_SECONDS = 0.4;
export const BODY_CHECK_COOLDOWN_SECONDS = 1.45;
export const TEAM_GUARD_RADIUS = 15;

export function createContactSystem({
  riders,
  kokpar,
  match,
  feedback,
  stealRadius,
  looseSerkeHeight,
  clearContest,
  resetThrowCharge,
  showMessage,
  isMountedContestParticipant,
  keepNonDuelRidersOutsideCenter,
  keepRiderOutsideKazanGoals,
  onBodyCheckImpact,
  onGuardIntervention
}) {
  function isBodyCheckDriving(rider) {
    return rider.bodyCheckTime > 0;
  }

  function isBodyCheckActive(rider) {
    return rider.bodyCheckWindup > 0 || isBodyCheckDriving(rider);
  }

  function bodyCheckPose(rider) {
    const windup = rider.bodyCheckWindup > 0
      ? 1 - rider.bodyCheckWindup / BODY_CHECK_WINDUP_SECONDS
      : 0;
    const drive = clamp(rider.bodyCheckTime / BODY_CHECK_WINDOW_SECONDS, 0, 1);
    const recovery = clamp(rider.bodyCheckRecovery / BODY_CHECK_HIT_RECOVERY_SECONDS, 0, 1);
    const impact = clamp(rider.impactReactionTime / IMPACT_REACTION_SECONDS, 0, 1);

    return { windup, drive, recovery, impact };
  }

  function launchBodyCheck(rider) {
    const forward = forwardVector(rider);
    const speed = Math.hypot(rider.vx, rider.vz);
    const lunge =
      BODY_CHECK_LUNGE_SPEED *
      (rider.bodyCheckLungeMultiplier ?? 1) *
      (0.76 + clamp(speed / rider.maxSpeed, 0, 1) * 0.24);

    rider.bodyCheckTime = BODY_CHECK_WINDOW_SECONDS;
    rider.hitFlash = Math.max(rider.hitFlash, 0.28);
    rider.vx += forward.x * lunge;
    rider.vz += forward.z * lunge;
  }

  function startBodyCheck(rider) {
    if (match.phase !== "live" || match.over || kokpar.holder === rider) return false;
    if (rider.bodyCheckCooldown > 0 || rider.staggerTime > 0 || rider.stamina < BODY_CHECK_STAMINA_COST) return false;
    if (isMountedContestParticipant(rider) || kokpar.throwCharging) return false;

    rider.bodyCheckWindup = BODY_CHECK_WINDUP_SECONDS;
    rider.bodyCheckTime = 0;
    rider.bodyCheckCooldown = BODY_CHECK_COOLDOWN_SECONDS;
    rider.bodyCheckRecovery = 0;
    rider.stamina = clamp(rider.stamina - BODY_CHECK_STAMINA_COST * (rider.staminaDrainMultiplier ?? 1), 0, 1);
    feedback.bodyCheck();

    if (rider.human) {
      showMessage("Силовой прием", "Выбери момент и войди корпусом в соперника.", 0.76);
    }

    return true;
  }

  function updateRiderContactState(rider, dt) {
    rider.bodyCheckCooldown = Math.max(0, rider.bodyCheckCooldown - dt);
    rider.bodyCheckRecovery = Math.max(0, rider.bodyCheckRecovery - dt);
    rider.impactReactionTime = Math.max(0, rider.impactReactionTime - dt);
    rider.protectionCooldown = Math.max(0, rider.protectionCooldown - dt);

    if (rider.bodyCheckWindup > 0) {
      rider.bodyCheckWindup = Math.max(0, rider.bodyCheckWindup - dt);
      if (rider.bodyCheckWindup === 0) launchBodyCheck(rider);
      return;
    }

    if (rider.bodyCheckTime > 0) {
      rider.bodyCheckTime = Math.max(0, rider.bodyCheckTime - dt);
      if (rider.bodyCheckTime === 0 && rider.bodyCheckRecovery <= 0) {
        rider.bodyCheckRecovery = BODY_CHECK_MISS_RECOVERY_SECONDS;
      }
    }
  }

  function applyStagger(rider, seconds, push = { x: 0, z: 0 }) {
    rider.staggerTime = Math.max(rider.staggerTime, seconds);
    rider.hitFlash = Math.max(rider.hitFlash, 1);
    rider.vx += push.x;
    rider.vz += push.z;
  }

  function resolveGuardBlock(guard, opponent, relativeSpeed) {
    const holder = kokpar.holder;

    if (!holder || guard === holder || opponent === holder) return;
    if (guard.team !== holder.team || opponent.team === holder.team) return;
    if (!["guard", "protector", "blocker", "support", "lane_guard", "lane_blocker", "escort"].includes(guard.aiRole)) return;

    const opponentDistance = distance2D(opponent, holder);
    const guardDistance = distance2D(guard, holder);

    if (opponentDistance > TEAM_GUARD_BLOCK_RADIUS || guardDistance > TEAM_GUARD_RADIUS + 4) return;

    const away = normalize2D(opponent.x - holder.x, opponent.z - holder.z);
    const pressure = clamp(
      (TEAM_GUARD_BLOCK_RADIUS - opponentDistance) / TEAM_GUARD_BLOCK_RADIUS + relativeSpeed / 18,
      0.25,
      1
    );
    const push = TEAM_GUARD_PUSH + pressure;

    opponent.vx += away.x * push;
    opponent.vz += away.z * push;
    guard.vx -= away.x * 0.35;
    guard.vz -= away.z * 0.35;
    opponent.grabCooldown = Math.max(opponent.grabCooldown, 0.24);
    opponent.bumpCooldown = Math.max(opponent.bumpCooldown, 0.14);
    guard.bumpCooldown = Math.max(guard.bumpCooldown, 0.12);
    opponent.hitFlash = Math.max(opponent.hitFlash, 0.35);

    const mountedIntervention =
      kokpar.contest.active &&
      kokpar.contest.mode === "mounted" &&
      kokpar.contest.holder === holder &&
      kokpar.contest.challenger === opponent;

    if (!mountedIntervention || guard.protectionCooldown > 0) return;

    const holderSign = holder.team === TEAM.blue ? 1 : -1;
    const relief = 0.12 + pressure * 0.13;

    kokpar.contest.progress = clamp(kokpar.contest.progress + holderSign * relief, -1, 1);
    opponent.tugEffort = Math.max(0, (opponent.tugEffort ?? 0) - 0.46);
    opponent.grabCooldown = Math.max(opponent.grabCooldown, 0.32);
    guard.protectionCooldown = TEAM_GUARD_INTERVENTION_COOLDOWN;
    setImpactReaction(guard, -0.34);
    setImpactReaction(opponent, 0.72);
    feedback.impact(relativeSpeed > 8);
    onGuardIntervention?.(guard, opponent, pressure, holder);
  }

  function tackleQuality(tackler, holder, active, impactBonus = 0) {
    const distance = distance2D(tackler, holder);
    const toHolder = normalize2D(holder.x - tackler.x, holder.z - tackler.z);
    const tacklerForward = forwardVector(tackler);
    const holderForward = forwardVector(holder);
    const approach = clamp((tacklerForward.x * toHolder.x + tacklerForward.z * toHolder.z + 0.18) / 1.18, 0, 1);
    const relativeSpeed = Math.hypot(tackler.vx - holder.vx, tackler.vz - holder.vz);
    const speedPower = clamp(relativeSpeed / 16, 0, 1);
    const distancePower = clamp(1 - (distance - 2.1) / (stealRadius - 2.1), 0, 1);
    const holderSide = { x: -holderForward.z, z: holderForward.x };
    const toTackler = normalize2D(tackler.x - holder.x, tackler.z - holder.z);
    const sideContact = clamp(Math.abs(holderSide.x * toTackler.x + holderSide.z * toTackler.z), 0, 1);
    const staminaPower = 0.72 + tackler.stamina * 0.28;
    const activePower = active ? 1 : tackler.aiRole === "tackler" ? 0.9 : 0.74;
    const holderPenalty = holder.staggerTime > 0 ? 0.08 : 0;
    const baseQuality =
      distancePower * 0.2 +
      approach * 0.24 +
      speedPower * 0.22 +
      sideContact * 0.14 +
      staminaPower * 0.1 +
      activePower * 0.1 +
      impactBonus +
      holderPenalty;
    const horsePower = (tackler.tacklePowerMultiplier ?? 1) / (holder.stabilityMultiplier ?? 1);

    return clamp(baseQuality * horsePower, 0, 1);
  }

  function setImpactReaction(rider, lean) {
    rider.impactReactionTime = IMPACT_REACTION_SECONDS;
    rider.impactLean = lean;
  }

  function dropKokparFromTackle(holder, tackler, quality) {
    const push = normalize2D(holder.x - tackler.x, holder.z - tackler.z);

    kokpar.holder = null;
    kokpar.x = holder.x + push.x * 1.15;
    kokpar.y = looseSerkeHeight;
    kokpar.z = holder.z + push.z * 1.15;
    kokpar.vx = holder.vx * 0.38 + tackler.vx * 0.34 + push.x * 3.2;
    kokpar.vy = 0;
    kokpar.vz = holder.vz * 0.38 + tackler.vz * 0.34 + push.z * 3.2;
    kokpar.flightTeam = null;
    kokpar.flightScorer = null;
    kokpar.flightTime = 0;
    kokpar.lastThrowHuman = false;
    resetThrowCharge();
    kokpar.looseCooldown = 0.34;
    clearContest();

    applyStagger(holder, 0.48 + quality * 0.34, { x: push.x * 3.2, z: push.z * 3.2 });
    applyStagger(tackler, 0.18, { x: -push.x * 1.1, z: -push.z * 1.1 });
    holder.bumpCooldown = 0.88;
    tackler.grabCooldown = 0.56;
    feedback.impact(true);

    showMessage(
      tackler.human ? "Серке выбит!" : `${tackler.name} выбил серке`,
      "Он снова на земле. Готовься к борьбе за подбор.",
      1.45
    );
  }

  function staggerFromTackle(holder, tackler, quality) {
    const push = normalize2D(holder.x - tackler.x, holder.z - tackler.z);

    applyStagger(holder, 0.24 + quality * 0.22, { x: push.x * 1.8, z: push.z * 1.8 });
    holder.bumpCooldown = 0.48;
    tackler.grabCooldown = 0.38;

    if (tackler.human || holder.human) {
      feedback.impact();
      showMessage("Жесткий контакт", "Серке удержан, но всадника шатнуло.", 1.05);
    }
  }

  function startMountedContest(holder, challenger, active, quality) {
    if (kokpar.contest.active && kokpar.contest.mode === "mounted") return;

    const holderSign = holder.team === TEAM.blue ? 1 : -1;

    kokpar.contest.active = true;
    kokpar.contest.mode = "mounted";
    kokpar.contest.progress = holderSign * 0.46;
    kokpar.contest.time = 0;
    kokpar.contest.leader = holder;
    kokpar.contest.holder = holder;
    kokpar.contest.challenger = challenger;

    holder.tugEffort = 0;
    challenger.tugEffort = 0;
    holder.bumpCooldown = Math.max(holder.bumpCooldown, 0.28);
    challenger.grabCooldown = active ? 0.18 : 0.34;
    holder.hitFlash = Math.max(holder.hitFlash, 0.45);
    challenger.hitFlash = Math.max(challenger.hitFlash, 0.45);

    if (quality >= TACKLE_STAGGER_THRESHOLD) {
      const push = normalize2D(holder.x - challenger.x, holder.z - challenger.z);
      holder.vx += push.x * 0.75;
      holder.vz += push.z * 0.75;
      challenger.vx -= push.x * 0.45;
      challenger.vz -= push.z * 0.45;
    }

    feedback.contest();
    showMessage(
      "Серке тянут!",
      challenger.human || holder.human
        ? "Удерживай действие, чтобы перетянуть серке. Это тратит выносливость."
        : `${challenger.name} тянет серке. Нужна борьба, одного удара мало.`,
      1.25
    );
  }

  function resolveTackleAttempt(tackler, active, impactBonus = 0) {
    const holder = kokpar.holder;
    if (!holder || holder.team === tackler.team || holder === tackler) return;
    if (kokpar.contest.active && kokpar.contest.mode === "mounted") return;

    const quality = tackleQuality(tackler, holder, active, impactBonus);

    if (quality >= TACKLE_DROP_THRESHOLD) {
      dropKokparFromTackle(holder, tackler, quality);
      return;
    }

    if (quality >= TACKLE_MOUNTED_CONTEST_THRESHOLD) {
      startMountedContest(holder, tackler, active, quality);
      return;
    }

    if (quality >= TACKLE_STAGGER_THRESHOLD && holder.bumpCooldown <= 0) {
      staggerFromTackle(holder, tackler, quality);
      return;
    }

    tackler.grabCooldown = active ? 0.32 : 0.5;
  }

  function resolveBodyCheckImpact(tackler, opponent, relativeSpeed) {
    if (tackler.team === opponent.team || !isBodyCheckDriving(tackler)) return false;

    const push = normalize2D(opponent.x - tackler.x, opponent.z - tackler.z);
    const tacklerSide = { x: -Math.sin(tackler.rotation), z: Math.cos(tackler.rotation) };
    const leanSign = Math.sign(push.x * tacklerSide.x + push.z * tacklerSide.z) || 1;
    const impactPower = clamp((0.72 + relativeSpeed / 20) * (tackler.bodyCheckPowerMultiplier ?? 1), 0.62, 1.46);
    const hitHolder = kokpar.holder === opponent;

    tackler.bodyCheckTime = 0;
    tackler.bodyCheckRecovery = BODY_CHECK_HIT_RECOVERY_SECONDS;
    tackler.hitFlash = Math.max(tackler.hitFlash, 0.8);
    opponent.hitFlash = Math.max(opponent.hitFlash, 0.9);
    setImpactReaction(tackler, -leanSign * 0.45);
    setImpactReaction(opponent, leanSign);
    opponent.vx += push.x * BODY_CHECK_PUSH * impactPower;
    opponent.vz += push.z * BODY_CHECK_PUSH * impactPower;
    tackler.vx -= push.x * 0.55;
    tackler.vz -= push.z * 0.55;
    tackler.bumpCooldown = Math.max(tackler.bumpCooldown, 0.16);
    onBodyCheckImpact?.(tackler, opponent, impactPower, hitHolder);

    if (hitHolder) {
      const speedBonus = clamp((relativeSpeed - 3) / 17, 0, 0.13);
      resolveTackleAttempt(tackler, true, BODY_CHECK_CONTACT_BONUS + speedBonus);
    } else {
      applyStagger(opponent, 0.2 + impactPower * 0.1, {
        x: push.x * (0.8 + impactPower * 0.55),
        z: push.z * (0.8 + impactPower * 0.55)
      });
      tackler.grabCooldown = Math.max(tackler.grabCooldown, 0.28);
      feedback.impact(relativeSpeed > 9);

      if (tackler.human || opponent.human) {
        showMessage(
          tackler.human ? "Попадание корпусом!" : `${tackler.name} ударил корпусом`,
          "Всадник сбит с траектории, но борьба продолжается.",
          1.05
        );
      }
    }

    return true;
  }

  function resolveRiderCollisions() {
    for (let i = 0; i < riders.length; i += 1) {
      for (let j = i + 1; j < riders.length; j += 1) {
        const a = riders[i];
        const b = riders[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distance = Math.hypot(dx, dz) || 1;
        const relativeSpeed = Math.hypot(a.vx - b.vx, a.vz - b.vz);

        if (distance >= RIDER_COLLISION_RADIUS) continue;

        const penetration = RIDER_COLLISION_RADIUS - distance;
        const nx = dx / distance;
        const nz = dz / distance;
        const relativeNormalSpeed = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        const approachSpeed = Math.max(0, -relativeNormalSpeed);
        const push = penetration * 0.34;
        const impulse = clamp(penetration * 0.62 + approachSpeed * 0.12, 0.24, 1.45);

        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
        a.vx -= nx * impulse;
        a.vz -= nz * impulse;
        b.vx += nx * impulse;
        b.vz += nz * impulse;
        a.vx *= 0.992;
        a.vz *= 0.992;
        b.vx *= 0.992;
        b.vz *= 0.992;

        let bodyCheckConnected = false;
        if (a.team !== b.team) {
          if (isBodyCheckDriving(a)) {
            bodyCheckConnected = resolveBodyCheckImpact(a, b, relativeSpeed);
          } else if (isBodyCheckDriving(b)) {
            bodyCheckConnected = resolveBodyCheckImpact(b, a, relativeSpeed);
          }
        }

        if (!bodyCheckConnected && kokpar.holder && (kokpar.holder === a || kokpar.holder === b) && a.team !== b.team) {
          const holder = kokpar.holder;
          const tackler = holder === a ? b : a;

          if (holder.bumpCooldown <= 0 && tackler.grabCooldown <= 0) {
            const impactBonus = clamp((relativeSpeed - 4) / 18, 0, 0.18);
            resolveTackleAttempt(tackler, false, impactBonus);
          }
        }

        if (kokpar.holder && a.team !== b.team && a !== kokpar.holder && b !== kokpar.holder) {
          if (a.team === kokpar.holder.team) {
            resolveGuardBlock(a, b, relativeSpeed);
          } else if (b.team === kokpar.holder.team) {
            resolveGuardBlock(b, a, relativeSpeed);
          }
        }
      }
    }

    keepNonDuelRidersOutsideCenter();
    riders.forEach(keepRiderOutsideKazanGoals);
  }

  return {
    bodyCheckPose,
    isBodyCheckActive,
    isBodyCheckDriving,
    resolveRiderCollisions,
    resolveTackleAttempt,
    startBodyCheck,
    updateRiderContactState
  };
}
