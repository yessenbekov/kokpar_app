import * as THREE from "three";
import { COLORS, GOAL_RADIUS, MATCH_SECONDS, TEAM, WORLD, goalFor } from "./constants.js";
import {
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
const ROUND_COUNTDOWN_SECONDS = 3;
const OUT_OF_BOUNDS_MARGIN = 0.2;
const RIDER_FIELD_EXIT_BUFFER = 10;
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
    tuft.position.set((Math.random() - 0.5) * 175, 0.45, (Math.random() - 0.5) * 118);
    tuft.rotation.y = Math.random() * Math.PI;
    tuft.castShadow = true;
    scene.add(tuft);
  }
}

export function createKokparGame(container, onHudChange) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 82, 160);

  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 260);
  camera.position.set(0, 44, 48);

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
    mesh: createKokparMesh()
  };
  scene.add(kokpar.mesh);

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

  function publishHud() {
    const isCountdown = match.phase === "countdown";
    const countdown = Math.max(1, Math.ceil(clamp(match.countdown, 0, ROUND_COUNTDOWN_SECONDS)));

    onHudChange({
      blue: match.blue,
      red: match.red,
      timer: formatTime(match.time),
      stamina: player.stamina,
      carry:
        kokpar.holder === player
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

  function resetPositions() {
    match.duelMode = false;
    match.duelRiders.clear();

    riders.forEach((rider, index) => {
      rider.x = STARTING_RIDER_SPOTS[index][0];
      rider.z = STARTING_RIDER_SPOTS[index][1];
      rider.vx = 0;
      rider.vz = 0;
      rider.lean = 0;
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
    const sprintBoost = sprint ? 1.14 : 1;
    const targetSpeed = hasDirection ? rider.maxSpeed * carrySlowdown * sprintBoost * clamp(urgency, 0.45, 1.18) : 0;
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

  function attemptGrab(rider, active) {
    if (match.over || rider.grabCooldown > 0) return;
    if (match.duelMode && !match.duelRiders.has(rider)) return;

    if (!kokpar.holder && kokpar.looseCooldown <= 0 && distance2D(rider, kokpar) < 4.2) {
      const wonCenterDuel = match.duelMode;
      kokpar.holder = rider;
      rider.grabCooldown = active ? 0.18 : 0.44;
      showMessage(
        wonCenterDuel
          ? `${rider.name} поднял серке`
          : rider.human
            ? "Кокпар у тебя"
            : `${rider.name} поднял кокпар`,
        wonCenterDuel ? "Вытащи серке из круга, остальные пока не войдут." : "Толпа закрывается.",
        1.6
      );
      return;
    }

    if (kokpar.holder && kokpar.holder.team !== rider.team && distance2D(rider, kokpar.holder) < 4.7) {
      const holder = kokpar.holder;
      const speedBonus = clamp(Math.hypot(rider.vx, rider.vz) / 32, 0, 0.22);

      if (Math.random() < (active ? 0.7 : 0.45) + speedBonus) {
        kokpar.holder = rider;
        rider.grabCooldown = 0.4;
        holder.bumpCooldown = 0.55;
        holder.vx -= (rider.x - holder.x) * 2.3;
        holder.vz -= (rider.z - holder.z) * 2.3;
        showMessage(rider.human ? "Перехват!" : `${rider.name} вырвал кокпар`, "Момент для рывка.", 1.5);
      } else {
        rider.grabCooldown = active ? 0.35 : 0.55;
      }
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
    let target;

    if (kokpar.holder) {
      if (kokpar.holder.team === rider.team) {
        target = kokpar.holder === rider ? goalFor(rider.team) : supportPoint(kokpar.holder, rider);
      } else {
        target = kokpar.holder;
      }
    } else {
      target = kokpar;
    }

    const wander = {
      x: Math.cos(rider.aiPhase + time * 0.8) * 3.8,
      z: Math.sin(rider.aiPhase * 1.6 + time * 0.7) * 3.2
    };
    const direction = normalize2D(target.x + wander.x - rider.x, target.z + wander.z - rider.z);
    const urgency = kokpar.holder && kokpar.holder.team !== rider.team ? 1.22 : 1;
    const targetDistance = Math.hypot(target.x - rider.x, target.z - rider.z);
    const pacing = kokpar.holder === rider ? 1 : clamp(targetDistance / 14, 0.35, 1);

    applyHorseControl(rider, direction, dt, { urgency: urgency * pacing });
    attemptGrab(rider, false);
  }

  function updateRiderMovement(dt, time) {
    riders.forEach((rider) => {
      rider.grabCooldown = Math.max(0, rider.grabCooldown - dt);
      rider.bumpCooldown = Math.max(0, rider.bumpCooldown - dt);

      const isWaitingDuringDuel = match.duelMode && !kokpar.holder && !match.duelRiders.has(rider);

      if (isWaitingDuringDuel) {
        rider.vx = 0;
        rider.vz = 0;
      } else if (rider.human) {
        updateHuman(rider, dt);
      } else {
        updateAI(rider, dt, time);
      }

      const maxSpeed = rider.maxSpeed * (kokpar.holder === rider ? 0.92 : 1.16);
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

          if (holder.bumpCooldown <= 0 && Math.random() < 0.016) {
            kokpar.holder = null;
            kokpar.x = holder.x;
            kokpar.z = holder.z;
            kokpar.vx = holder.vx * 0.5 + tackler.vx * 0.25;
            kokpar.vz = holder.vz * 0.5 + tackler.vz * 0.25;
            kokpar.looseCooldown = 0.45;
            holder.bumpCooldown = 0.8;
            showMessage("Кокпар выбит", "Он снова на земле.", 1.4);
          }
        }
      }
    }

    keepNonDuelRidersOutsideCenter();
  }

  function updateKokpar(dt) {
    kokpar.looseCooldown = Math.max(0, kokpar.looseCooldown - dt);

    if (kokpar.holder) {
      const rider = kokpar.holder;
      kokpar.x = rider.x + Math.cos(rider.rotation) * 2.6;
      kokpar.z = rider.z + Math.sin(rider.rotation) * 2.6;
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
      const bob = Math.sin(time * 11 + rider.aiPhase) * Math.min(speed / 120, 0.18);
      const scale = rider.bumpCooldown > 0 ? 1.08 : 1;
      const dust = rider.group.userData.dust;

      rider.group.position.set(rider.x, Math.max(0, bob), rider.z);
      rider.group.rotation.y = -rider.rotation;
      rider.group.rotation.z = rider.lean ?? 0;
      rider.group.scale.setScalar(scale);

      if (dust) {
        dust.visible = speed > 4;
        dust.children.forEach((puff, index) => {
          puff.material.opacity = clamp(speed / 42, 0.12, 0.34) * (1 - index * 0.16);
        });
      }
    });

    kokpar.mesh.position.set(kokpar.x, kokpar.holder ? 1.55 : 0.72, kokpar.z);
    kokpar.mesh.rotation.y += 0.02 + Math.hypot(kokpar.vx, kokpar.vz) * 0.002;
  }

  function updateCamera(dt) {
    const speed = Math.hypot(player.vx, player.vz);
    const speedRatio = clamp(speed / player.maxSpeed, 0, 1);
    const serkeDistance = distance2D(player, kokpar);
    const serkeLead = kokpar.holder === player ? 0.12 : clamp(0.22 - serkeDistance / 360, 0.08, 0.22);
    const focusX = player.x + player.vx * 0.24 + (kokpar.x - player.x) * serkeLead;
    const focusZ = player.z + player.vz * 0.24 + (kokpar.z - player.z) * serkeLead;
    const desired = new THREE.Vector3(
      focusX - 18 - speedRatio * 4,
      31 + speedRatio * 7,
      focusZ + 31 + speedRatio * 7
    );
    const cameraEase = 1 - Math.pow(0.015, dt);
    const targetFov = 56 + speedRatio * 5;

    camera.position.lerp(desired, cameraEase);
    camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.04, dt));
    camera.updateProjectionMatrix();
    camera.lookAt(focusX + 4, 0.9, focusZ);
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
