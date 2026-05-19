import * as THREE from "three";
import { COLORS, GOAL_RADIUS, MATCH_SECONDS, TEAM, WORLD, goalFor } from "./constants.js";
import {
  createContestIndicatorMesh,
  createGoalMesh,
  createHorseMesh,
  createKokparMesh,
  createRider,
  disposeObject3D
} from "./entities.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function normalize2D(x, z) {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${min}:${sec}`;
}

const KOKPAR_START = { x: 0, z: -14.5 };
const CENTER_MARK = { x: 0, z: 0 };
const START_LINE_Z = WORLD.height / 2;
const START_LANE_DEPTH = 17;
const START_CAMERA_FOCUS_Z = (START_LINE_Z + START_LANE_DEPTH * 0.62 + KOKPAR_START.z) / 2;
const START_CAMERA_POSITION = { x: -34, y: 72, z: 94 };
const CENTER_DUEL_CAMERA_POSITION = { x: -24, y: 54, z: 46 };
const ROUND_COUNTDOWN_SECONDS = 3;
const OUT_OF_BOUNDS_MARGIN = 0.2;
const RIDER_FIELD_EXIT_BUFFER = 10;
const GRAB_RADIUS = 4.2;
const STEAL_RADIUS = 4.7;
const CONTEST_RADIUS = 5.4;
const CONTEST_MIN_SECONDS = 0.55;
const CONTEST_MAX_SECONDS = 1.55;
const CONTEST_PROGRESS_RATE = 1.15;
const TACKLE_DROP_THRESHOLD = 0.58;
const TACKLE_STEAL_THRESHOLD = 0.86;
const TACKLE_STAGGER_THRESHOLD = 0.4;
const CENTER_CIRCLE_RADIUS = 8.5;
const CENTER_CIRCLE_GUARD_BUFFER = 2.2;
const CENTER_DUEL_START_DISTANCE = CENTER_CIRCLE_RADIUS + 4;
const CENTER_DUEL_RELEASE_DISTANCE = CENTER_CIRCLE_RADIUS + 1.8;
const CENTER_DUEL_SPOTS = {
  blue: { x: -CENTER_DUEL_START_DISTANCE, z: 0 },
  red: { x: CENTER_DUEL_START_DISTANCE, z: 0 }
};
const CENTER_SUPPORT_SPOTS = [
  { x: 18, z: -13 },
  { x: -18, z: 14 },
  { x: -15.5, z: 11.5 },
  { x: 15.5, z: -10.5 }
];
const STARTING_RIDER_SPOTS = [
  [-18, START_LINE_Z + 8],
  [-10, START_LINE_Z + 13],
  [-2, START_LINE_Z + 8],
  [6, START_LINE_Z + 13],
  [14, START_LINE_Z + 8],
  [22, START_LINE_Z + 13]
];

function createInitialRiders() {
  return [
    createRider({ name: "Сен", team: TEAM.blue, human: true, x: STARTING_RIDER_SPOTS[0][0], z: STARTING_RIDER_SPOTS[0][1], color: COLORS.blue }),
    createRider({ name: "Арман", team: TEAM.blue, x: STARTING_RIDER_SPOTS[1][0], z: STARTING_RIDER_SPOTS[1][1], color: COLORS.blueAlt }),
    createRider({ name: "Ерлан", team: TEAM.blue, x: STARTING_RIDER_SPOTS[2][0], z: STARTING_RIDER_SPOTS[2][1], color: COLORS.blueAlt }),
    createRider({ name: "Бек", team: TEAM.red, x: STARTING_RIDER_SPOTS[3][0], z: STARTING_RIDER_SPOTS[3][1], color: COLORS.red }),
    createRider({ name: "Нур", team: TEAM.red, x: STARTING_RIDER_SPOTS[4][0], z: STARTING_RIDER_SPOTS[4][1], color: COLORS.red }),
    createRider({ name: "Самат", team: TEAM.red, x: STARTING_RIDER_SPOTS[5][0], z: STARTING_RIDER_SPOTS[5][1], color: COLORS.red })
  ];
}

function isOutsideField(point, margin = 0) {
  return (
    point.x < -WORLD.width / 2 - margin ||
    point.x > WORLD.width / 2 + margin ||
    point.z < -WORLD.height / 2 - margin ||
    point.z > WORLD.height / 2 + margin
  );
}

function distanceFromCenter(point) {
  return Math.hypot(point.x - CENTER_MARK.x, point.z - CENTER_MARK.z);
}

