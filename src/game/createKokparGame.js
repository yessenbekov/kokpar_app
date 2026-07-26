import * as THREE from "three";
import { COLORS, GOAL_RADIUS, MATCH_SECONDS, TEAM, WORLD, goalFor } from "./constants.js";
import { createGameAssetPipeline, createKazanModelInstance, createRiderModelInstance, createSerkeModelInstance } from "./assets.js";
import {
  BODY_CHECK_COOLDOWN_SECONDS,
  TEAM_GUARD_RADIUS,
  createContactSystem
} from "./contactSystem.js";
import { createMatchFeedback } from "./feedback.js";
import { DEFAULT_HORSE_TYPE_ID, horseTypeById } from "./horseTypes.js";
import { applyEquipmentToStats, applyHorseProgression } from "../app/shopItems.js";
import {
  createContestIndicatorMesh,
  createGoalMesh,
  createHorseMesh,
  createKokparMesh,
  createRider,
  disposeObject3D
} from "./entities.js";
import {
  createBodyCheckImpactMarker,
  createContestRiderMarker,
  createMountedTensionGuide,
  createPlayerArrowMarker,
  createPlayerGroundMarker,
  createRiderRoleMarker
} from "./visualIndicators.js";
import { clamp, distance2D, normalize2D, rotate2D, angleDelta, formatTime, forwardVector } from "./mathUtils.js";
import { createGroundDetails, createArenaEnvironment } from "./arenaBuilder.js";
import { createThrowSystem } from "./throwSystem.js";
import { createAISystem } from "./aiSystem.js";
import { createCameraSystem } from "./cameraSystem.js";
import { createContestSystem } from "./contestSystem.js";
import { createRiderMovement } from "./riderMovement.js";


const KOKPAR_START = { x: 0, z: -14.5 };
const CENTER_MARK = { x: 0, z: 0 };
const START_LINE_Z = WORLD.height / 2;
const START_LANE_DEPTH = 17;
const START_CAMERA_FOCUS_Z = (START_LINE_Z + START_LANE_DEPTH * 0.62 + KOKPAR_START.z) / 2;
const START_CAMERA_POSITION = { x: -34, y: 72, z: 94 };
const CENTER_DUEL_CAMERA_POSITION = { x: -24, y: 54, z: 46 };
const ROUND_COUNTDOWN_SECONDS = 3;
const GOAL_CELEBRATION_SECONDS = 2.4;
const OUT_OF_BOUNDS_MARGIN = 0.2;
const RIDER_FIELD_EXIT_BUFFER = 10;
const START_LANE_FIELD_BUFFER = 5.0;
const START_TEAM_BOUNDARY_GAP = 2.4;
const GRAB_RADIUS = 4.2;
const STEAL_RADIUS = 4.7;
const GAIT_PHASE_MIN_RATE = 1.55;
const GAIT_PHASE_SPEED_RATE = 0.62;
const PICKUP_POSE_DECAY = 2.4;
const PULL_POSE_DECAY = 2.8;
const THROW_READY_EXTRA_RADIUS = 8.5;
const THROW_HINT_EXTRA_RADIUS = 16;
const THROW_MIN_SPEED = 12;
const THROW_MAX_SPEED = 24;
const THROW_CHARGE_SECONDS = 0.92;
const THROW_GRAVITY = 14;
const THROW_PREVIEW_STEPS = 22;
const THROW_PREVIEW_STEP_SECONDS = 0.075;
const THROW_AIM_MAX_ANGLE = Math.PI * 0.18;
const THROW_AIM_RATE = 1.18;
const LOOSE_SERKE_HEIGHT = 0.72;
const CARRIED_SERKE_HEIGHT = 1.78;
const PASS_RADIUS = 7;
const PASS_SPEED = 19;
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
const TEAM_LANE_THREAT_RADIUS = 17;
const TEAM_LANE_THREAT_LOOKAHEAD = 38;
const CENTER_CIRCLE_RADIUS = 8.5;
const CENTER_CIRCLE_GUARD_BUFFER = 2.2;
const CENTER_DUEL_START_DISTANCE = CENTER_CIRCLE_RADIUS + 4;
const CENTER_DUEL_RELEASE_DISTANCE = CENTER_CIRCLE_RADIUS + 1.8;
const KAZAN_BLOCK_RADIUS = GOAL_RADIUS * 0.98;
const KAZAN_COLLISION_DAMPING = 0.74;
const CENTER_DUEL_SPOTS = {
  blue: { x: -CENTER_DUEL_START_DISTANCE, z: 0 },
  red: { x: CENTER_DUEL_START_DISTANCE, z: 0 }
};
const CENTER_SUPPORT_SPOTS = [
  { x: 18, z: -13 },
  { x: -18, z: 14 },
  { x: -15.5, z: 11.5 },
  { x: 15.5, z: -10.5 },
  { x: 22, z: 8 },
  { x: -22, z: -8 },
  { x: 8, z: 16 },
  { x: -8, z: -15 }
];
const STARTING_RIDER_SPOTS = [
  [-28, START_LINE_Z + 8],
  [-20, START_LINE_Z + 13],
  [-12, START_LINE_Z + 8],
  [-4, START_LINE_Z + 13],
  [4, START_LINE_Z + 8],
  [12, START_LINE_Z + 13],
  [20, START_LINE_Z + 8],
  [28, START_LINE_Z + 13],
  [-8, START_LINE_Z + 17],
  [8, START_LINE_Z + 17]
];

const BLUE_RIDER_NAMES = ["Сен", "Арман", "Ерлан", "Данияр", "Аян"];
const RED_RIDER_NAMES = ["Бек", "Нур", "Самат", "Руслан", "Марат"];
const AI_HORSE_ROTATION = ["argymak", "zhuyrik", "auyr", "argymak", "auyr"];

