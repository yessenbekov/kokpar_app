import { clamp, distance2D, forwardVector } from "./mathUtils.js";
import { TEAM } from "./constants.js";

const GRAB_RADIUS = 4.2;
const STEAL_RADIUS = 4.7;
const CONTEST_RADIUS = 5.4;
const CONTEST_MIN_SECONDS = 0.55;
const CONTEST_MAX_SECONDS = 1.55;
const CONTEST_PROGRESS_RATE = 1.15;
const MOUNTED_CONTEST_RADIUS = 5.2;
const MOUNTED_CONTEST_MIN_SECONDS = 0.65;
const MOUNTED_CONTEST_MAX_SECONDS = 2.35;
const MOUNTED_CONTEST_PROGRESS_RATE = 0.95;
const MOUNTED_TUG_BUILD_RATE = 2.35;
const MOUNTED_TUG_FADE_RATE = 1.45;
const MOUNTED_TUG_STAMINA_DRAIN = 0.42;
const MOUNTED_TUG_STAMINA_RECOVERY = 0.08;
const MOUNTED_TUG_MIN_STAMINA = 0.08;
const MOUNTED_TUG_POWER_BONUS = 0.5;
const CARRIED_SERKE_HEIGHT = 1.78;

export function createContestSystem({
  kokpar,
  match,
  riders,
  contactSystem,
  feedback,
  showMessage,
  clearContest,
  resetThrowCharge,
  actionHeldForRider,
  closestRider
}) {
  function isMountedContestParticipant(rider) {
    return (
      kokpar.contest.active &&
      kokpar.contest.mode === "mounted" &&
      (kokpar.contest.holder === rider || kokpar.contest.challenger === rider)
    );
  }

  function holderKeepsMountedContest(holder, challenger) {
    clearContest();
    holder.bumpCooldown = Math.max(holder.bumpCooldown, 0.28);
    if (challenger) challenger.grabCooldown = Math.max(challenger.grabCooldown, 0.48);

    if (holder.human || challenger?.human) {
      showMessage(
        holder.human ? "Ты удержал серке" : `${holder.name} удержал серке`,
        "Соперник не смог вырвать его в борьбе.",
        1.2
      );
    }
  }

  function contestCandidates(radius = CONTEST_RADIUS) {
    if (kokpar.contest.active && kokpar.contest.mode === "mounted") {
      const holder = kokpar.contest.holder;
      const challenger = kokpar.contest.challenger;
      const candidates = [];

      if (holder && kokpar.holder === holder) candidates.push(holder);
      if (challenger && holder && distance2D(challenger, holder) <= MOUNTED_CONTEST_RADIUS) {
        candidates.push(challenger);
      }

      return candidates;
    }

    return riders.filter(
      (rider) =>
        (!match.duelMode || match.duelRiders.has(rider)) &&
        distance2D(rider, kokpar) <= radius
    );
  }

  function contestPowerForRider(rider) {
    const mounted = kokpar.contest.active && kokpar.contest.mode === "mounted";
    const holder = kokpar.contest.holder;
    const challenger = kokpar.contest.challenger;
    const distance = mounted && holder ? distance2D(rider, holder) : distance2D(rider, kokpar);
    const maxDistance = mounted ? MOUNTED_CONTEST_RADIUS : CONTEST_RADIUS;
    if (distance > maxDistance) return 0;

    const speed = Math.hypot(rider.vx, rider.vz);
    const distancePower = mounted
      ? rider === holder
        ? 1
        : clamp(1 - (distance - 2.1) / (maxDistance - 2.1), 0.16, 1)
      : clamp(1 - (distance - 1.6) / (CONTEST_RADIUS - 1.6), 0.12, 1);
    const speedPower = clamp(1 - speed / (mounted ? 22 : 24), 0.52, 1);
    const staminaPower = 0.72 + rider.stamina * 0.28;
    const intentPower = !mounted && actionHeldForRider(rider) ? 1.22 : 1;
    const tugPower = mounted && rider.human ? 1 + (rider.tugEffort ?? 0) * MOUNTED_TUG_POWER_BONUS : 1;
    const rolePower = rider.aiRole === "pickup" || rider.aiRole === "tackler" ? 1.08 : rider.aiRole === "carrier" ? 1.04 : 1;
    const bumpPower = mounted && rider === holder ? 1 : rider.bumpCooldown > 0 ? 0.64 : 1;
    const mountedPower =
      mounted
        ? rider === holder
          ? 1.18
          : rider === challenger
            ? 1.08
            : 1
        : 1;

    return (
      distancePower *
      speedPower *
      staminaPower *
      intentPower *
      tugPower *
      rolePower *
      bumpPower *
      mountedPower *
      (rider.contestPowerMultiplier ?? 1)
    );
  }

  function contestPowerForTeam(team, candidates) {
    return candidates
      .filter((rider) => rider.team === team)
      .reduce((total, rider) => total + contestPowerForRider(rider), 0);
  }

  function contestLeader(candidates) {
    const nearest = closestRider(kokpar, candidates);
    if (!nearest) return null;

    if (Math.abs(kokpar.contest.progress) < 0.08) return nearest;

    const leadingTeam = kokpar.contest.progress > 0 ? TEAM.blue : TEAM.red;
    return closestRider(kokpar, candidates.filter((rider) => rider.team === leadingTeam)) ?? nearest;
  }

  function updateMountedContestEffort(dt, candidates) {
    candidates.forEach((rider) => {
      if (!rider.human) return;

      const canPull = actionHeldForRider(rider) && rider.stamina > MOUNTED_TUG_MIN_STAMINA;
      if (canPull) {
        rider.tugEffort = clamp((rider.tugEffort ?? 0) + dt * MOUNTED_TUG_BUILD_RATE, 0, 1);
        rider.stamina = clamp(rider.stamina - dt * MOUNTED_TUG_STAMINA_DRAIN * (rider.staminaDrainMultiplier ?? 1), 0, 1);
        rider.hitFlash = Math.max(rider.hitFlash, 0.18 + (rider.tugEffort ?? 0) * 0.2);
      } else {
        rider.tugEffort = Math.max(0, (rider.tugEffort ?? 0) - dt * MOUNTED_TUG_FADE_RATE);
        rider.stamina = clamp(rider.stamina + dt * MOUNTED_TUG_STAMINA_RECOVERY * (rider.staminaRecoveryMultiplier ?? 1), 0, 1);
      }

      rider.pullPose = Math.max(rider.pullPose ?? 0, 0.45 + (rider.tugEffort ?? 0) * 0.44);
    });
  }

  function takeKokpar(rider, options = {}) {
    const active = options.active ?? false;
    const contested = options.contested ?? false;
    const stolen = options.stolen ?? false;
    const mounted = options.mounted ?? false;
    const wonCenterDuel = match.duelMode;

    if (stolen && rider.human) match.playerSteals += 1;
    clearContest();
    kokpar.holder = rider;
    kokpar.flightTeam = null;
    kokpar.flightScorer = null;
    kokpar.flightTime = 0;
    kokpar.lastThrowHuman = false;
    kokpar.vy = 0;
    resetThrowCharge();
    rider.grabCooldown = active ? 0.22 : 0.48;
    if (mounted || stolen) {
      rider.pullPose = Math.max(rider.pullPose ?? 0, 1.14);
      rider.pickupPose = Math.max(rider.pickupPose ?? 0, 0.22);
    } else {
      rider.pickupPose = Math.max(rider.pickupPose ?? 0, contested ? 1.18 : 1.08);
    }
    feedback.pickup(rider.team, stolen || contested);

    showMessage(
      stolen
        ? rider.human
          ? mounted
            ? "Ты вырвал серке!"
            : "Чистый перехват!"
          : `${rider.name} вырвал серке`
        : contested
        ? rider.human
          ? "Ты выиграл борьбу"
          : `${rider.name} выиграл борьбу`
        : wonCenterDuel
          ? `${rider.name} поднял серке`
          : rider.human
            ? "Кокпар у тебя"
            : `${rider.name} поднял кокпар`,
      stolen
        ? mounted
          ? "Победа после борьбы на лошади."
          : "Сильный контакт и правильный угол атаки."
        : contested
        ? wonCenterDuel
          ? "Вытащи серке из круга, остальные пока не войдут."
          : "Владение получено после борьбы."
        : wonCenterDuel
          ? "Вытащи серке из круга, остальные пока не войдут."
          : "Толпа закрывается.",
      1.6
    );
  }

  function startContest(rider, active) {
    kokpar.contest.active = true;
    kokpar.contest.mode = "loose";
    kokpar.contest.progress = rider.team === TEAM.blue ? 0.12 : -0.12;
    kokpar.contest.time = 0;
    kokpar.contest.leader = rider;
    kokpar.contest.holder = null;
    kokpar.contest.challenger = null;
    kokpar.vx *= 0.28;
    kokpar.vz *= 0.28;
    rider.grabCooldown = active ? 0.18 : 0.38;

    feedback.contest();
    showMessage(
      "Борьба за серке",
      rider.human
        ? "Держись в кольце у серке и жми Space, чтобы перетянуть шкалу."
        : `${rider.name} вошел в борьбу. Кольца показывают участников подбора.`,
      0.95
    );
  }

  function updateContest(dt) {
    if (!kokpar.contest.active) return;

    if (kokpar.holder && kokpar.contest.mode !== "mounted") {
      clearContest();
      return;
    }

    const candidates = contestCandidates();
    if (candidates.length === 0) {
      clearContest();
      return;
    }

    if (kokpar.contest.mode === "mounted") {
      const holder = kokpar.contest.holder;
      const challenger = kokpar.contest.challenger;

      if (!holder || kokpar.holder !== holder || !challenger || distance2D(holder, challenger) > MOUNTED_CONTEST_RADIUS) {
        if (holder && kokpar.holder === holder) holderKeepsMountedContest(holder, challenger);
        else clearContest();
        return;
      }

      updateMountedContestEffort(dt, candidates);
    }

    const bluePower = contestPowerForTeam(TEAM.blue, candidates);
    const redPower = contestPowerForTeam(TEAM.red, candidates);
    const totalPower = bluePower + redPower;
    if (totalPower <= 0.01) return;

    const progressRate = kokpar.contest.mode === "mounted" ? MOUNTED_CONTEST_PROGRESS_RATE : CONTEST_PROGRESS_RATE;

    kokpar.contest.time += dt;
    kokpar.contest.progress = clamp(
      kokpar.contest.progress + ((bluePower - redPower) / totalPower) * progressRate * dt,
      -1,
      1
    );
    kokpar.contest.leader = contestLeader(candidates);

    if (kokpar.contest.mode === "mounted") {
      const holder = kokpar.contest.holder;
      const challenger = kokpar.contest.challenger;
      const holderSign = holder.team === TEAM.blue ? 1 : -1;
      const challengerSign = challenger.team === TEAM.blue ? 1 : -1;
      const holderWinning =
        Math.sign(kokpar.contest.progress) === holderSign && Math.abs(kokpar.contest.progress) >= 0.88;
      const challengerWinning =
        Math.sign(kokpar.contest.progress) === challengerSign && Math.abs(kokpar.contest.progress) >= 0.82;
      const timedOut = kokpar.contest.time >= MOUNTED_CONTEST_MAX_SECONDS;
      const challengerLeads =
        Math.sign(kokpar.contest.progress) === challengerSign && Math.abs(kokpar.contest.progress) >= 0.42;

      if (challengerWinning && kokpar.contest.time >= MOUNTED_CONTEST_MIN_SECONDS) {
        takeKokpar(challenger, { contested: true, stolen: true, mounted: true });
        return;
      }

      if (holderWinning && kokpar.contest.time >= MOUNTED_CONTEST_MIN_SECONDS) {
        holderKeepsMountedContest(holder, challenger);
        return;
      }

      if (timedOut) {
        if (challengerLeads) {
          takeKokpar(challenger, { contested: true, stolen: true, mounted: true });
        } else {
          holderKeepsMountedContest(holder, challenger);
        }
      }
      return;
    }

    const oneTeamLeft = bluePower <= 0.04 || redPower <= 0.04;
    const decisive = Math.abs(kokpar.contest.progress) >= 0.78 && kokpar.contest.time >= CONTEST_MIN_SECONDS;
    const timedOut = kokpar.contest.time >= CONTEST_MAX_SECONDS;

    if ((oneTeamLeft && kokpar.contest.time >= 0.75) || decisive || timedOut) {
      takeKokpar(kokpar.contest.leader ?? candidates[0], { contested: true });
    }
  }

  function attemptGrab(rider, active) {
    if (match.phase !== "live" || match.over || rider.grabCooldown > 0) return;
    if (match.duelMode && !match.duelRiders.has(rider)) return;
    if (kokpar.flightTeam) return;
    if (kokpar.contest.active && !kokpar.holder) return;

    if (!kokpar.holder && kokpar.looseCooldown <= 0 && distance2D(rider, kokpar) < GRAB_RADIUS) {
      const nearby = contestCandidates();
      const opponentNearby = nearby.some((candidate) => candidate.team !== rider.team);

      if (opponentNearby) {
        startContest(rider, active);
      } else {
        takeKokpar(rider, { active });
      }
      return;
    }

    if (kokpar.holder && kokpar.holder.team !== rider.team && distance2D(rider, kokpar.holder) < STEAL_RADIUS) {
      contactSystem.resolveTackleAttempt(rider, active);
    }
  }

  function pullSerkeDuringMountedContest(holder) {
    const challenger = kokpar.contest.challenger;
    if (!challenger || kokpar.contest.holder !== holder) return;

    const challengerFwd = forwardVector(challenger);
    const challengerSide = { x: -challengerFwd.z, z: challengerFwd.x };
    const carrySide = challenger.team === TEAM.blue ? -1 : 1;
    const reachX = challenger.x + challengerFwd.x * 0.72 + challengerSide.x * carrySide * 0.74;
    const reachZ = challenger.z + challengerFwd.z * 0.72 + challengerSide.z * carrySide * 0.74;
    const holderSign = holder.team === TEAM.blue ? 1 : -1;
    const challengerAdvantage = clamp(-kokpar.contest.progress * holderSign, 0, 1);
    const challengerEffort = challenger.tugEffort ?? 0;
    const pull = 0.12 + challengerAdvantage * 0.46 + challengerEffort * 0.1;

    kokpar.x += (reachX - kokpar.x) * pull;
    kokpar.z += (reachZ - kokpar.z) * pull;
    kokpar.y = CARRIED_SERKE_HEIGHT + 0.05 + challengerAdvantage * 0.08;
  }

  return {
    isMountedContestParticipant,
    contestCandidates,
    contestPowerForRider,
    attemptGrab,
    updateContest,
    pullSerkeDuringMountedContest,
    takeKokpar,
    startContest
  };
}