function createGroundDetails(scene) {
  const fieldMaterial = new THREE.LineBasicMaterial({
    color: "#6a4a2e",
    transparent: true,
    opacity: 0.42
  });

  const borderPoints = [
    [-WORLD.width / 2, 0.04, -WORLD.height / 2],
    [WORLD.width / 2, 0.04, -WORLD.height / 2],
    [WORLD.width / 2, 0.04, WORLD.height / 2],
    [-WORLD.width / 2, 0.04, WORLD.height / 2],
    [-WORLD.width / 2, 0.04, -WORLD.height / 2]
  ].map((point) => new THREE.Vector3(...point));

  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPoints), fieldMaterial));
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.05, -WORLD.height / 2),
        new THREE.Vector3(0, 0.05, WORLD.height / 2)
      ]),
      fieldMaterial
    )
  );

  const centerMarkMaterial = new THREE.MeshStandardMaterial({
    color: "#f7e7b8",
    roughness: 0.82,
    transparent: true,
    opacity: 0.82
  });
  const centerCircle = new THREE.Mesh(new THREE.TorusGeometry(CENTER_CIRCLE_RADIUS, 0.09, 8, 84), centerMarkMaterial);
  centerCircle.position.set(CENTER_MARK.x, 0.11, CENTER_MARK.z);
  centerCircle.rotation.x = Math.PI / 2;
  scene.add(centerCircle);

  const centerSpot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 32), centerMarkMaterial);
  centerSpot.position.set(CENTER_MARK.x, 0.08, CENTER_MARK.z);
  scene.add(centerSpot);

  const serkeMarkMaterial = new THREE.MeshStandardMaterial({
    color: "#4fd7c8",
    roughness: 0.76,
    transparent: true,
    opacity: 0.92
  });
  const serkeStartRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.12, 8, 64), serkeMarkMaterial);
  serkeStartRing.position.set(KOKPAR_START.x, 0.12, KOKPAR_START.z);
  serkeStartRing.rotation.x = Math.PI / 2;
  scene.add(serkeStartRing);

  const serkeStartCrossA = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.07, 0.16), serkeMarkMaterial);
  serkeStartCrossA.position.set(KOKPAR_START.x, 0.12, KOKPAR_START.z);
  scene.add(serkeStartCrossA);

  const serkeStartCrossB = serkeStartCrossA.clone();
  serkeStartCrossB.rotation.y = Math.PI / 2;
  scene.add(serkeStartCrossB);

  const grassMaterials = [
    new THREE.MeshStandardMaterial({ color: "#869a57", roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: "#9aa760", roughness: 0.9 })
  ];

  for (let i = 0; i < 70; i += 1) {
    const tuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.18 + (i % 4) * 0.03, 0.9 + (i % 3) * 0.16, 5),
      grassMaterials[i % 2]
    );
    tuft.position.set(
      (Math.random() - 0.5) * (WORLD.groundWidth - 16),
      0.45,
      (Math.random() - 0.5) * (WORLD.groundHeight - 14)
    );
    tuft.rotation.y = Math.random() * Math.PI;
    tuft.castShadow = true;
    scene.add(tuft);
  }
}