function createInitialRiders(teamSize, playerHorseType = DEFAULT_HORSE_TYPE_ID, playerHorseName = null, playerTeam = TEAM.blue, playerCoatId = null, aiSpeedScale = 1, aiAccelScale = 1) {
  const riders = [];
  const size = clamp(Math.round(teamSize), 1, 5);

  for (let i = 0; i < size; i += 1) {
    const blueSpot = STARTING_RIDER_SPOTS[i * 2];
    const redSpot = STARTING_RIDER_SPOTS[i * 2 + 1];
    const blueIsPlayer = i === 0 && playerTeam === TEAM.blue;
    const redIsPlayer = i === 0 && playerTeam === TEAM.red;

    riders.push(
      createRider({
        name: BLUE_RIDER_NAMES[i],
        team: TEAM.blue,
        human: blueIsPlayer,
        x: blueSpot[0],
        z: blueSpot[1],
        color: blueIsPlayer ? COLORS.blue : COLORS.blueAlt,
        horseType: blueIsPlayer ? playerHorseType : AI_HORSE_ROTATION[i],
        horseName: blueIsPlayer ? playerHorseName : null,
        coatId: blueIsPlayer ? playerCoatId : null,
        aiSpeedScale: blueIsPlayer ? 1 : aiSpeedScale,
        aiAccelScale: blueIsPlayer ? 1 : aiAccelScale
      })
    );

    riders.push(
      createRider({
        name: RED_RIDER_NAMES[i],
        team: TEAM.red,
        human: redIsPlayer,
        x: redSpot[0],
        z: redSpot[1],
        color: COLORS.red,
        horseType: redIsPlayer ? playerHorseType : AI_HORSE_ROTATION[(i + 1) % AI_HORSE_ROTATION.length],
        horseName: redIsPlayer ? playerHorseName : null,
        coatId: redIsPlayer ? playerCoatId : null,
        aiSpeedScale: redIsPlayer ? 1 : aiSpeedScale,
        aiAccelScale: redIsPlayer ? 1 : aiAccelScale
      })
    );
  }

  return riders;
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

export function createKokparGame(container, onHudChange, options = {}) {
  const DIFFICULTY_PRESETS = {
    easy:   { urgencyScale: 0.70, wanderScale: 1.85, speedScale: 0.87, accelScale: 0.84, bodyCheckDist: 4.5, throwBase: 0.54, throwStam: 0.12, passRadius: 13 },
    normal: { urgencyScale: 1.0,  wanderScale: 1.0,  speedScale: 1.0,  accelScale: 1.0,  bodyCheckDist: 6.3, throwBase: 0.74, throwStam: 0.18, passRadius: 8.5 },
    hard:   { urgencyScale: 1.18, wanderScale: 0.52, speedScale: 1.10, accelScale: 1.08, bodyCheckDist: 8.2, throwBase: 0.88, throwStam: 0.22, passRadius: 6.0 }
  };
  const difficultyKey = ["easy", "normal", "hard"].includes(options.difficulty) ? options.difficulty : "normal";
  const difficulty = DIFFICULTY_PRESETS[difficultyKey];

  const gameSettings = {
    goalType: options.goalType === "kazan" ? "kazan" : "circle",
    teamSize: clamp(Math.round(Number(options.teamSize) || 3), 1, 5),
    matchSeconds: clamp(Number(options.matchSeconds) || MATCH_SECONDS, 60, 15 * 60),
    horseType: horseTypeById(options.horseType).id,
    horseName: typeof options.horseName === "string" && options.horseName.trim() ? options.horseName.trim() : null,
    horseCoatId: typeof options.horseCoatId === "string" ? options.horseCoatId : null,
    onMatchEvent: typeof options.onMatchEvent === "function" ? options.onMatchEvent : null
  };
  const isTraining = options.modeId === "training";
  const isOnline = Boolean(options.onlineMatchId);
  const isOnlineGuest = isOnline && options.onlineIsHost === false;
  const isSpectator = options.teamSide === "spectator";
  const playerTeam = options.teamSide === "red" ? TEAM.red : TEAM.blue;
  const playerHorseType = horseTypeById(gameSettings.horseType);
  const playerEquipment = options.equipment ?? {};
  const playerEffectiveStats = applyHorseProgression(
    applyEquipmentToStats(playerHorseType.stats, playerEquipment),
    options.horseLevel ?? 1,
    options.horseBond ?? 0
  );
  const scoreRadius = gameSettings.goalType === "kazan" ? GOAL_RADIUS * 0.82 : GOAL_RADIUS;
  const isMobile = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  const assetPipeline = createGameAssetPipeline();
  const feedback = createMatchFeedback(options.feedbackEnabled !== false);
  const scene = new THREE.Scene();
  const SKY_HORIZON = "#dfc090";
  scene.background = new THREE.Color(SKY_HORIZON);
  scene.fog = new THREE.Fog(SKY_HORIZON, 82, 160);

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(480, 24, 12),
    new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color(SKY_HORIZON).convertSRGBToLinear() },
        uZenith: { value: new THREE.Color("#3a78cc").convertSRGBToLinear() }
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uHorizon;
        uniform vec3 uZenith;
        varying vec3 vWorld;
        void main() {
          float t = clamp(normalize(vWorld).y * 2.2 + 0.06, 0.0, 1.0);
          gl_FragColor = vec4(mix(uHorizon, uZenith, pow(t, 0.55)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  skyDome.renderOrder = -1;
  scene.add(skyDome);

  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 260);
  camera.position.set(START_CAMERA_POSITION.x, START_CAMERA_POSITION.y, START_CAMERA_POSITION.z);

  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  container.appendChild(renderer.domElement);

  const hemisphereLight = new THREE.HemisphereLight("#fce8c0", "#8c9e70", 2.4);
  scene.add(hemisphereLight);

  const sun = new THREE.DirectionalLight("#ffe8a0", 3.6);
  sun.position.set(-32, 38, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 2;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const fillLight = new THREE.DirectionalLight("#b4c8e8", 0.5);
  fillLight.position.set(28, 22, -20);
  scene.add(fillLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.groundWidth, WORLD.groundHeight, 24, 18),
    new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.92 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  createGroundDetails(scene);
  const arenaPresentation = createArenaEnvironment(scene);

  if (isMobile) {
    scene.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = false;
    });
  }

  const blueKazanGlb = gameSettings.goalType === "kazan" ? createKazanModelInstance(assetPipeline, COLORS.blue) : null;
  const redKazanGlb = gameSettings.goalType === "kazan" ? createKazanModelInstance(assetPipeline, COLORS.red) : null;

  const blueGoal = createGoalMesh(COLORS.blue, gameSettings.goalType, blueKazanGlb);
  blueGoal.position.set(goalFor(TEAM.blue).x, 0, goalFor(TEAM.blue).z);
  scene.add(blueGoal);

  const redGoal = createGoalMesh(COLORS.red, gameSettings.goalType, redKazanGlb);
  redGoal.position.set(goalFor(TEAM.red).x, 0, goalFor(TEAM.red).z);
  scene.add(redGoal);

  const riders = createInitialRiders(gameSettings.teamSize, gameSettings.horseType, gameSettings.horseName, isSpectator ? null : playerTeam, gameSettings.horseCoatId, difficulty.speedScale, difficulty.accelScale);
  const player = riders.find(r => r.human) ?? riders[0];

  // Apply equipment bonuses to the human player's stats
  if (player && player.human) {
    const baseMaxSpeed = 19.5;
    const baseAcceleration = 27;
    const baseBrakePower = 44;
    const baseTurnRate = 4.15;
    const baseLateralGrip = 9.2;
    const s = playerEffectiveStats;
    player.maxSpeed = baseMaxSpeed * s.speed;
    player.acceleration = baseAcceleration * s.acceleration;
    player.brakePower = baseBrakePower * s.brake;
    player.turnRate = baseTurnRate * s.turn;
    player.lateralGrip = baseLateralGrip * s.grip;
    player.staminaDrainMultiplier = s.staminaDrain;
    player.staminaRecoveryMultiplier = s.staminaRecovery;
    player.carrySpeedMultiplier = s.carrySpeed;
    player.contestPowerMultiplier = s.contestPower;
    player.tacklePowerMultiplier = s.tacklePower;
    player.stabilityMultiplier = s.stability;
    player.bodyCheckPowerMultiplier = s.bodyCheckPower;
    player.bodyCheckLungeMultiplier = s.bodyCheckLunge;
  }

  const remoteRider = isOnline && !isOnlineGuest && !isSpectator ? (riders.find(r => r.team !== player.team) ?? null) : null;
  let remoteRiderInput = { x: 0, z: 0, action: false };
  function getRemoteRiderInput() { return remoteRiderInput; }

  function setRiderGroup(rider, nextGroup) {
    if (rider.group) {
      scene.remove(rider.group);
      disposeObject3D(rider.group);
    }

    rider.group = nextGroup;
    scene.add(rider.group);
  }

  riders.forEach((rider) => {
    setRiderGroup(rider, createHorseMesh(rider.color, rider.team, rider.horseType, rider.coatId));
    rider.contestMarker = createContestRiderMarker(rider.team === TEAM.blue ? COLORS.blue : COLORS.red);
    scene.add(rider.contestMarker);
    rider.roleMarker = createRiderRoleMarker();
    scene.add(rider.roleMarker);
    if (rider.human) {
      rider.groundMarker = createPlayerGroundMarker();
      scene.add(rider.groundMarker);
      rider.arrowMarker = createPlayerArrowMarker();
      scene.add(rider.arrowMarker);
    }
  });

  const kokpar = {
    x: 0,
    y: LOOSE_SERKE_HEIGHT,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    holder: null,
    passTarget: null,
    flightTeam: null,
    flightScorer: null,
    flightTime: 0,
    lastThrowHuman: false,
    throwCharging: false,
    throwCharge: 0,
    throwAimOffset: 0,
    looseCooldown: 0,
    contest: {
      active: false,
      mode: "loose",
      progress: 0,
      time: 0,
      leader: null,
      holder: null,
      challenger: null
    },
    mesh: createKokparMesh()
  };
  scene.add(kokpar.mesh);

  function setKokparMesh(nextMesh) {
    scene.remove(kokpar.mesh);
    disposeObject3D(kokpar.mesh);
    kokpar.mesh = nextMesh;
    scene.add(kokpar.mesh);
  }

  const carryStrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1, 8),
    new THREE.MeshBasicMaterial({ color: "#f7e7b8", transparent: true, opacity: 0.82 })
  );
  carryStrap.visible = false;
  scene.add(carryStrap);

  const contestTugStrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1, 8),
    new THREE.MeshBasicMaterial({ color: "#fff4c8", transparent: true, opacity: 0.74 })
  );
  contestTugStrap.visible = false;
  scene.add(contestTugStrap);

  const contestIndicator = createContestIndicatorMesh();
  scene.add(contestIndicator);

  const mountedTensionGuide = createMountedTensionGuide();
  scene.add(mountedTensionGuide);

  const bodyCheckImpactMarker = createBodyCheckImpactMarker();
  scene.add(bodyCheckImpactMarker);
  const bodyCheckImpact = {
    until: 0,
    duration: 0.42,
    x: 0,
    z: 0,
    strength: 0,
    color: "#f0c347"
  };

  const throwPreviewPositions = new Float32Array((THROW_PREVIEW_STEPS + 2) * 3);
  const throwPreviewGeometry = new THREE.BufferGeometry();
  throwPreviewGeometry.setAttribute("position", new THREE.BufferAttribute(throwPreviewPositions, 3));
  const throwPreviewLine = new THREE.Line(
    throwPreviewGeometry,
    new THREE.LineBasicMaterial({ color: "#f7e7b8", transparent: true, opacity: 0.82, depthWrite: false })
  );
  throwPreviewLine.visible = false;
  scene.add(throwPreviewLine);

  const throwLandingMarker = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.075, 8, 40),
    new THREE.MeshBasicMaterial({ color: "#f7e7b8", transparent: true, opacity: 0.86, depthWrite: false })
  );
  throwLandingMarker.rotation.x = Math.PI / 2;
  throwLandingMarker.visible = false;
  scene.add(throwLandingMarker);

  const carryStrapAxis = new THREE.Vector3(0, 1, 0);
  const carryStrapStart = new THREE.Vector3();
  const carryStrapEnd = new THREE.Vector3();
  const carryStrapDirection = new THREE.Vector3();
  const tugStrapStart = new THREE.Vector3();
  const tugStrapEnd = new THREE.Vector3();
  const tugStrapDirection = new THREE.Vector3();
  const tensionStart = new THREE.Vector3();
  const tensionEnd = new THREE.Vector3();
  const tensionDirection = new THREE.Vector3();

  const keys = new Set();
  const touchInput = {
    x: 0,
    z: 0,
    action: false
  };
  const gamepadPrev = { action: false, bodyCheck: false };
  let gamepadWasActive = false;
  const match = {
    blue: 0,
    red: 0,
    time: isTraining ? 0 : gameSettings.matchSeconds,
    over: false,
    phase: "countdown",
    countdown: ROUND_COUNTDOWN_SECONDS,
    goalPause: 0,
    goalTeam: null,
    goalScorer: null,
    countdownLabel: "Старт через",
    message: "На старт",
    submessage: "Всадники за линией. Жди свистка.",
    messageTime: ROUND_COUNTDOWN_SECONDS,
    startedEventSent: false,
    finishEventSent: false,
    duelMode: false,
    duelRiders: new Set(),
    playerGoals: 0,
    playerSteals: 0,
    breakawayCooldown: 0,
    announcedFinal30: false,
    announcedFinal10: false,
    lastPlayerTeamScore: 0,
    lastCountdownInt: ROUND_COUNTDOWN_SECONDS
  };

  let animationFrame = 0;
  let lastFrameTime = performance.now();
  let isDestroyed = false;
  let assetsLoaded = false;
  const cameraDesired = new THREE.Vector3();
  const cameraLookAt = new THREE.Vector3();
  const _inputFwdVec = new THREE.Vector3();
  const cameraTrack = new THREE.Vector3(0, 0.9, START_CAMERA_FOCUS_Z);
  const cameraTrackTarget = new THREE.Vector3(0, 0.9, START_CAMERA_FOCUS_Z);
  const cameraForwardVector = new THREE.Vector3();

  function showBodyCheckImpact(tackler, opponent, power, hitHolder) {
    bodyCheckImpact.x = (tackler.x + opponent.x) * 0.5;
    bodyCheckImpact.z = (tackler.z + opponent.z) * 0.5;
    bodyCheckImpact.strength = power + (hitHolder ? 0.16 : 0);
    bodyCheckImpact.color = tackler.team === TEAM.blue ? COLORS.blue : COLORS.red;
    bodyCheckImpact.until = performance.now() / 1000 + bodyCheckImpact.duration;
  }

  function showGuardIntervention(guard, opponent, pressure, holder) {
    showBodyCheckImpact(guard, opponent, 0.72 + pressure * 0.35, false);

    if (holder.human) {
      showMessage(
        "Партнер прикрыл!",
        `${guard.name} оттеснил соперника от серке.`,
        0.92
      );
    }
  }

  const contactSystem = createContactSystem({
    riders,
    kokpar,
    match,
    feedback,
    stealRadius: STEAL_RADIUS,
    looseSerkeHeight: LOOSE_SERKE_HEIGHT,
    clearContest,
    resetThrowCharge: () => resetThrowCharge(),
    showMessage,
    isMountedContestParticipant: (rider) => isMountedContestParticipant(rider),
    keepNonDuelRidersOutsideCenter,
    keepRiderOutsideKazanGoals,
    onBodyCheckImpact: showBodyCheckImpact,
    onGuardIntervention: showGuardIntervention
  });

  const throwSystem = createThrowSystem({
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
  });

  const {
    isThrownSerkeScoring,
    resetThrowCharge,
    startThrowCharge,
    updateThrowCharge,
    releaseThrowCharge,
    attemptThrow,
    updateThrowPreview
  } = throwSystem;

  const aiSystem = createAISystem({
    riders,
    kokpar,
    scoringGoalFor,
    opponentTeam,
    difficultyUrgencyScale: difficulty.urgencyScale,
    difficultyWanderScale: difficulty.wanderScale
  });

  const {
    chooseAITarget,
    keepRiderInStartLane,
    startLaneWarmupTarget,
    ridersForTeam,
    closestRider,
    sortedRidersByDistance,
    clampFieldTarget,
    supportPoint
  } = aiSystem;

  const contestSystem = createContestSystem({
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
  });

  const {
    isMountedContestParticipant,
    contestCandidates,
    contestPowerForRider,
    attemptGrab,
    updateContest,
    pullSerkeDuringMountedContest,
    takeKokpar,
    startContest
  } = contestSystem;

  const riderMovementSystem = createRiderMovement({
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
    keepRiderInStartLane,
    keepRiderOutsideCenterDuel,
    keepRiderOutsideKazanGoals,
    STARTING_RIDER_SPOTS,
    showMessage,
    remoteRider,
    getRemoteRiderInput,
    aiDifficulty: difficulty
  });

  const {
    applyHorseControl,
    updateRiderMovement,
    updateStartLaneMovement,
    updateRiderGaitState,
    updateRiderActionPoses,
    updateRiderThrowPose
  } = riderMovementSystem;

  const cameraSystem = createCameraSystem({
    camera,
    player,
    kokpar,
    match,
    contestCandidates,
    scoringGoalFor
  });

  const {
    updateCamera,
    currentCameraMode,
    cycleCameraMode
  } = cameraSystem;

  const assetsReadyPromise = assetPipeline.readyPromise.then(() => {
    if (isDestroyed) return;

    riders.forEach((rider) => {
      const modelGroup = createRiderModelInstance(assetPipeline, rider);
      if (modelGroup) setRiderGroup(rider, modelGroup);
    });

    const serkeModel = createSerkeModelInstance(assetPipeline);
    if (serkeModel) setKokparMesh(serkeModel);

    assetsLoaded = true;
    resetPositions();
    beginCountdown(
      isTraining ? "Тренировка" : "На старт",
      isTraining ? "Свободный заезд. Отрабатывай подборы и броски." : "Серке лежит на дальней стороне поля. Двигайся в своей зоне."
    );
    updateStadiumPresentation();
    publishHud(true);
  });

  function contestStatusText() {
    const progress = kokpar.contest.progress;
    const prefix = kokpar.contest.mode === "mounted" ? "Тянут серке" : "Борьба";
    if (kokpar.contest.mode === "mounted" && isMountedContestParticipant(player)) {
      const effort = player.tugEffort ?? 0;
      if (effort > 0.08) return `Тянешь: ${Math.round(effort * 100)}%`;
      return "Жми действие";
    }
    if (progress > 0.18) return `${prefix}: синие ведут`;
    if (progress < -0.18) return `${prefix}: красные ведут`;
    return `${prefix}: равная`;
  }

  function actionHeldForRider(rider) {
    return rider.human && (keys.has(" ") || touchInput.action);
  }


  function targetName() {
    return gameSettings.goalType === "kazan" ? "казан" : "круг";
  }

  function opponentTeam(team) {
    return team === TEAM.blue ? TEAM.red : TEAM.blue;
  }

  function scoringGoalFor(team) {
    return goalFor(opponentTeam(team));
  }

  function goalDistanceFor(rider) {
    const target = scoringGoalFor(rider.team);
    return Math.hypot(rider.x - target.x, rider.z - target.z);
  }

  function canThrowAtTarget(rider) {
    return goalDistanceFor(rider) <= scoreRadius + THROW_READY_EXTRA_RADIUS;
  }

  function findPassTarget(rider) {
    let best = null;
    let bestDist = PASS_RADIUS;
    for (const r of riders) {
      if (r === rider || r.team !== rider.team) continue;
      const dist = distance2D(rider, r);
      if (dist < bestDist) { bestDist = dist; best = r; }
    }
    return best;
  }

  function attemptPass(rider) {
    if (match.phase !== "live" || match.over) return false;
    if (kokpar.holder !== rider || kokpar.contest.active) return false;
    const target = findPassTarget(rider);
    if (!target) return false;

    const dx = target.x - rider.x;
    const dz = target.z - rider.z;
    const dist = Math.hypot(dx, dz) || 1;

    kokpar.holder = null;
    kokpar.passTarget = target;
    kokpar.flightTeam = rider.team;
    kokpar.flightScorer = null;
    kokpar.lastThrowHuman = Boolean(rider.human);
    kokpar.flightTime = 0;

    kokpar.x = rider.x + (dx / dist) * 1.8;
    kokpar.y = CARRIED_SERKE_HEIGHT;
    kokpar.z = rider.z + (dz / dist) * 1.8;
    kokpar.vx = (dx / dist) * PASS_SPEED;
    kokpar.vy = 3;
    kokpar.vz = (dz / dist) * PASS_SPEED;
    kokpar.looseCooldown = 0.3;

    feedback.pass();
    showMessage(`Пас → ${target.name}`, "", 1.0);
    return true;
  }

  function throwPointScores(team, x, y, z, flightTime) {
    if (!team || flightTime < 0.1) return false;

    const target = scoringGoalFor(team);
    const distance = Math.hypot(x - target.x, z - target.z);
    const targetRadius = gameSettings.goalType === "kazan" ? scoreRadius * 0.78 : scoreRadius;
    const heightOk = gameSettings.goalType === "kazan"
      ? y >= 0.35 && y <= 2.65
      : y <= 1.65;

    return distance <= targetRadius && heightOk;
  }

  function carryStatusText() {
    if (match.phase === "goal") return match.goalTeam === TEAM.blue ? "Гол синих" : "Гол красных";
    if (kokpar.contest.active) return contestStatusText();
    if (kokpar.flightTeam) return kokpar.flightTeam === TEAM.blue ? "Бросок синих" : "Бросок красных";
    if (contactSystem.isBodyCheckActive(player)) return "Силовой прием";
    if (kokpar.holder === player) {
      if (kokpar.throwCharging) return `Сила ${Math.round(kokpar.throwCharge * 100)}%`;
      if (canThrowAtTarget(player)) return "Удерживай Space";
      const passTarget = findPassTarget(player);
      if (passTarget) return `Space — пас → ${passTarget.name}`;
      return "Кокпар у тебя";
    }
    if (kokpar.holder) return `${kokpar.holder.name} держит`;
    return "Кокпар на поле";
  }



  function radarPoint(point) {
    return {
      x: clamp((point.x + WORLD.width / 2) / WORLD.width, 0, 1),
      z: clamp((point.z + WORLD.height / 2) / WORLD.height, 0, 1)
    };
  }

  function radarState() {
    const mountedContest = kokpar.contest.active && kokpar.contest.mode === "mounted";
    const activeContestRiders = kokpar.contest.active
      ? new Set(
          mountedContest
            ? [kokpar.contest.holder, kokpar.contest.challenger].filter(Boolean)
            : contestCandidates(CONTEST_RADIUS + 0.25)
        )
      : new Set();
    const supportRoles = new Set(["guard", "protector", "lane_guard", "escort"]);

    return {
      goals: [TEAM.blue, TEAM.red].map((team) => ({
        team,
        ...radarPoint(goalFor(team))
      })),
      riders: riders.map((rider) => ({
        name: rider.name,
        team: rider.team,
        human: rider.human,
          holder: kokpar.holder === rider,
          contesting: activeContestRiders.has(rider),
          supporting: Boolean(kokpar.holder && rider.team === kokpar.holder.team && supportRoles.has(rider.aiRole)),
          checking: contactSystem.isBodyCheckActive(rider),
          ...radarPoint(rider)
      })),
      serke: {
        carried: Boolean(kokpar.holder),
        flight: Boolean(kokpar.flightTeam),
        ...radarPoint(kokpar)
      }
    };
  }

  let lastHudTime = 0;
  function publishHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHudTime < 50) return;
    lastHudTime = now;
    const isCountdown = match.phase === "countdown";
    const countdown = Math.max(1, Math.ceil(clamp(match.countdown, 0, ROUND_COUNTDOWN_SECONDS)));
    const mountedContest = isMountedContestParticipant(player);
    const contestBalance = mountedContest ? clamp((1 - kokpar.contest.progress) / 2, 0, 1) : 0.5;
    const contestLeadingTeam =
      mountedContest && Math.abs(kokpar.contest.progress) >= 0.08
        ? kokpar.contest.progress > 0
          ? TEAM.blue
          : TEAM.red
        : null;

    onHudChange({
      blue: match.blue,
      red: match.red,
      timer: formatTime(match.time),
      stamina: player.stamina,
      throwPower: kokpar.throwCharging ? kokpar.throwCharge : 0,
      tugPower: mountedContest ? player.tugEffort ?? 0 : 0,
      mountedContest,
      contestBalance,
      contestLeadingTeam,
      bodyCheckCooldown: clamp(player.bodyCheckCooldown / BODY_CHECK_COOLDOWN_SECONDS, 0, 1),
      bodyCheckActive: contactSystem.isBodyCheckActive(player),
      bodyCheckReady:
        match.phase === "live" &&
        !match.over &&
        player.bodyCheckCooldown <= 0 &&
        player.stamina >= 0.2 &&
        kokpar.holder !== player,
      cameraMode: currentCameraMode().label,
      horseName: player.horseName ?? gameSettings.horseName ?? playerHorseType.name,
      carry: carryStatusText(),
      message: isCountdown ? `${match.countdownLabel} ${countdown}` : match.message,
      submessage: match.submessage,
      showBanner: isCountdown || match.messageTime > 0 || match.over,
      radar: radarState()
    });
  }

  function emitMatchEvent(type, payload = {}) {
    if (!gameSettings.onMatchEvent) return;

    gameSettings.onMatchEvent({
      type,
      phase: match.phase,
      score: {
        blue: match.blue,
        red: match.red
      },
      timer: formatTime(match.time),
      remainingSeconds: Math.max(0, Math.round(match.time)),
      ...payload
    });
  }

  function updateMatchCommentary() {
    if (match.over || match.phase !== "live" || match.messageTime > 0.4) return;

    const playerTeamScore = match[player.team];
    const opponentTeamScore = match[player.team === TEAM.blue ? TEAM.red : TEAM.blue];
    const gap = playerTeamScore - opponentTeamScore;

    if (!isTraining && match.time < 30 && !match.announcedFinal30) {
      match.announcedFinal30 = true;
      const scoreText = gap > 0 ? `Ведём ${playerTeamScore}:${opponentTeamScore}.` : gap < 0 ? `Проигрываем ${playerTeamScore}:${opponentTeamScore}.` : `Равно ${playerTeamScore}:${opponentTeamScore}.`;
      showMessage("Последние 30 секунд!", `${scoreText} Всё решается сейчас.`, 2.2);
      return;
    }

    if (!isTraining && match.time < 10 && !match.announcedFinal10) {
      match.announcedFinal10 = true;
      showMessage(gap < 0 ? "Нужен гол!" : gap === 0 ? "Нужен решающий!" : "Удержим победу!", "Финальный свисток рядом.", 1.8);
      return;
    }

    const currentPlayerTeamScore = match[player.team];
    if (currentPlayerTeamScore > match.lastPlayerTeamScore && !match.goalScorer?.human) {
      match.lastPlayerTeamScore = currentPlayerTeamScore;
    }
  }

  function updateStadiumPresentation() {
    const status =
      match.phase === "goal"
        ? match.goalTeam === TEAM.blue
          ? "Goal blue"
          : "Goal red"
        : match.phase === "countdown"
          ? match.duelMode
            ? "Center duel"
            : "Start"
          : kokpar.holder
            ? `${kokpar.holder.team} ball`
            : kokpar.flightTeam
              ? "Throw"
              : "Live";

    arenaPresentation.scoreboard.update({
      blue: match.blue,
      red: match.red,
      timer: formatTime(match.time),
      status
    });
  }

  function showMessage(message, submessage, seconds = 2.5) {
    match.message = message;
    match.submessage = submessage;
    match.messageTime = seconds;
    publishHud(true);
  }

  function beginCountdown(
    message = "На старт",
    submessage = "Всадники за линией. Можно двигаться в своей зоне.",
    countdownLabel = "Старт через"
  ) {
    match.phase = "countdown";
    match.countdown = ROUND_COUNTDOWN_SECONDS;
    match.lastCountdownInt = ROUND_COUNTDOWN_SECONDS;
    match.goalPause = 0;
    match.goalTeam = null;
    match.goalScorer = null;
    match.countdownLabel = countdownLabel;
    match.message = message;
    match.submessage = submessage;
    match.messageTime = ROUND_COUNTDOWN_SECONDS;
    riders.forEach((rider) => {
      rider.vx = 0;
      rider.vz = 0;
    });
    publishHud(true);
  }

  function startRound() {
    match.phase = "live";
    match.countdown = 0;
    match.goalPause = 0;
    match.goalTeam = null;
    match.goalScorer = null;
    if (!match.startedEventSent) {
      match.startedEventSent = true;
      emitMatchEvent("match_started", {
        goalType: gameSettings.goalType,
        teamSize: gameSettings.teamSize
      });
    }
    kokpar.looseCooldown = 0.2;
    riders.forEach((rider) => {
      rider.grabCooldown = 0.15;
    });
    feedback.whistle();
    showMessage(
      match.duelMode ? "Подбор!" : "Алға!",
      match.duelMode ? "Один на один за серке." : "Розыгрыш начался.",
      1.1
    );
  }

  function setTouchInput(nextInput = {}) {
    if (nextInput.action || nextInput.bodyCheck || Math.abs(nextInput.x ?? 0) > 0.01 || Math.abs(nextInput.z ?? 0) > 0.01) {
      feedback.prime();
    }
    const wasActionPressed = touchInput.action;

    if (Number.isFinite(nextInput.x)) touchInput.x = clamp(nextInput.x, -1, 1);
    if (Number.isFinite(nextInput.z)) touchInput.z = clamp(nextInput.z, -1, 1);

    if (typeof nextInput.action === "boolean") {
      touchInput.action = nextInput.action;

      if (touchInput.action && !wasActionPressed && kokpar.holder === player) {
        if (!canThrowAtTarget(player)) attemptPass(player);
        else startThrowCharge(player);
      } else if (!touchInput.action && wasActionPressed) {
        releaseThrowCharge(player);
      }
    }

    if (nextInput.bodyCheck) {
      contactSystem.startBodyCheck(player);
    }
  }

  function resetTouchInput() {
    touchInput.x = 0;
    touchInput.z = 0;
    touchInput.action = false;
  }

  function readGamepad() {
    const gamepads = navigator.getGamepads?.();
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) continue;

      const DEAD = 0.15;
      const gpX = Math.abs(gp.axes[0]) > DEAD ? gp.axes[0] : 0;
      const gpZ = Math.abs(gp.axes[1]) > DEAD ? gp.axes[1] : 0;
      const actionNow = !!(gp.buttons[0]?.pressed || gp.buttons[2]?.pressed);
      const bodyCheckNow = !!(gp.buttons[1]?.pressed || gp.buttons[5]?.pressed);
      const hasInput = Math.abs(gpX) > 0 || Math.abs(gpZ) > 0 || actionNow || bodyCheckNow;

      if (hasInput || gamepadWasActive) {
        setTouchInput({
          x: gpX,
          z: gpZ,
          action: actionNow,
          ...(bodyCheckNow && !gamepadPrev.bodyCheck ? { bodyCheck: true } : {})
        });
        gamepadWasActive = hasInput;
      }

      gamepadPrev.action = actionNow;
      gamepadPrev.bodyCheck = bodyCheckNow;
      return;
    }

    gamepadWasActive = false;
  }

  function clearContest() {
    kokpar.contest.active = false;
    kokpar.contest.mode = "loose";
    kokpar.contest.progress = 0;
    kokpar.contest.time = 0;
    kokpar.contest.leader = null;
    kokpar.contest.holder = null;
    kokpar.contest.challenger = null;
    riders.forEach((rider) => {
      rider.tugEffort = 0;
    });
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
      rider.stamina = 1;
      rider.lean = 0;
      rider.staggerTime = 0;
      rider.hitFlash = 0;
      rider.throwCooldown = 0;
      rider.gaitPhase = rider.aiPhase;
      rider.lastSpeed = 0;
      rider.stopPose = 0;
      rider.turnPose = 0;
      rider.bodyCheckWindup = 0;
      rider.bodyCheckTime = 0;
      rider.bodyCheckCooldown = 0;
      rider.bodyCheckRecovery = 0;
      rider.impactReactionTime = 0;
      rider.impactLean = 0;
      rider.protectionCooldown = 0;
      rider.pickupPose = 0;
      rider.pullPose = 0;
      rider.throwPose = 0;
      rider.tugEffort = 0;
      rider.rotation = Math.atan2(KOKPAR_START.z - rider.z, KOKPAR_START.x - rider.x);
      rider.grabCooldown = 0.8;
      rider.bumpCooldown = 0.3;
    });

    kokpar.x = KOKPAR_START.x;
    kokpar.y = LOOSE_SERKE_HEIGHT;
    kokpar.z = KOKPAR_START.z;
    kokpar.vx = 0;
    kokpar.vy = 0;
    kokpar.vz = 0;
    kokpar.holder = null;
    kokpar.flightTeam = null;
    kokpar.flightScorer = null;
    kokpar.flightTime = 0;
    kokpar.lastThrowHuman = false;
    kokpar.throwCharging = false;
    kokpar.throwCharge = 0;
    kokpar.throwAimOffset = 0;
    kokpar.looseCooldown = 0.8;
    bodyCheckImpact.until = 0;
    bodyCheckImpactMarker.visible = false;
  }

  function placeRiderAt(rider, spot, target = KOKPAR_START) {
    rider.x = spot.x;
    rider.z = spot.z;
    rider.vx = 0;
    rider.vz = 0;
    rider.lean = 0;
    rider.staggerTime = 0;
    rider.hitFlash = 0;
    rider.throwCooldown = 0;
    rider.gaitPhase = rider.aiPhase;
    rider.lastSpeed = 0;
    rider.stopPose = 0;
    rider.turnPose = 0;
    rider.bodyCheckWindup = 0;
    rider.bodyCheckTime = 0;
    rider.bodyCheckCooldown = 0;
    rider.bodyCheckRecovery = 0;
    rider.impactReactionTime = 0;
    rider.impactLean = 0;
    rider.protectionCooldown = 0;
    rider.pickupPose = 0;
    rider.pullPose = 0;
    rider.throwPose = 0;
    rider.tugEffort = 0;
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

  function keepRiderOutsideKazanGoal(rider, goal) {
    const dx = rider.x - goal.x;
    const dz = rider.z - goal.z;
    const distance = Math.hypot(dx, dz);

    if (distance >= KAZAN_BLOCK_RADIUS) return;

    const fallbackDirection = goal.x < 0 ? 1 : -1;
    const nx = distance > 0.001 ? dx / distance : fallbackDirection;
    const nz = distance > 0.001 ? dz / distance : 0;
    const inwardSpeed = rider.vx * nx + rider.vz * nz;

    rider.x = goal.x + nx * KAZAN_BLOCK_RADIUS;
    rider.z = goal.z + nz * KAZAN_BLOCK_RADIUS;
    rider.vx *= KAZAN_COLLISION_DAMPING;
    rider.vz *= KAZAN_COLLISION_DAMPING;

    if (inwardSpeed < 0) {
      rider.vx -= nx * inwardSpeed * 1.08;
      rider.vz -= nz * inwardSpeed * 1.08;
    }

    rider.bumpCooldown = Math.max(rider.bumpCooldown, 0.12);
  }

  function keepRiderOutsideKazanGoals(rider) {
    if (gameSettings.goalType !== "kazan") return;

    keepRiderOutsideKazanGoal(rider, goalFor(TEAM.blue));
    keepRiderOutsideKazanGoal(rider, goalFor(TEAM.red));
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
    feedback.outOfBounds();
    emitMatchEvent("out_of_bounds", {
      x: Number(kokpar.x.toFixed(2)),
      z: Number(kokpar.z.toFixed(2)),
      holderTeam: kokpar.holder?.team ?? null,
      flightTeam: kokpar.flightTeam ?? null
    });
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
    kokpar.y = LOOSE_SERKE_HEIGHT;
    kokpar.z = CENTER_MARK.z;
    kokpar.vx = 0;
    kokpar.vy = 0;
    kokpar.vz = 0;
    kokpar.holder = null;
    kokpar.passTarget = null;
    kokpar.flightTeam = null;
    kokpar.flightScorer = null;
    kokpar.flightTime = 0;
    kokpar.lastThrowHuman = false;
    kokpar.throwCharging = false;
    kokpar.throwCharge = 0;
    kokpar.throwAimOffset = 0;
    kokpar.looseCooldown = 0.8;
    clearContest();

    beginCountdown(
      "Аут",
      "Серке в центре. Остальные ждут рядом, но не заходят в круг.",
      "Аут. Подбор через"
    );
  }

  function scoreGoal(team) {
    feedback.goal(team);
    match[team] += 1;
    match.phase = "goal";
    match.goalPause = GOAL_CELEBRATION_SECONDS;
    match.goalTeam = team;
    match.goalScorer = kokpar.flightScorer;
    if (match.goalScorer?.human) match.playerGoals += 1;
    emitMatchEvent("goal", {
      team,
      scorer: match.goalScorer?.name ?? null,
      goalType: gameSettings.goalType
    });

    const target = scoringGoalFor(team);
    kokpar.x = clamp(kokpar.x, target.x - scoreRadius * 0.5, target.x + scoreRadius * 0.5);
    kokpar.z = clamp(kokpar.z, target.z - scoreRadius * 0.5, target.z + scoreRadius * 0.5);
    kokpar.y = gameSettings.goalType === "kazan" ? clamp(kokpar.y, 0.95, 1.65) : LOOSE_SERKE_HEIGHT;
    kokpar.vx = 0;
    kokpar.vy = 0;
    kokpar.vz = 0;
    kokpar.holder = null;
    kokpar.flightTeam = null;
    kokpar.flightScorer = null;
    kokpar.flightTime = 0;
    kokpar.lastThrowHuman = false;
    kokpar.looseCooldown = GOAL_CELEBRATION_SECONDS;
    resetThrowCharge();
    clearContest();

    const playerTeam = player.team;
    const scoringTeamScore = match[team];
    const opponentTeamScore = match[team === TEAM.blue ? TEAM.red : TEAM.blue];
    const gap = scoringTeamScore - opponentTeamScore;
    const playerScored = match.goalScorer?.human;
    const playerTeamScored = team === playerTeam;

    let headline, subline;
    if (playerScored) {
      headline = gap === 1 ? "Батыр! Сравняли счёт" : gap >= 3 ? "Батыр! Разрыв растёт!" : "Батыр! Отличный гол!";
      subline = `${match.goalScorer.name} забросил серке. Продолжаем в том же духе.`;
    } else if (playerTeamScored) {
      headline = team === TEAM.blue ? "Гол! Синие забили" : "Гол! Красные забили";
      subline = `${match.goalScorer?.name ?? "Партнёр"} забросил серке. Так держать!`;
    } else {
      headline = gap <= -2 ? "Соперники уходят в отрыв" : team === TEAM.blue ? "Гол! Синие забили" : "Гол! Красные забили";
      subline = `${match.goalScorer?.name ?? "Соперник"} забросил серке. ${gap <= -1 ? "Навёрстываем!" : "Новый розыгрыш."}`;
    }
    showMessage(headline, subline, GOAL_CELEBRATION_SECONDS);
  }

  function finishGoalCelebration() {
    const goalTeam = match.goalTeam;
    resetPositions();
    if (isTraining) {
      startRound();
    } else {
      beginCountdown(
        goalTeam === TEAM.blue ? "Гол! Синие забили" : "Гол! Красные забили",
        `Серке заброшен в ${targetName()}. Новый розыгрыш после свистка.`
      );
    }
  }

  function updateGoalCelebration(dt) {
    match.goalPause -= dt;
    riders.forEach((rider) => {
      contactSystem.updateRiderContactState(rider, dt);
      applyHorseControl(rider, null, dt);
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
      rider.throwPose = Math.max(0, (rider.throwPose ?? 0) - dt * 1.6);
      updateRiderActionPoses(rider, dt);
      keepRiderOutsideKazanGoals(rider);
      updateRiderGaitState(rider, dt);
    });
    contactSystem.resolveRiderCollisions();

    if (match.goalPause <= 0) {
      finishGoalCelebration();
    }
  }











  function restart() {
    match.blue = 0;
    match.red = 0;
    match.time = isTraining ? 0 : gameSettings.matchSeconds;
    match.over = false;
    match.startedEventSent = false;
    match.finishEventSent = false;
    match.playerGoals = 0;
    match.playerSteals = 0;
    match.announcedFinal30 = false;
    match.announcedFinal10 = false;
    match.breakawayCooldown = 0;
    match.lastPlayerTeamScore = 0;
    match.lastCountdownInt = isTraining ? 0 : gameSettings.matchSeconds;
    resetPositions();
    beginCountdown(
      isTraining ? "Тренировка" : "Новый матч",
      isTraining ? "Свободный заезд. Отрабатывай подборы и броски." : "Серке лежит на дальней стороне поля. Двигайся в своей зоне."
    );
  }






































  function riderRoleMarkerState(rider, inContest) {
    const tugEffort = rider.tugEffort ?? 0;

    // Player's own horse always shows a white marker regardless of game state
    if (rider.human) {
      if (kokpar.holder === rider) {
        return { visible: true, color: "#ffffff", core: "#ffe080", opacity: 0.97, scale: 1.28 + tugEffort * 0.18, height: 5.6 };
      }
      if (inContest) {
        return { visible: true, color: "#ffffff", core: "#aaddff", opacity: 0.92, scale: 1.12 + tugEffort * 0.18, height: 5.5 };
      }
      if (contactSystem.isBodyCheckActive(rider)) {
        return { visible: true, color: "#ffffff", core: "#f0c347", opacity: 0.92, scale: 1.18, height: 5.5 };
      }
      return { visible: true, color: "#ffffff", core: "#aaddff", opacity: 0.72, scale: 0.92, height: 5.6 };
    }

    if (contactSystem.isBodyCheckActive(rider)) {
      return {
        visible: true,
        color: "#f0c347",
        core: rider.team === TEAM.blue ? COLORS.blue : COLORS.red,
        opacity: 0.94,
        scale: 1.18,
        height: 4.48
      };
    }

    if (kokpar.holder === rider) {
      return {
        visible: true,
        color: "#f0c347",
        core: "#fff3d2",
        opacity: 0.94,
        scale: 1.22 + tugEffort * 0.18,
        height: 4.55
      };
    }

    if (inContest) {
      return {
        visible: true,
        color: rider.team === TEAM.blue ? COLORS.blue : COLORS.red,
        core: "#f7e7b8",
        opacity: 0.86,
        scale: 1.06 + tugEffort * 0.18,
        height: 4.35
      };
    }

    if (!kokpar.holder || rider.team !== kokpar.holder.team) {
      return { visible: false };
    }

    if (rider.aiRole === "protector") {
      return {
        visible: true,
        color: "#f0c347",
        core: rider.team === TEAM.blue ? COLORS.blue : COLORS.red,
        opacity: 0.95,
        scale: 1.08,
        height: 4.36
      };
    }

    if (rider.aiRole === "guard" || rider.aiRole === "lane_guard") {
      return {
        visible: true,
        color: rider.team === TEAM.blue ? COLORS.blue : COLORS.red,
        core: "#f7e7b8",
        opacity: 0.82,
        scale: 0.9,
        height: 4.22
      };
    }

    if (rider.aiRole === "escort") {
      return {
        visible: true,
        color: rider.team === TEAM.blue ? COLORS.blue : COLORS.red,
        core: "#f0c347",
        opacity: 0.68,
        scale: 0.78,
        height: 4.08
      };
    }

    return { visible: false };
  }

  function updateRiderRoleMarker(rider, state, time) {
    const marker = rider.roleMarker;
    if (!marker) return;

    marker.visible = state.visible;
    if (!state.visible) return;

    const pulse = 1 + Math.sin(time * 8.6 + rider.aiPhase) * 0.06;
    const scale = (state.scale ?? 1) * pulse;

    marker.position.set(rider.x, state.height ?? 4.2, rider.z);
    marker.quaternion.copy(camera.quaternion);
    marker.scale.setScalar(scale);
    marker.userData.ring.material.color.set(state.color);
    marker.userData.core.material.color.set(state.core ?? state.color);
    marker.userData.pointer.material.color.set(state.color);
    marker.userData.ring.material.opacity = state.opacity ?? 0.78;
    marker.userData.core.material.opacity = Math.min(0.96, (state.opacity ?? 0.78) + 0.1);
    marker.userData.pointer.material.opacity = Math.max(0.44, (state.opacity ?? 0.78) - 0.18);
  }

  function riderTugPoint(rider, height = 3.18) {
    return {
      x: rider.x,
      y: height,
      z: rider.z
    };
  }

  function updateMountedTensionGuide(time) {
    const holder = kokpar.contest.holder;
    const challenger = kokpar.contest.challenger;

    mountedTensionGuide.visible = false;
    if (!holder || !challenger || kokpar.holder !== holder) return;

    const progress = clamp(kokpar.contest.progress, -1, 1);
    const holderSign = holder.team === TEAM.blue ? 1 : -1;
    const holderWinning = Math.sign(progress || holderSign) === holderSign;
    const winner = holderWinning ? holder : challenger;
    const loser = holderWinning ? challenger : holder;
    const winnerPoint = riderTugPoint(winner);
    const loserPoint = riderTugPoint(loser);

    tensionStart.set(
      loserPoint.x + (winnerPoint.x - loserPoint.x) * 0.24,
      loserPoint.y + Math.sin(time * 9.5) * 0.05,
      loserPoint.z + (winnerPoint.z - loserPoint.z) * 0.24
    );
    tensionEnd.set(
      loserPoint.x + (winnerPoint.x - loserPoint.x) * 0.76,
      winnerPoint.y + Math.sin(time * 9.5 + 0.8) * 0.05,
      loserPoint.z + (winnerPoint.z - loserPoint.z) * 0.76
    );
    tensionDirection.subVectors(tensionEnd, tensionStart);

    const length = tensionDirection.length();
    if (length < 0.4) return;

    const leaderColor = progress >= 0 ? COLORS.blue : COLORS.red;
    const advantage = clamp(Math.abs(progress), 0.18, 1);
    const opacity = 0.48 + advantage * 0.42;
    const radiusScale = 1 + advantage * 0.65 + Math.sin(time * 12) * 0.05;
    const shaft = mountedTensionGuide.userData.shaft;
    const head = mountedTensionGuide.userData.head;

    mountedTensionGuide.visible = true;
    mountedTensionGuide.position.copy(tensionStart).addScaledVector(tensionDirection, 0.5);
    mountedTensionGuide.quaternion.setFromUnitVectors(carryStrapAxis, tensionDirection.normalize());
    shaft.position.set(0, 0, 0);
    shaft.scale.set(radiusScale, Math.max(0.2, length - 0.38), radiusScale);
    head.position.set(0, length / 2, 0);
    head.scale.setScalar(0.8 + advantage * 0.42);
    shaft.material.color.set(leaderColor);
    head.material.color.set(leaderColor);
    shaft.material.opacity = opacity;
    head.material.opacity = Math.min(0.96, opacity + 0.08);
  }


  function updateKokpar(dt) {
    kokpar.looseCooldown = Math.max(0, kokpar.looseCooldown - dt);

    if (kokpar.contest.active && kokpar.contest.mode !== "mounted") {
      updateContest(dt);
      return;
    }

    if (kokpar.holder) {
      const rider = kokpar.holder;
      const forward = forwardVector(rider);
      const side = { x: -forward.z, z: forward.x };
      const carrySide = rider.team === TEAM.blue ? -1 : 1;

      kokpar.x = rider.x + forward.x * 1.15 + side.x * carrySide * 1.05;
      kokpar.y = CARRIED_SERKE_HEIGHT;
      kokpar.z = rider.z + forward.z * 1.15 + side.z * carrySide * 1.05;
      kokpar.vx = rider.vx;
      kokpar.vy = 0;
      kokpar.vz = rider.vz;

      if (kokpar.contest.active && kokpar.contest.mode === "mounted") {
        updateContest(dt);
        if (kokpar.holder !== rider) return;
        if (kokpar.contest.active && kokpar.contest.mode === "mounted") {
          pullSerkeDuringMountedContest(rider);
        }
      }

      if (isOutsideField(kokpar, OUT_OF_BOUNDS_MARGIN)) {
        startCenterDuel();
        return;
      }
      releaseCenterDuelIfNeeded();
      return;
    }

    if (kokpar.flightTeam) {
      // Auto-catch for passes
      if (kokpar.passTarget) {
        const pt = kokpar.passTarget;
        if (distance2D(kokpar, pt) < GRAB_RADIUS * 1.4) {
          kokpar.holder = pt;
          kokpar.passTarget = null;
          kokpar.flightTeam = null;
          kokpar.flightScorer = null;
          kokpar.flightTime = 0;
          kokpar.lastThrowHuman = false;
          kokpar.vx = 0;
          kokpar.vy = 0;
          kokpar.vz = 0;
          kokpar.looseCooldown = 0;
          if (pt === player) { feedback.passCatch(); showMessage("Поймал пас!", "", 1.0); }
          return;
        }
      }

      kokpar.flightTime += dt;
      kokpar.vy -= THROW_GRAVITY * dt;
      kokpar.x += kokpar.vx * dt;
      kokpar.y += kokpar.vy * dt;
      kokpar.z += kokpar.vz * dt;
      kokpar.vx *= Math.pow(0.988, dt * 60);
      kokpar.vz *= Math.pow(0.988, dt * 60);

      if (isThrownSerkeScoring()) {
        scoreGoal(kokpar.flightTeam);
        return;
      }

      if (isOutsideField(kokpar, OUT_OF_BOUNDS_MARGIN)) {
        startCenterDuel();
        return;
      }

      if (kokpar.y <= LOOSE_SERKE_HEIGHT) {
        const missedByHuman = kokpar.lastThrowHuman && !kokpar.passTarget;

        kokpar.y = LOOSE_SERKE_HEIGHT;
        kokpar.vy = 0;
        kokpar.vx *= 0.42;
        kokpar.vz *= 0.42;
        kokpar.flightTeam = null;
        kokpar.flightScorer = null;
        kokpar.flightTime = 0;
        kokpar.lastThrowHuman = false;
        kokpar.passTarget = null;
        resetThrowCharge();
        kokpar.looseCooldown = 0.42;

        if (missedByHuman) {
          showMessage("Мимо", "Серке упал на поле. Можно бороться за подбор.", 1.2);
        }
      }
      releaseCenterDuelIfNeeded();
      return;
    }

    kokpar.vx *= Math.pow(0.91, dt * 60);
    kokpar.vz *= Math.pow(0.91, dt * 60);
    kokpar.x += kokpar.vx * dt;
    kokpar.z += kokpar.vz * dt;
    kokpar.y = LOOSE_SERKE_HEIGHT;

    if (isOutsideField(kokpar, OUT_OF_BOUNDS_MARGIN)) {
      startCenterDuel();
      return;
    }
    releaseCenterDuelIfNeeded();
  }

  function updateBodyCheckImpactMarker(time) {
    const remaining = bodyCheckImpact.until - time;
    bodyCheckImpactMarker.visible = remaining > 0;
    if (remaining <= 0) return;

    const progress = 1 - remaining / bodyCheckImpact.duration;
    const scale = 0.78 + progress * (1.15 + bodyCheckImpact.strength * 0.3);
    const opacity = Math.max(0, (1 - progress) * 0.92);

    bodyCheckImpactMarker.position.set(bodyCheckImpact.x, 2.55, bodyCheckImpact.z);
    bodyCheckImpactMarker.quaternion.copy(camera.quaternion);
    bodyCheckImpactMarker.scale.setScalar(scale);
    bodyCheckImpactMarker.userData.ring.material.color.set(bodyCheckImpact.color);
    bodyCheckImpactMarker.userData.ring.material.opacity = opacity;
    bodyCheckImpactMarker.userData.slashes.forEach((slash) => {
      slash.material.color.set(bodyCheckImpact.color);
      slash.material.opacity = opacity * 0.9;
    });
  }

  function syncMeshes(time, dt) {
    const mountedContest = kokpar.contest.active && kokpar.contest.mode === "mounted";
    const contestParticipants =
      kokpar.contest.active
        ? new Set(
            mountedContest
              ? [kokpar.contest.holder, kokpar.contest.challenger].filter(Boolean)
              : contestCandidates(CONTEST_RADIUS + 0.25)
          )
        : new Set();

    riders.forEach((rider) => {
      const speed = Math.hypot(rider.vx, rider.vz);
      const speedRatio = clamp(speed / Math.max(rider.maxSpeed, 1), 0, 1);

      const gaitPhase = rider.gaitPhase ?? time * (GAIT_PHASE_MIN_RATE + speed * GAIT_PHASE_SPEED_RATE);
      const idleBlend = clamp(1 - speedRatio / 0.16, 0, 1);
      const trotBlend = clamp(1 - Math.abs(speedRatio - 0.42) / 0.34, 0, 1);
      const gallopBlend = clamp((speedRatio - 0.46) / 0.46, 0, 1);

      const mixer = rider.group.userData.mixer;
      if (mixer && dt) {
        const walkAction = rider.group.userData.walkAction;
        const gallopAction = rider.group.userData.gallopAction;
        if (walkAction && gallopAction) {
          const ts = 0.4 + speedRatio * 1.6;
          walkAction.setEffectiveWeight(1 - gallopBlend);
          gallopAction.setEffectiveWeight(gallopBlend);
          walkAction.setEffectiveTimeScale(ts);
          gallopAction.setEffectiveTimeScale(ts);
        } else {
          mixer.timeScale = 0.3 + speedRatio * speedRatio * 3.7;
        }
        mixer.update(dt);
      }

      const riderMixer = rider.group.userData.riderMixer;
      if (riderMixer && dt) {
        const riderWalkAction = rider.group.userData.riderWalkAction;
        const riderRunAction = rider.group.userData.riderRunAction;
        const ts = Math.max(0.3, speedRatio * 2.0);
        if (riderWalkAction) { riderWalkAction.setEffectiveWeight(1 - gallopBlend); riderWalkAction.setEffectiveTimeScale(ts); }
        if (riderRunAction) { riderRunAction.setEffectiveWeight(gallopBlend); riderRunAction.setEffectiveTimeScale(ts); }
        riderMixer.update(dt);
      }

      const stopPose = clamp(rider.stopPose ?? 0, 0, 1);
      const turnPose = clamp(rider.turnPose ?? 0, 0, 1);
      const idleBreath = Math.sin(time * 2.2 + rider.aiPhase) * idleBlend;
      const isGlbHorse = !!rider.group.userData.mixer;
      const walkWave = Math.max(0, Math.sin(gaitPhase * 2));
      const gallopWave = Math.pow(Math.max(0, Math.sin(gaitPhase * 1.5 + 0.3)), 1.6);
      const bounceWave = walkWave * (1 - gallopBlend) + gallopWave * gallopBlend;
      const gaitBounce = isGlbHorse ? 0 : bounceWave * (0.03 + trotBlend * 0.07 + gallopBlend * 0.13);
      const bob = isGlbHorse ? 0 : idleBreath * 0.026 + gaitBounce - stopPose * 0.035;
      const bodyCheckState = contactSystem.bodyCheckPose(rider);
      const bodyCheckPose = Math.max(bodyCheckState.drive, bodyCheckState.windup * 0.7);
      const bodyCheckRecoveryPose = Math.max(bodyCheckState.recovery, bodyCheckState.impact);
      const scale = (rider.bumpCooldown > 0 ? 1.08 : 1) + rider.hitFlash * 0.04 + bodyCheckState.impact * 0.025;
      const hitLean = rider.hitFlash > 0 ? Math.sin(time * 36 + rider.aiPhase) * rider.hitFlash * 0.1 : 0;
      const contactLean = (rider.impactLean ?? 0) * bodyCheckState.impact * 0.2;
      const stride = gaitPhase + rider.aiPhase * 0.12;
      const legs = rider.group.userData.legs ?? [];
      const horseBody = rider.group.userData.body;
      const horseHead = rider.group.userData.head;
      const tail = rider.group.userData.tail;
      const arms = rider.group.userData.arms ?? [];
      const upperBody = rider.group.userData.upperBody ?? [];
      const dust = rider.group.userData.dust;
      const inContest = contestParticipants.has(rider);
      const reachSide = rider.team === TEAM.blue ? -1 : 1;
      const pickupPose = clamp(
        Math.max(rider.pickupPose ?? 0, inContest && kokpar.contest.active && !mountedContest ? 1 : 0),
        0,
        1.2
      );
      const tugPose = inContest && mountedContest ? 1 : 0;
      const pullPose = clamp(Math.max(rider.pullPose ?? 0, tugPose * (0.72 + (rider.tugEffort ?? 0) * 0.32)), 0, 1.25);
      const throwPose = rider.throwPose ?? 0;
      const throwSide = rider.team === TEAM.blue ? -1 : 1;
      const throwAimLean = kokpar.throwCharging && kokpar.holder === rider
        ? clamp(kokpar.throwAimOffset / THROW_AIM_MAX_ANGLE, -1, 1)
        : 0;
      const posePower = inContest ? clamp(contestPowerForRider(rider), 0, 1.25) : 0;

      rider.group.position.set(rider.x, Math.max(0, bob), rider.z);
      rider.group.rotation.order = 'YXZ';
      rider.group.rotation.y = -rider.rotation;
      rider.group.rotation.x = 0;
      rider.group.rotation.z =
        (rider.lean ?? 0) +
        hitLean -
        bodyCheckPose * 0.09 +
        contactLean +
        turnPose * Math.sign(rider.lean || reachSide) * 0.08 +
        reachSide * pickupPose * 0.11 -
        reachSide * pullPose * 0.08;
      rider.group.scale.setScalar(scale);

      if (horseBody) {
        horseBody.position.y =
          (rider.group.userData.bodyBaseY ?? horseBody.position.y) +
          idleBreath * 0.025 +
          gallopBlend * Math.sin(gaitPhase * 2.05) * 0.055 -
          stopPose * 0.04;
        horseBody.rotation.x =
          (rider.group.userData.bodyBaseRotationX ?? 0) +
          gallopBlend * Math.sin(gaitPhase * 2.05 + 0.4) * 0.035 -
          stopPose * 0.055;
        horseBody.rotation.z =
          (rider.group.userData.bodyBaseRotationZ ?? horseBody.rotation.z) +
          turnPose * Math.sign(rider.lean || 1) * 0.045;
      }

      if (horseHead) {
        horseHead.position.y =
          (rider.group.userData.headBaseY ?? horseHead.position.y) +
          idleBreath * 0.035 +
          speedRatio * Math.sin(gaitPhase * 1.8 + 0.35) * 0.055 -
          stopPose * 0.04;
        horseHead.rotation.x =
          (rider.group.userData.headBaseRotationX ?? 0) -
          stopPose * 0.14 +
          speedRatio * Math.sin(gaitPhase * 1.4) * 0.055;
        horseHead.rotation.z =
          (rider.group.userData.headBaseRotationZ ?? 0) +
          turnPose * Math.sign(rider.lean || 1) * 0.08;
      }

      legs.forEach((leg) => {
        const phase = stride + leg.phase;
        const isFront = (leg.baseX ?? 0) > 0;
        const isLeft = (leg.baseZ ?? 0) > 0;
        const walkSwing = Math.sin(phase * 0.85) * clamp(speedRatio * 2.6, 0, 0.34);
        const trotSwing = Math.sin(phase * 1.08) * trotBlend * 0.36;
        const gallopSwing = Math.sin(phase * 1.38 + (isFront ? 0.35 : -0.2)) * gallopBlend * 0.58;
        const swing = walkSwing + trotSwing + gallopSwing;
        const lift =
          Math.max(0, Math.cos(phase)) * clamp(speedRatio * 1.1, 0, 0.44) +
          Math.max(0, Math.sin(phase * 1.38 + (isFront ? 0.5 : -0.4))) * gallopBlend * 0.2;
        const stopBrace = stopPose * (isFront ? -0.28 : 0.18);
        const turnBrace = turnPose * (isLeft ? -0.12 : 0.12);

        leg.mesh.rotation.z = leg.baseRotationZ + swing + stopBrace + turnBrace;
        leg.mesh.rotation.x =
          leg.baseRotationX +
          Math.sin(phase + 0.45) * (0.03 + speedRatio * 0.09) +
          gallopBlend * Math.sin(phase * 1.2) * 0.08;
        leg.mesh.position.y = leg.baseY + lift * 0.16 - stopPose * (isFront ? 0.04 : 0);

        if (leg.wrap) {
          leg.wrap.rotation.z = leg.mesh.rotation.z;
          leg.wrap.rotation.x = leg.mesh.rotation.x;
          leg.wrap.position.y = leg.baseWrapY + lift * 0.11 - stopPose * (isFront ? 0.025 : 0);
        }
      });

      if (tail) {
        tail.rotation.x =
          rider.group.userData.tailBaseRotationX +
          Math.sin(time * 2.6 + rider.aiPhase) * idleBlend * 0.035 +
          Math.sin(gaitPhase * 0.9) * speedRatio * 0.075 -
          stopPose * 0.04;
        tail.rotation.z = rider.group.userData.tailBaseRotationZ + speedRatio * 0.16 + turnPose * 0.08;
      }

      upperBody.forEach((part) => {
        const tugDirection =
          mountedContest && rider === kokpar.contest.challenger
            ? 1
            : mountedContest && rider === kokpar.contest.holder
              ? -0.45
              : 0;

        part.mesh.rotation.x =
          part.baseRotationX -
          pickupPose * (0.34 + posePower * 0.06) -
          pullPose * 0.12 -
          bodyCheckPose * 0.14 -
          bodyCheckRecoveryPose * 0.08 -
          throwPose * 0.1;
        part.mesh.rotation.z =
          part.baseRotationZ +
          reachSide * pickupPose * 0.1 +
          pullPose * tugDirection * 0.12 +
          bodyCheckPose * 0.08 +
          bodyCheckRecoveryPose * 0.06 +
          throwPose * (throwSide * 0.1 + throwAimLean * 0.08);
        part.mesh.position.y = part.baseY - pickupPose * 0.2 - pullPose * 0.03 + throwPose * 0.03;
      });

      arms.forEach((arm) => {
        const tugDirection =
          mountedContest && rider === kokpar.contest.challenger
            ? 1
            : mountedContest && rider === kokpar.contest.holder
            ? -0.35
            : 0;
        const isThrowingArm = arm.side === throwSide;
        const isReachArm = arm.side === reachSide;

        arm.mesh.rotation.z =
          arm.baseRotationZ +
          pickupPose * (isReachArm ? 0.78 + posePower * 0.18 : 0.22) +
          pullPose * (isReachArm ? 0.56 + posePower * 0.12 : 0.24) +
          bodyCheckPose * 0.24 +
          bodyCheckRecoveryPose * 0.12 +
          throwPose * (isThrowingArm ? 0.92 : 0.2);
        arm.mesh.rotation.x =
          arm.baseRotationX +
          arm.side * pickupPose * (isReachArm ? 0.52 : 0.18) +
          arm.side * pullPose * tugDirection * 0.42 +
          arm.side * bodyCheckPose * 0.18 +
          throwPose * (isThrowingArm ? -throwSide * 0.5 + throwAimLean * 0.16 : arm.side * 0.1);
        arm.mesh.position.y =
          arm.baseY -
          pickupPose * (isReachArm ? 0.28 : 0.08) -
          pullPose * 0.04 +
          throwPose * (isThrowingArm ? 0.18 : 0.02);
      });

      if (dust) {
        const dustPower = clamp(
          speedRatio * 0.82 +
            Math.abs(rider.lean ?? 0) * 1.35 +
            rider.hitFlash * 0.5 +
            bodyCheckPose * 0.35 +
            bodyCheckRecoveryPose * 0.12 +
            stopPose * 0.34 +
            turnPose * 0.24,
          0,
          1
        );
        dust.visible = dustPower > 0.12;
        dust.children.forEach((puff, index) => {
          const baseScale = puff.userData.baseScale ?? 1;
          const baseY = puff.userData.baseY ?? 0.2;
          const pulse = Math.sin(time * 7.2 + rider.aiPhase + index * 1.6) * 0.07;
          const spread = 0.68 + dustPower * 0.72 + index * 0.05 + pulse;

          puff.scale.x = baseScale * spread;
          puff.scale.z = baseScale * spread;
          puff.scale.y = baseScale * spread * 0.48;
          puff.position.y = baseY + dustPower * (0.18 + index * 0.06);
          puff.material.opacity = dustPower * clamp(0.38 - index * 0.04, 0.12, 0.38);
        });
      }

      if (rider.contestMarker) {
        const isLeader = kokpar.contest.leader === rider;

        rider.contestMarker.visible = inContest;
        if (inContest) {
          const pulse = Math.sin(time * 8.4 + rider.aiPhase) * 0.05;
          const power = contestPowerForRider(rider);
          const markerScale = (isLeader ? 1.16 : 0.98) + power * 0.12 + pulse;

          rider.contestMarker.position.set(rider.x, 0.16, rider.z);
          rider.contestMarker.userData.ring.scale.setScalar(markerScale);
          rider.contestMarker.userData.ring.material.opacity = isLeader ? 0.92 : 0.58;
          rider.contestMarker.userData.leaderDot.visible = isLeader;
          rider.contestMarker.userData.leaderDot.scale.setScalar(1 + Math.sin(time * 11) * 0.12);
        }
      }

      updateRiderRoleMarker(rider, riderRoleMarkerState(rider, inContest), time);

      if (rider.groundMarker) {
        rider.groundMarker.visible = true;
        rider.groundMarker.position.set(rider.x, 0, rider.z);
        const pulse = 0.88 + Math.sin(time * 4.5) * 0.08;
        rider.groundMarker.scale.setScalar(pulse);
        rider.groundMarker.userData.ring.material.opacity = 0.52 + Math.sin(time * 4.5) * 0.12;
        rider.groundMarker.userData.disc.material.opacity = 0.22 + Math.sin(time * 4.5 + 1) * 0.08;
      }

      if (rider.arrowMarker) {
        const bob = Math.sin(time * 3.2) * 0.18;
        rider.arrowMarker.visible = true;
        rider.arrowMarker.position.set(rider.x, 5.6 + bob, rider.z);
        rider.arrowMarker.quaternion.copy(camera.quaternion);
        const opacity = 0.82 + Math.sin(time * 3.2) * 0.12;
        rider.arrowMarker.userData.parts.forEach((m) => {
          m.material.opacity = opacity;
        });
      }
    });

    updateBodyCheckImpactMarker(time);

    const carriedHeight = kokpar.holder ? CARRIED_SERKE_HEIGHT + Math.sin(time * 8.5) * 0.06 : kokpar.y;
    kokpar.mesh.position.set(kokpar.x, carriedHeight, kokpar.z);
    kokpar.mesh.rotation.y += (1.2 + Math.hypot(kokpar.vx, kokpar.vz) * (kokpar.holder ? 0.06 : 0.12)) * dt;
    kokpar.mesh.rotation.x = kokpar.holder
      ? -0.2 + Math.sin(time * 6) * 0.08
      : kokpar.flightTeam
        ? kokpar.mesh.rotation.x + 0.12
        : 0;
    kokpar.mesh.rotation.z = kokpar.holder
      ? Math.sin(time * 7.5) * 0.16
      : kokpar.flightTeam
        ? kokpar.mesh.rotation.z + 0.18
        : 0;
    kokpar.mesh.scale.setScalar(kokpar.holder ? 1.1 : kokpar.flightTeam ? 1.06 : 1);

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

    const tugChallenger = mountedContest ? kokpar.contest.challenger : null;
    contestTugStrap.visible = Boolean(tugChallenger && kokpar.holder);
    if (contestTugStrap.visible) {
      const challengerForward = forwardVector(tugChallenger);
      const challengerSide = { x: -challengerForward.z, z: challengerForward.x };
      const tugSide = tugChallenger.team === TEAM.blue ? -1 : 1;

      tugStrapStart.set(
        tugChallenger.x + challengerForward.x * 0.3 + challengerSide.x * tugSide * 0.5,
        2.42,
        tugChallenger.z + challengerForward.z * 0.3 + challengerSide.z * tugSide * 0.5
      );
      tugStrapEnd.set(kokpar.x, carriedHeight, kokpar.z);
      tugStrapDirection.subVectors(tugStrapEnd, tugStrapStart);

      const tugLength = tugStrapDirection.length();
      if (tugLength > 0.001) {
        const holderSign = kokpar.contest.holder.team === TEAM.blue ? 1 : -1;
        const challengerAdvantage = clamp(-kokpar.contest.progress * holderSign, 0, 1);
        const effort = tugChallenger.tugEffort ?? 0;
        const tensionWidth = 1 + challengerAdvantage * 0.72 + effort * 0.5 + Math.sin(time * 13) * 0.04;

        contestTugStrap.position.copy(tugStrapStart).addScaledVector(tugStrapDirection, 0.5);
        contestTugStrap.scale.set(tensionWidth, tugLength, tensionWidth);
        contestTugStrap.quaternion.setFromUnitVectors(carryStrapAxis, tugStrapDirection.normalize());
        contestTugStrap.material.color.set(tugChallenger.team === TEAM.blue ? COLORS.blueAlt : COLORS.red);
        contestTugStrap.material.opacity = 0.58 + challengerAdvantage * 0.22 + effort * 0.15;
      }
    }

    if (mountedContest) {
      updateMountedTensionGuide(time);
    } else {
      mountedTensionGuide.visible = false;
    }

    contestIndicator.visible = kokpar.contest.active;
    if (kokpar.contest.active) {
      const progress = clamp(kokpar.contest.progress, -1, 1);
      const leaderColor = progress >= 0 ? COLORS.blue : COLORS.red;

      contestIndicator.position.set(kokpar.x, 2.5, kokpar.z);
      contestIndicator.scale.setScalar(1 + Math.sin(time * 7.5) * 0.04);
      contestIndicator.userData.marker.position.x = progress * 1.52;
      contestIndicator.userData.marker.material.color.set(leaderColor);
      contestIndicator.userData.ring.material.color.set(leaderColor);
      contestIndicator.userData.leaderBeam.material.color.set(leaderColor);
      contestIndicator.userData.leaderBeam.scale.setScalar(1 + Math.abs(progress) * 0.22);
      contestIndicator.rotation.y = 0;
    } else {
      riders.forEach((rider) => {
        if (rider.contestMarker) rider.contestMarker.visible = false;
      });
      contestIndicator.scale.setScalar(1);
    }

    updateThrowPreview(time);
  }


  function resize() {
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(rect.height, 1);
    camera.updateProjectionMatrix();
  }

  function onKeyDown(event) {
    feedback.prime();
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
    if (key === "r") restart();
    if (key === "c" && !event.repeat) {
      cycleCameraMode();
      keys.delete(key);
      return;
    }
    if (key === "e" && !event.repeat) {
      contactSystem.startBodyCheck(player);
      keys.delete(key);
      return;
    }
    if (key === " " && !event.repeat && kokpar.holder === player) {
      if (!canThrowAtTarget(player) && attemptPass(player)) {
        keys.delete(key);
        return;
      }
      if (startThrowCharge(player)) {
        keys.delete(key);
        return;
      }
    }
    if (key === " " && kokpar.throwCharging) {
      keys.delete(key);
      return;
    }
    keys.add(key);
  }

  function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (key === " " && releaseThrowCharge(player)) {
      keys.delete(key);
      return;
    }
    keys.delete(key);
  }

  function frame(now) {
    if (isDestroyed) return;
    readGamepad();

    const dt = clamp((now - lastFrameTime) / 1000, 0, 0.033);
    const time = now / 1000;
    lastFrameTime = now;

    if (!assetsLoaded) {
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(frame);
      return;
    }

    if (!match.over) {
      if (match.phase === "countdown") {
        if (!match.duelMode) {
          updateStartLaneMovement(dt, time);
          contactSystem.resolveRiderCollisions();
          riders.forEach(keepRiderInStartLane);
        }

        match.countdown -= dt;
        const countdownInt = Math.ceil(clamp(match.countdown, 0, ROUND_COUNTDOWN_SECONDS));
        if (countdownInt !== match.lastCountdownInt && countdownInt >= 1) {
          feedback.countdown(countdownInt);
          match.lastCountdownInt = countdownInt;
        }
        if (match.countdown <= 0) {
          startRound();
        }
      } else if (match.phase === "goal") {
        updateGoalCelebration(dt);
      } else {
        if (isTraining) {
          match.time += dt;
        } else {
          match.time -= dt;
          if (match.time <= 0) {
            match.time = 0;
            match.over = true;
            const winner = match.blue === match.red ? "Ничья" : match.blue > match.red ? "Синие победили" : "Красные победили";
            if (!match.finishEventSent) {
              match.finishEventSent = true;
              emitMatchEvent("match_finished", {
                winner,
                playerGoals: match.playerGoals,
                playerSteals: match.playerSteals
              });
            }
            showMessage(winner, "Можно начать новый матч.", 999);
          }
        }
        updateThrowCharge(dt);

        updateRiderMovement(dt, time);
        contactSystem.resolveRiderCollisions();
        updateKokpar(dt);
      }
    }

    match.messageTime = Math.max(0, match.messageTime - dt);
    syncMeshes(time, dt);
    updateMatchCommentary();
    updateStadiumPresentation();
    updateCamera(dt);
    renderer.render(scene, camera);
    publishHud();
    animationFrame = requestAnimationFrame(frame);
  }

  function buildNetworkState() {
    return {
      r: riders.map(r => [
        Math.round(r.x * 100) / 100,
        Math.round(r.z * 100) / 100,
        Math.round(r.vx * 100) / 100,
        Math.round(r.vz * 100) / 100,
        Math.round(r.rotation * 1000) / 1000
      ]),
      k: [
        Math.round(kokpar.x * 100) / 100,
        Math.round(kokpar.z * 100) / 100,
        Math.round(kokpar.y * 100) / 100,
        Math.round(kokpar.vx * 100) / 100,
        Math.round(kokpar.vz * 100) / 100,
        Math.round(kokpar.vy * 100) / 100,
        kokpar.holder ? riders.indexOf(kokpar.holder) : -1
      ],
      m: {
        b: match.blue,
        r: match.red,
        t: Math.round(match.time * 10) / 10,
        p: match.phase
      }
    };
  }

  function applyNetworkState(state) {
    if (!state) return;

    if (state.r) {
      state.r.forEach((rd, i) => {
        const rider = riders[i];
        if (!rider || rider === player) return;
        const dist = Math.hypot(rd[0] - rider.x, rd[1] - rider.z);
        const alpha = dist > 4 ? 1 : 0.35;
        rider.x += (rd[0] - rider.x) * alpha;
        rider.z += (rd[1] - rider.z) * alpha;
        rider.vx = rd[2];
        rider.vz = rd[3];
        rider.rotation = rd[4];
      });
    }

    if (state.k) {
      const [kx, kz, ky, kvx, kvz, kvy, holderIdx] = state.k;
      const kdist = Math.hypot(kx - kokpar.x, kz - kokpar.z);
      const ka = kdist > 3 ? 1 : 0.4;
      kokpar.x += (kx - kokpar.x) * ka;
      kokpar.z += (kz - kokpar.z) * ka;
      kokpar.y += (ky - kokpar.y) * ka;
      kokpar.vx = kvx;
      kokpar.vz = kvz;
      kokpar.vy = kvy;
      const nextHolder = holderIdx >= 0 && holderIdx < riders.length ? riders[holderIdx] : null;
      if (nextHolder !== kokpar.holder) {
        kokpar.holder = nextHolder;
        if (nextHolder === player) {
          player.pickupPose = Math.max(player.pickupPose ?? 0, 0.85);
        }
      }
    }

    if (state.m) {
      const prevBlue = match.blue;
      const prevRed = match.red;
      match.blue = state.m.b;
      match.red = state.m.r;
      match.time = state.m.t;
      if (state.m.p !== match.phase) {
        match.phase = state.m.p;
        if (state.m.p === "goal" && (prevBlue !== match.blue || prevRed !== match.red)) {
          showMessage(
            match.blue > match.red ? "Гол! Синие ведут" : match.red > match.blue ? "Гол! Красные ведут" : "Гол!",
            "Новый розыгрыш.", 2.4
          );
        }
      }
    }
  }

  function setRemoteRiderInput(input) {
    if (!input) return;
    remoteRiderInput.x = input.x ?? 0;
    remoteRiderInput.z = input.z ?? 0;
    remoteRiderInput.action = Boolean(input.action);
    remoteRiderInput.sprint = Boolean(input.sprint);
  }

  function getLocalPlayerInput() {
    let ax = touchInput.x ?? 0;
    let az = touchInput.z ?? 0;
    if (keys.has("arrowleft") || keys.has("a")) ax -= 1;
    if (keys.has("arrowright") || keys.has("d")) ax += 1;
    if (keys.has("arrowup") || keys.has("w")) az -= 1;
    if (keys.has("arrowdown") || keys.has("s")) az += 1;

    let dx = 0, dz = 0;
    const len = Math.hypot(ax, az);
    if (len > 0.05) {
      const fwd = _inputFwdVec;
      camera.getWorldDirection(fwd);
      const fl = Math.hypot(fwd.x, fwd.z) || 1;
      const fx = fwd.x / fl, fz = fwd.z / fl;
      dx = (-fz * ax - fx * az);
      dz = (fx * ax - fz * az);
      const dlen = Math.hypot(dx, dz) || 1;
      dx /= dlen;
      dz /= dlen;
    }

    return {
      x: Math.round(dx * 100) / 100,
      z: Math.round(dz * 100) / 100,
      action: keys.has(" ") || Boolean(touchInput.action)
    };
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);

  resize();
  updateStadiumPresentation();
  animationFrame = requestAnimationFrame(frame);

  return {
    assetsReadyPromise,
    restart,
    cycleCameraMode,
    setTouchInput,
    getNetworkState: buildNetworkState,
    applyNetworkState,
    setRemoteRiderInput,
    getLocalPlayerInput,
    setFeedbackEnabled(enabled) {
      feedback.setEnabled(enabled);
    },
    destroy() {
      isDestroyed = true;
      resetTouchInput();
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      feedback.destroy();
      disposeObject3D(scene);
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
  };
}