export function createKokparGame(container, onHudChange) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 82, 160);

  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 260);
  camera.position.set(START_CAMERA_POSITION.x, START_CAMERA_POSITION.y, START_CAMERA_POSITION.z);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const hemisphereLight = new THREE.HemisphereLight("#f7dfaa", "#6a7a59", 1.85);
  scene.add(hemisphereLight);

  const sun = new THREE.DirectionalLight("#fff0c8", 2.2);
  sun.position.set(-25, 48, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.groundWidth, WORLD.groundHeight, 24, 18),
    new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.92 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  createGroundDetails(scene);

  const blueGoal = createGoalMesh(COLORS.blue);
  blueGoal.position.set(goalFor(TEAM.blue).x, 0, goalFor(TEAM.blue).z);
  scene.add(blueGoal);

  const redGoal = createGoalMesh(COLORS.red);
  redGoal.position.set(goalFor(TEAM.red).x, 0, goalFor(TEAM.red).z);
  scene.add(redGoal);

  const riders = createInitialRiders();
  const player = riders[0];
  riders.forEach((rider) => {
    rider.group = createHorseMesh(rider.color, rider.team);
    scene.add(rider.group);
  });

  const kokpar = {
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    holder: null,
    looseCooldown: 0,
    contest: {
      active: false,
      progress: 0,
      time: 0,
      leader: null
    },
    mesh: createKokparMesh()
  };
  scene.add(kokpar.mesh);

  const carryStrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1, 8),
    new THREE.MeshBasicMaterial({ color: "#f7e7b8", transparent: true, opacity: 0.82 })
  );
  carryStrap.visible = false;
  scene.add(carryStrap);

  const contestIndicator = createContestIndicatorMesh();
  scene.add(contestIndicator);

  const carryStrapAxis = new THREE.Vector3(0, 1, 0);
  const carryStrapStart = new THREE.Vector3();
  const carryStrapEnd = new THREE.Vector3();
  const carryStrapDirection = new THREE.Vector3();

  const keys = new Set();
  const match = {
    blue: 0,
    red: 0,
    time: MATCH_SECONDS,
    over: false,
    phase: "countdown",
    countdown: ROUND_COUNTDOWN_SECONDS,
    countdownLabel: "Старт через",
    message: "На старт",
    submessage: "Всадники за линией. Жди свистка.",
    messageTime: ROUND_COUNTDOWN_SECONDS,
    duelMode: false,
    duelRiders: new Set()
  };

  let animationFrame = 0;
  let lastFrameTime = performance.now();
  let isDestroyed = false;
  const cameraDesired = new THREE.Vector3();
  const cameraLookAt = new THREE.Vector3();

  function publishHud() {
    const isCountdown = match.phase === "countdown";
    const countdown = Math.max(1, Math.ceil(clamp(match.countdown, 0, ROUND_COUNTDOWN_SECONDS)));

    onHudChange({
      blue: match.blue,
      red: match.red,
      timer: formatTime(match.time),
      stamina: player.stamina,
      carry:
        kokpar.contest.active
          ? "Борьба за серке"
          : kokpar.holder === player
          ? "Кокпар у тебя"
          : kokpar.holder
            ? `${kokpar.holder.name} держит`
            : "Кокпар на поле",
      message: isCountdown ? `${match.countdownLabel} ${countdown}` : match.message,
      submessage: match.submessage,
      showBanner: isCountdown || match.messageTime > 0 || match.over
    });
  }

  function showMessage(message, submessage, seconds = 2.5) {
    match.message = message;
    match.submessage = submessage;
    match.messageTime = seconds;
    publishHud();
  }

  function beginCountdown(
    message = "На старт",
    submessage = "Всадники за линией. Жди свистка.",
    countdownLabel = "Старт через"
  ) {
    match.phase = "countdown";
    match.countdown = ROUND_COUNTDOWN_SECONDS;
    match.countdownLabel = countdownLabel;
    match.message = message;
    match.submessage = submessage;
    match.messageTime = ROUND_COUNTDOWN_SECONDS;
    riders.forEach((rider) => {
      rider.vx = 0;
      rider.vz = 0;
    });
    publishHud();
  }

  function startRound() {
    match.phase = "live";
    match.countdown = 0;
    kokpar.looseCooldown = 0.2;
    riders.forEach((rider) => {
      rider.grabCooldown = 0.15;
    });
    showMessage(
      match.duelMode ? "Подбор!" : "Алға!",
      match.duelMode ? "Один на один за серке." : "Розыгрыш начался.",
      1.1
    );
  }

  function clearContest() {
    kokpar.contest.active = false;
    kokpar.contest.progress = 0;
    kokpar.contest.time = 0;
    kokpar.contest.leader = null;
  }

  function resetPositions() {
    match.duelMode = false;
    match.duelRiders.clear();
    clearContest();

    riders.forEach((rider, index) => {
      rider.x = STARTING_RIDER_SPOTS[index][0];
      rider.z = STARTING_RIDER_SPOTS[index][1];
      rider.vx = 0;
      rider.vz = 0;
      rider.lean = 0;
      rider.staggerTime = 0;
      rider.hitFlash = 0;
      rider.rotation = Math.atan2(KOKPAR_START.z - rider.z, KOKPAR_START.x - rider.x);
      rider.grabCooldown = 0.8;
      rider.bumpCooldown = 0.3;
    });

    kokpar.x = KOKPAR_START.x;
    kokpar.z = KOKPAR_START.z;
    kokpar.vx = 0;
    kokpar.vz = 0;
    kokpar.holder = null;
    kokpar.looseCooldown = 0.8;
  }

  function placeRiderAt(rider, spot, target = KOKPAR_START) {
    rider.x = spot.x;
    rider.z = spot.z;
    rider.vx = 0;
    rider.vz = 0;
    rider.lean = 0;
    rider.staggerTime = 0;
    rider.hitFlash = 0;
    rider.rotation = Math.atan2(target.z - rider.z, target.x - rider.x);
    rider.grabCooldown = 0.8;
    rider.bumpCooldown = 0.3;
  }

  function keepRiderOutsideCenterDuel(rider) {
    if (!match.duelMode || match.duelRiders.has(rider)) return;

    const minDistance = CENTER_CIRCLE_RADIUS + CENTER_CIRCLE_GUARD_BUFFER;
    const dx = rider.x - CENTER_MARK.x;
    const dz = rider.z - CENTER_MARK.z;
    const distance = Math.hypot(dx, dz);

    if (distance >= minDistance) return;

    const fallbackDirection = rider.team === TEAM.blue ? -1 : 1;
    const nx = distance > 0.001 ? dx / distance : fallbackDirection;
    const nz = distance > 0.001 ? dz / distance : 0;
    rider.x = CENTER_MARK.x + nx * minDistance;
    rider.z = CENTER_MARK.z + nz * minDistance;

    const inwardSpeed = rider.vx * nx + rider.vz * nz;
    if (inwardSpeed < 0) {
      rider.vx -= nx * inwardSpeed;
      rider.vz -= nz * inwardSpeed;
    }
  }

  function keepNonDuelRidersOutsideCenter() {
    riders.forEach(keepRiderOutsideCenterDuel);
  }

  function releaseCenterDuelIfNeeded() {
    if (!match.duelMode) return;

    const serkeStillInCircle = distanceFromCenter(kokpar) <= CENTER_DUEL_RELEASE_DISTANCE;
    const duelRiderStillInCircle = Array.from(match.duelRiders).some(
      (rider) => distanceFromCenter(rider) <= CENTER_CIRCLE_RADIUS + CENTER_CIRCLE_GUARD_BUFFER
    );

    if (serkeStillInCircle || duelRiderStillInCircle) return;

    match.duelMode = false;
    match.duelRiders.clear();
    showMessage("Игра открыта", "Серке и дуэлянты вышли из круга. Все снова в борьбе.", 1.4);
  }

  function startCenterDuel() {
    const blueDuelRider =
      riders.find((rider) => rider.team === TEAM.blue && rider.human) ??
      riders.find((rider) => rider.team === TEAM.blue);
    const redDuelRider = riders.find((rider) => rider.team === TEAM.red);

    match.duelMode = true;
    match.duelRiders.clear();
    if (blueDuelRider) match.duelRiders.add(blueDuelRider);
    if (redDuelRider) match.duelRiders.add(redDuelRider);

    if (blueDuelRider) placeRiderAt(blueDuelRider, CENTER_DUEL_SPOTS.blue, CENTER_MARK);
    if (redDuelRider) placeRiderAt(redDuelRider, CENTER_DUEL_SPOTS.red, CENTER_MARK);

    let supportIndex = 0;
    riders.forEach((rider) => {
      if (match.duelRiders.has(rider)) return;

      placeRiderAt(rider, CENTER_SUPPORT_SPOTS[supportIndex % CENTER_SUPPORT_SPOTS.length], CENTER_MARK);
      supportIndex += 1;
    });

    kokpar.x = CENTER_MARK.x;
    kokpar.z = CENTER_MARK.z;
    kokpar.vx = 0;
    kokpar.vz = 0;
    kokpar.holder = null;
    kokpar.looseCooldown = 0.8;
    clearContest();

    beginCountdown(
      "Аут",
      "Серке в центре. Остальные ждут рядом, но не заходят в круг.",
      "Аут. Подбор через"
    );
  }

  function scoreGoal(team) {
    match[team] += 1;
    resetPositions();
    beginCountdown(
      team === TEAM.blue ? "Гол! Синие забили" : "Гол! Красные забили",
      "Новый розыгрыш начнется после свистка."
    );
  }

  function restart() {
    match.blue = 0;
    match.red = 0;
    match.time = MATCH_SECONDS;
    match.over = false;
    resetPositions();
    beginCountdown("Новый матч", "Серке лежит на дальней стороне поля.");
  }

  function supportPoint(holder, rider) {
    const scoringGoal = goalFor(rider.team);
    const side = rider.name.charCodeAt(0) % 2 === 0 ? -1 : 1;
    return {
      x: holder.x + (scoringGoal.x - holder.x) * 0.22,
      z: holder.z + side * 12
    };
  }

  function opponentTeam(team) {
    return team === TEAM.blue ? TEAM.red : TEAM.blue;
  }

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
          target: goalFor(rider.team),
          urgency: 1.12,
          closeRadius: 2,
          wander: 0.8
        };
      }

      if (holder.team === rider.team) {
        const supportTarget =
          aiIndex % 2 === 0
            ? supportPoint(holder, rider)
            : blockerPoint(rider, closestRider(holder, opponents), holder);

        return {
          role: aiIndex % 2 === 0 ? "support" : "blocker",
          target: supportTarget,
          urgency: aiIndex % 2 === 0 ? 0.92 : 0.82,
          closeRadius: aiIndex % 2 === 0 ? 4 : 3,
          wander: 1.5
        };
      }

      const defensiveRank = sortedRidersByDistance(holder, teammates).indexOf(rider);
      const holderGoal = goalFor(holder.team);

      if (defensiveRank === 0) {
        return {
          role: "tackler",
          target: { x: holder.x + holder.vx * 0.16, z: holder.z + holder.vz * 0.16 },
          urgency: 1.26,
          closeRadius: 1.5,
          wander: 1.1
        };
      }

      if (defensiveRank === 1) {
        return {
          role: "lane_blocker",
          target: clampFieldTarget(offsetPoint(pointBetween(holder, holderGoal, 0.38), holderGoal, side * 7)),
          urgency: 0.96,
          closeRadius: 3.5,
          wander: 1.3
        };
      }

      return {
        role: "defender",
        target: clampFieldTarget({ x: holderGoal.x - Math.sign(holderGoal.x) * 11, z: side * 10 }),
        urgency: 0.78,
        closeRadius: 6,
        wander: 1.7
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

    const scoringGoal = goalFor(rider.team);
    return {
      role: "outlet",
      target: clampFieldTarget(offsetPoint(kokpar, scoringGoal, side * 9, 7)),
      urgency: 0.78,
      closeRadius: 5.5,
      wander: 1.8
    };
  }

  function applyHorseControl(rider, direction, dt, options = {}) {
    const sprint = options.sprint ?? false;
    const urgency = options.urgency ?? 1;
    const hasDirection = Boolean(direction);
    const speed = Math.hypot(rider.vx, rider.vz);

    if (hasDirection) {
      const desiredRotation = Math.atan2(direction.z, direction.x);
      const turnSlowdown = clamp(1 - speed / (rider.maxSpeed * 1.85), 0.48, 1);
      const turnStep = rider.turnRate * turnSlowdown * clamp(urgency, 0.55, 1.35) * dt;
      const turn = clamp(angleDelta(desiredRotation, rider.rotation), -turnStep, turnStep);
      rider.rotation += turn;

      const targetLean = clamp(-turn / Math.max(dt, 0.001) * 0.06, -0.22, 0.22);
      rider.lean += (targetLean - rider.lean) * clamp(dt * 8, 0, 1);
    } else {
      rider.lean += (0 - rider.lean) * clamp(dt * 6, 0, 1);
    }

    const forward = { x: Math.cos(rider.rotation), z: Math.sin(rider.rotation) };
    const side = { x: -forward.z, z: forward.x };
    const forwardSpeed = rider.vx * forward.x + rider.vz * forward.z;
    const sideSpeed = rider.vx * side.x + rider.vz * side.z;
    const carrySlowdown = kokpar.holder === rider ? 0.88 : 1;
    const sprintBoost = sprint ? 1.06 : 1;
    const targetSpeed = hasDirection ? rider.maxSpeed * carrySlowdown * sprintBoost * clamp(urgency, 0.45, 1.06) : 0;
    const speedDelta = targetSpeed - forwardSpeed;
    const power = speedDelta >= 0 ? rider.acceleration : rider.brakePower;
    const forwardChange = clamp(speedDelta, -power * dt, power * dt);
    const grip = clamp(rider.lateralGrip * dt, 0, 0.78);
    const surfaceDrag = Math.pow(hasDirection ? 0.992 : 0.965, dt * 60);

    rider.vx += forward.x * forwardChange;
    rider.vz += forward.z * forwardChange;
    rider.vx -= side.x * sideSpeed * grip;
    rider.vz -= side.z * sideSpeed * grip;
    rider.vx *= surfaceDrag;
    rider.vz *= surfaceDrag;
  }

  function forwardVector(rider) {
    return { x: Math.cos(rider.rotation), z: Math.sin(rider.rotation) };
  }

  function applyStagger(rider, seconds, push = { x: 0, z: 0 }) {
    rider.staggerTime = Math.max(rider.staggerTime, seconds);
    rider.hitFlash = Math.max(rider.hitFlash, 1);
    rider.vx += push.x;
    rider.vz += push.z;
  }

  function tackleQuality(tackler, holder, active, impactBonus = 0) {
    const distance = distance2D(tackler, holder);
    const toHolder = normalize2D(holder.x - tackler.x, holder.z - tackler.z);
    const tacklerForward = forwardVector(tackler);
    const holderForward = forwardVector(holder);
    const approach = clamp((tacklerForward.x * toHolder.x + tacklerForward.z * toHolder.z + 0.18) / 1.18, 0, 1);
    const relativeSpeed = Math.hypot(tackler.vx - holder.vx, tackler.vz - holder.vz);
    const speedPower = clamp(relativeSpeed / 16, 0, 1);
    const distancePower = clamp(1 - (distance - 2.1) / (STEAL_RADIUS - 2.1), 0, 1);
    const holderSide = { x: -holderForward.z, z: holderForward.x };
    const toTackler = normalize2D(tackler.x - holder.x, tackler.z - holder.z);
    const sideContact = clamp(Math.abs(holderSide.x * toTackler.x + holderSide.z * toTackler.z), 0, 1);
    const staminaPower = 0.72 + tackler.stamina * 0.28;
    const activePower = active ? 1 : tackler.aiRole === "tackler" ? 0.9 : 0.74;
    const holderPenalty = holder.staggerTime > 0 ? 0.08 : 0;

    return clamp(
      distancePower * 0.2 +
        approach * 0.24 +
        speedPower * 0.22 +
        sideContact * 0.14 +
        staminaPower * 0.1 +
        activePower * 0.1 +
        impactBonus +
        holderPenalty,
      0,
      1
    );
  }

  function dropKokparFromTackle(holder, tackler, quality) {
    const push = normalize2D(holder.x - tackler.x, holder.z - tackler.z);

    kokpar.holder = null;
    kokpar.x = holder.x + push.x * 1.15;
    kokpar.z = holder.z + push.z * 1.15;
    kokpar.vx = holder.vx * 0.38 + tackler.vx * 0.34 + push.x * 3.2;
    kokpar.vz = holder.vz * 0.38 + tackler.vz * 0.34 + push.z * 3.2;
    kokpar.looseCooldown = 0.34;
    clearContest();

    applyStagger(holder, 0.48 + quality * 0.34, { x: push.x * 3.2, z: push.z * 3.2 });
    applyStagger(tackler, 0.18, { x: -push.x * 1.1, z: -push.z * 1.1 });
    holder.bumpCooldown = 0.88;
    tackler.grabCooldown = 0.56;

    showMessage(
      tackler.human ? "Серке выбит!" : `${tackler.name} выбил серке`,
      "Он снова на земле. Готовься к борьбе за подбор.",
      1.45
    );
  }

  function stealKokparByTackle(holder, tackler, active) {
    const push = normalize2D(holder.x - tackler.x, holder.z - tackler.z);

    applyStagger(holder, 0.55, { x: push.x * 3.8, z: push.z * 3.8 });
    holder.bumpCooldown = 0.86;
    tackler.grabCooldown = active ? 0.34 : 0.48;
    takeKokpar(tackler, { active, stolen: true });
  }

  function staggerFromTackle(holder, tackler, quality) {
    const push = normalize2D(holder.x - tackler.x, holder.z - tackler.z);

    applyStagger(holder, 0.24 + quality * 0.22, { x: push.x * 1.8, z: push.z * 1.8 });
    holder.bumpCooldown = 0.48;
    tackler.grabCooldown = 0.38;

    if (tackler.human || holder.human) {
      showMessage("Жесткий контакт", "Серке удержан, но всадника шатнуло.", 1.05);
    }
  }

  function resolveTackleAttempt(tackler, active, impactBonus = 0) {
    const holder = kokpar.holder;
    if (!holder || holder.team === tackler.team || holder === tackler) return;

    const quality = tackleQuality(tackler, holder, active, impactBonus);

    if (quality >= TACKLE_STEAL_THRESHOLD) {
      stealKokparByTackle(holder, tackler, active);
      return;
    }

    if (quality >= TACKLE_DROP_THRESHOLD) {
      dropKokparFromTackle(holder, tackler, quality);
      return;
    }

    if (quality >= TACKLE_STAGGER_THRESHOLD && holder.bumpCooldown <= 0) {
      staggerFromTackle(holder, tackler, quality);
      return;
    }

    tackler.grabCooldown = active ? 0.32 : 0.5;
  }

  function contestCandidates(radius = CONTEST_RADIUS) {
    return riders.filter(
      (rider) =>
        (!match.duelMode || match.duelRiders.has(rider)) &&
        distance2D(rider, kokpar) <= radius
    );
  }

  function contestPowerForRider(rider) {
    const distance = distance2D(rider, kokpar);
    if (distance > CONTEST_RADIUS) return 0;

    const speed = Math.hypot(rider.vx, rider.vz);
    const distancePower = clamp(1 - (distance - 1.6) / (CONTEST_RADIUS - 1.6), 0.12, 1);
    const speedPower = clamp(1 - speed / 24, 0.52, 1);
    const staminaPower = 0.72 + rider.stamina * 0.28;
    const intentPower = rider.human && keys.has(" ") ? 1.22 : 1;
    const rolePower = rider.aiRole === "pickup" || rider.aiRole === "tackler" ? 1.08 : 1;
    const bumpPower = rider.bumpCooldown > 0 ? 0.64 : 1;

    return distancePower * speedPower * staminaPower * intentPower * rolePower * bumpPower;
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

  function takeKokpar(rider, options = {}) {
    const active = options.active ?? false;
    const contested = options.contested ?? false;
    const stolen = options.stolen ?? false;
    const wonCenterDuel = match.duelMode;

    clearContest();
    kokpar.holder = rider;
    rider.grabCooldown = active ? 0.22 : 0.48;

    showMessage(
      stolen
        ? rider.human
          ? "Чистый перехват!"
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
        ? "Сильный контакт и правильный угол атаки."
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
    kokpar.contest.progress = rider.team === TEAM.blue ? 0.12 : -0.12;
    kokpar.contest.time = 0;
    kokpar.contest.leader = rider;
    kokpar.vx *= 0.28;
    kokpar.vz *= 0.28;
    rider.grabCooldown = active ? 0.18 : 0.38;

    showMessage(
      "Борьба за серке",
      rider.human ? "Держись рядом и жми Space." : `${rider.name} вошел в борьбу.`,
      0.95
    );
  }

  function updateContest(dt) {
    if (!kokpar.contest.active) return;

    if (kokpar.holder) {
      clearContest();
      return;
    }

    const candidates = contestCandidates();
    if (candidates.length === 0) {
      clearContest();
      return;
    }

    const bluePower = contestPowerForTeam(TEAM.blue, candidates);
    const redPower = contestPowerForTeam(TEAM.red, candidates);
    const totalPower = bluePower + redPower;
    if (totalPower <= 0.01) return;

    kokpar.contest.time += dt;
    kokpar.contest.progress = clamp(
      kokpar.contest.progress + ((bluePower - redPower) / totalPower) * CONTEST_PROGRESS_RATE * dt,
      -1,
      1
    );
    kokpar.contest.leader = contestLeader(candidates);

    const oneTeamLeft = bluePower <= 0.04 || redPower <= 0.04;
    const decisive = Math.abs(kokpar.contest.progress) >= 0.78 && kokpar.contest.time >= CONTEST_MIN_SECONDS;
    const timedOut = kokpar.contest.time >= CONTEST_MAX_SECONDS;

    if ((oneTeamLeft && kokpar.contest.time >= 0.75) || decisive || timedOut) {
      takeKokpar(kokpar.contest.leader ?? candidates[0], { contested: true });
    }
  }

  function attemptGrab(rider, active) {
    if (match.over || rider.grabCooldown > 0) return;
    if (match.duelMode && !match.duelRiders.has(rider)) return;
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
      resolveTackleAttempt(rider, active);
    }
  }

  function updateHuman(rider, dt) {
    let ax = 0;
    let az = 0;

    if (keys.has("arrowleft") || keys.has("a")) ax -= 1;
    if (keys.has("arrowright") || keys.has("d")) ax += 1;
    if (keys.has("arrowup") || keys.has("w")) az -= 1;
    if (keys.has("arrowdown") || keys.has("s")) az += 1;

    const moving = ax !== 0 || az !== 0;
    const sprint = moving && keys.has(" ") && rider.stamina > 0.08;
    const direction = moving ? normalize2D(ax, az) : null;

    applyHorseControl(rider, direction, dt, { sprint });

    if (sprint && moving) {
      rider.stamina = clamp(rider.stamina - dt * 0.36, 0, 1);
    } else if (moving) {
      rider.stamina = clamp(rider.stamina + dt * 0.12, 0, 1);
    } else {
      rider.stamina = clamp(rider.stamina + dt * 0.22, 0, 1);
    }

    if (keys.has(" ")) attemptGrab(rider, true);
  }

  function updateAI(rider, dt, time) {
    const plan = chooseAITarget(rider);
    const target = plan.target;
    rider.aiRole = plan.role;

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
      plan.role === "carrier" || plan.role === "tackler" || plan.role === "pickup"
        ? 1
        : clamp((targetDistance - plan.closeRadius) / 12 + 0.24, 0.2, 1);

    applyHorseControl(rider, direction, dt, { urgency: plan.urgency * pacing });
    attemptGrab(rider, false);
  }

  function updateRiderMovement(dt, time) {
    riders.forEach((rider) => {
      rider.grabCooldown = Math.max(0, rider.grabCooldown - dt);
      rider.bumpCooldown = Math.max(0, rider.bumpCooldown - dt);
      rider.staggerTime = Math.max(0, rider.staggerTime - dt);
      rider.hitFlash = Math.max(0, rider.hitFlash - dt * 2.8);

      const isWaitingDuringDuel = match.duelMode && !kokpar.holder && !match.duelRiders.has(rider);

      if (isWaitingDuringDuel) {
        rider.vx = 0;
        rider.vz = 0;
      } else if (rider.staggerTime > 0) {
        applyHorseControl(rider, null, dt);
      } else if (rider.human) {
        updateHuman(rider, dt);
      } else {
        updateAI(rider, dt, time);
      }

      const maxSpeed = rider.maxSpeed * (kokpar.holder === rider ? 0.88 : 1.04);
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
    });
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

        if (distance >= 3.6) continue;

        const push = (3.6 - distance) / 2;
        const nx = dx / distance;
        const nz = dz / distance;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
        a.vx -= nx * 2.8;
        a.vz -= nz * 2.8;
        b.vx += nx * 2.8;
        b.vz += nz * 2.8;

        if (kokpar.holder && (kokpar.holder === a || kokpar.holder === b) && a.team !== b.team) {
          const holder = kokpar.holder;
          const tackler = holder === a ? b : a;

          if (holder.bumpCooldown <= 0 && tackler.grabCooldown <= 0) {
            const impactBonus = clamp((relativeSpeed - 4) / 18, 0, 0.18);
            resolveTackleAttempt(tackler, false, impactBonus);
          }
        }
      }
    }

    keepNonDuelRidersOutsideCenter();
  }

  function updateKokpar(dt) {
    kokpar.looseCooldown = Math.max(0, kokpar.looseCooldown - dt);

    if (kokpar.contest.active) {
      updateContest(dt);
      return;
    }

    if (kokpar.holder) {
      const rider = kokpar.holder;
      const forward = forwardVector(rider);
      const side = { x: -forward.z, z: forward.x };
      const carrySide = rider.team === TEAM.blue ? -1 : 1;

      kokpar.x = rider.x + forward.x * 1.15 + side.x * carrySide * 1.05;
      kokpar.z = rider.z + forward.z * 1.15 + side.z * carrySide * 1.05;
      kokpar.vx = rider.vx;
      kokpar.vz = rider.vz;

      if (Math.hypot(kokpar.x - goalFor(rider.team).x, kokpar.z - goalFor(rider.team).z) < GOAL_RADIUS) {
        scoreGoal(rider.team);
        return;
      }

      if (isOutsideField(kokpar, OUT_OF_BOUNDS_MARGIN)) {
        startCenterDuel();
        return;
      }
      releaseCenterDuelIfNeeded();
      return;
    }

    kokpar.vx *= Math.pow(0.91, dt * 60);
    kokpar.vz *= Math.pow(0.91, dt * 60);
    kokpar.x += kokpar.vx * dt;
    kokpar.z += kokpar.vz * dt;

    if (isOutsideField(kokpar, OUT_OF_BOUNDS_MARGIN)) {
      startCenterDuel();
      return;
    }
    releaseCenterDuelIfNeeded();
  }

  function syncMeshes(time) {
    riders.forEach((rider) => {
      const speed = Math.hypot(rider.vx, rider.vz);
      const speedRatio = clamp(speed / Math.max(rider.maxSpeed, 1), 0, 1);
      const bob = Math.sin(time * 11 + rider.aiPhase) * Math.min(speed / 120, 0.18);
      const scale = (rider.bumpCooldown > 0 ? 1.08 : 1) + rider.hitFlash * 0.04;
      const hitLean = rider.hitFlash > 0 ? Math.sin(time * 36 + rider.aiPhase) * rider.hitFlash * 0.1 : 0;
      const stride = time * (5.3 + speed * 0.52) + rider.aiPhase;
      const legs = rider.group.userData.legs ?? [];
      const tail = rider.group.userData.tail;
      const dust = rider.group.userData.dust;

      rider.group.position.set(rider.x, Math.max(0, bob), rider.z);
      rider.group.rotation.y = -rider.rotation;
      rider.group.rotation.z = (rider.lean ?? 0) + hitLean;
      rider.group.scale.setScalar(scale);

      legs.forEach((leg) => {
        const phase = stride + leg.phase;
        const swing = Math.sin(phase) * speedRatio;
        const lift = Math.max(0, Math.cos(phase)) * speedRatio;

        leg.mesh.rotation.z = leg.baseRotationZ + swing * (0.2 + speedRatio * 0.2);
        leg.mesh.rotation.x = leg.baseRotationX + Math.sin(phase + 0.45) * speedRatio * 0.08;
        leg.mesh.position.y = leg.baseY + lift * 0.12;

        if (leg.wrap) {
          leg.wrap.rotation.z = leg.mesh.rotation.z;
          leg.wrap.rotation.x = leg.mesh.rotation.x;
          leg.wrap.position.y = leg.baseWrapY + lift * 0.08;
        }
      });

      if (tail) {
        tail.rotation.x = rider.group.userData.tailBaseRotationX + Math.sin(time * 5.4 + rider.aiPhase) * speedRatio * 0.06;
        tail.rotation.z = rider.group.userData.tailBaseRotationZ + speedRatio * 0.12;
      }

      if (dust) {
        const dustPower = clamp(speedRatio * 0.82 + Math.abs(rider.lean ?? 0) * 1.35 + rider.hitFlash * 0.5, 0, 1);
        dust.visible = dustPower > 0.12;
        dust.children.forEach((puff, index) => {
          const baseScale = puff.userData.baseScale ?? 1;
          const pulse = Math.sin(time * 7.2 + rider.aiPhase + index * 1.6) * 0.07;
          const spread = 0.68 + dustPower * 0.72 + index * 0.05 + pulse;

          puff.scale.setScalar(baseScale * spread);
          puff.material.opacity = dustPower * clamp(0.36 - index * 0.045, 0.16, 0.36);
        });
      }
    });

    const carriedHeight = kokpar.holder ? 1.78 + Math.sin(time * 8.5) * 0.06 : 0.72;
    kokpar.mesh.position.set(kokpar.x, carriedHeight, kokpar.z);
    kokpar.mesh.rotation.y += 0.02 + Math.hypot(kokpar.vx, kokpar.vz) * (kokpar.holder ? 0.001 : 0.002);
    kokpar.mesh.rotation.x = kokpar.holder ? -0.2 + Math.sin(time * 6) * 0.08 : 0;
    kokpar.mesh.rotation.z = kokpar.holder ? Math.sin(time * 7.5) * 0.16 : 0;
    kokpar.mesh.scale.setScalar(kokpar.holder ? 1.1 : 1);

    carryStrap.visible = Boolean(kokpar.holder);
    if (kokpar.holder) {
      const holder = kokpar.holder;
      const forward = forwardVector(holder);
      const side = { x: -forward.z, z: forward.x };
      const carrySide = holder.team === TEAM.blue ? -1 : 1;

      carryStrapStart.set(
        holder.x + forward.x * 0.25 + side.x * carrySide * 0.58,
        2.45,
        holder.z + forward.z * 0.25 + side.z * carrySide * 0.58
      );
      carryStrapEnd.set(kokpar.x, carriedHeight, kokpar.z);
      carryStrapDirection.subVectors(carryStrapEnd, carryStrapStart);

      const strapLength = carryStrapDirection.length();
      if (strapLength > 0.001) {
        carryStrap.position.copy(carryStrapStart).addScaledVector(carryStrapDirection, 0.5);
        carryStrap.scale.set(1, strapLength, 1);
        carryStrap.quaternion.setFromUnitVectors(carryStrapAxis, carryStrapDirection.normalize());
      }
    }

    contestIndicator.visible = kokpar.contest.active;
    if (kokpar.contest.active) {
      const progress = clamp(kokpar.contest.progress, -1, 1);
      const leaderColor = progress >= 0 ? COLORS.blue : COLORS.red;

      contestIndicator.position.set(kokpar.x, 2.5, kokpar.z);
      contestIndicator.userData.marker.position.x = progress * 1.18;
      contestIndicator.userData.marker.material.color.set(leaderColor);
      contestIndicator.userData.ring.material.color.set(leaderColor);
      contestIndicator.rotation.y = 0;
    }
  }

  function updateCamera(dt) {
    if (match.phase === "countdown") {
      if (match.duelMode) {
        cameraDesired.set(
          CENTER_DUEL_CAMERA_POSITION.x,
          CENTER_DUEL_CAMERA_POSITION.y,
          CENTER_DUEL_CAMERA_POSITION.z
        );
        cameraLookAt.set(CENTER_MARK.x, 1.1, CENTER_MARK.z);
      } else {
        cameraDesired.set(START_CAMERA_POSITION.x, START_CAMERA_POSITION.y, START_CAMERA_POSITION.z);
        cameraLookAt.set(0, 1.1, START_CAMERA_FOCUS_Z);
      }

      const countdownEase = 1 - Math.pow(0.01, dt);
      const targetFov = match.duelMode ? 58 : 64;

      camera.position.lerp(cameraDesired, countdownEase);
      camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.03, dt));
      camera.updateProjectionMatrix();
      camera.lookAt(cameraLookAt);
      return;
    }

    const speed = Math.hypot(player.vx, player.vz);
    const speedRatio = clamp(speed / player.maxSpeed, 0, 1);
    const serkeDistance = distance2D(player, kokpar);
    const serkeLead = kokpar.holder === player ? 0.12 : clamp(0.33 - serkeDistance / 420, 0.1, 0.3);
    const focusX = player.x + player.vx * 0.24 + (kokpar.x - player.x) * serkeLead;
    const focusZ = player.z + player.vz * 0.24 + (kokpar.z - player.z) * serkeLead;
    const looseSerkeFov = kokpar.holder ? 0 : clamp((serkeDistance - 28) / 80, 0, 1) * 4;

    cameraDesired.set(
      focusX - 18 - speedRatio * 4,
      31 + speedRatio * 7,
      focusZ + 31 + speedRatio * 7
    );
    cameraLookAt.set(focusX + 4, 0.9, focusZ);
    const cameraEase = 1 - Math.pow(0.015, dt);
    const targetFov = 56 + speedRatio * 5 + looseSerkeFov;

    camera.position.lerp(cameraDesired, cameraEase);
    camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.04, dt));
    camera.updateProjectionMatrix();
    camera.lookAt(cameraLookAt);
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(rect.height, 1);
    camera.updateProjectionMatrix();
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
    if (key === "r") restart();
    keys.add(key);
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function frame(now) {
    if (isDestroyed) return;

    const dt = clamp((now - lastFrameTime) / 1000, 0, 0.033);
    const time = now / 1000;
    lastFrameTime = now;

    if (!match.over) {
      if (match.phase === "countdown") {
        match.countdown -= dt;
        if (match.countdown <= 0) {
          startRound();
        }
      } else {
        match.time -= dt;

        if (match.time <= 0) {
          match.time = 0;
          match.over = true;
          const winner = match.blue === match.red ? "Ничья" : match.blue > match.red ? "Синие победили" : "Красные победили";
          showMessage(winner, "Можно начать новый матч.", 999);
        }

        updateRiderMovement(dt, time);
        resolveRiderCollisions();
        updateKokpar(dt);
      }
    }

    match.messageTime = Math.max(0, match.messageTime - dt);
    syncMeshes(time);
    updateCamera(dt);
    renderer.render(scene, camera);
    publishHud();
    animationFrame = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);

  resize();
  resetPositions();
  beginCountdown("На старт", "Серке лежит на дальней стороне поля.");
  publishHud();
  animationFrame = requestAnimationFrame(frame);

  return {
    restart,
    destroy() {
      isDestroyed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      disposeObject3D(scene);
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
  };
}
