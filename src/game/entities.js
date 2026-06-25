import * as THREE from "three";
import { COLORS, GOAL_RADIUS, TEAM } from "./constants.js";
import { DEFAULT_HORSE_TYPE_ID, horseTypeById } from "./horseTypes.js";

export function createRider(config) {
  const horseType = horseTypeById(config.horseType);
  const stats = horseType.stats;
  const baseMaxSpeed = config.human ? 19.5 : 18;
  const baseAcceleration = config.human ? 27 : 24;
  const baseBrakePower = config.human ? 44 : 38;
  const baseTurnRate = config.human ? 4.15 : 3.25;
  const baseLateralGrip = config.human ? 9.2 : 7.4;

  return {
    ...config,
    horseType: horseType.id,
    horseName: config.horseName ?? horseType.name,
    vx: 0,
    vz: 0,
    rotation: 0,
    stamina: 1,
    grabCooldown: 0,
    throwCooldown: 0,
    bumpCooldown: 0,
    bodyCheckWindup: 0,
    bodyCheckTime: 0,
    bodyCheckCooldown: 0,
    bodyCheckRecovery: 0,
    impactReactionTime: 0,
    impactLean: 0,
    protectionCooldown: 0,
    staggerTime: 0,
    hitFlash: 0,
    lean: 0,
    gaitPhase: Math.random() * Math.PI * 2,
    lastSpeed: 0,
    stopPose: 0,
    turnPose: 0,
    pickupPose: 0,
    pullPose: 0,
    throwPose: 0,
    tugEffort: 0,
    aiRole: "idle",
    aiPhase: Math.random() * Math.PI * 2,
    maxSpeed: baseMaxSpeed * stats.speed,
    acceleration: baseAcceleration * stats.acceleration,
    brakePower: baseBrakePower * stats.brake,
    turnRate: baseTurnRate * stats.turn,
    lateralGrip: baseLateralGrip * stats.grip,
    staminaDrainMultiplier: stats.staminaDrain,
    staminaRecoveryMultiplier: stats.staminaRecovery,
    carrySpeedMultiplier: stats.carrySpeed,
    contestPowerMultiplier: stats.contestPower,
    tacklePowerMultiplier: stats.tacklePower,
    stabilityMultiplier: stats.stability,
    bodyCheckPowerMultiplier: stats.bodyCheckPower,
    bodyCheckLungeMultiplier: stats.bodyCheckLunge,
    group: null
  };
}

function horsePaletteFor(team, horseTypeId = DEFAULT_HORSE_TYPE_ID) {
  const horseType = horseTypeById(horseTypeId);
  return horseType.palette[team === TEAM.red ? "red" : "blue"];
}

export function createHorseMesh(color, team, horseTypeId) {
  const group = new THREE.Group();
  const legs = [];
  const arms = [];
  const upperBody = [];
  const horsePalette = horsePaletteFor(team, horseTypeId);
  const horseMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.coat, roughness: 0.78 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.dark, roughness: 0.82 });
  const muzzleMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.muzzle, roughness: 0.84 });
  const markingMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.marking, roughness: 0.86 });
  const riderMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.58 });
  const uniformMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const tackMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.48 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#f2dfb2", roughness: 0.68 });
  const dustMaterial = new THREE.MeshStandardMaterial({
    color: "#c8a050",
    transparent: true,
    opacity: 0.32,
    roughness: 1,
    depthWrite: false
  });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: "#e4b482", roughness: 0.62 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 14), horseMaterial);
  body.scale.set(1.6, 0.52, 0.7);
  body.position.y = 1.2;
  body.rotation.z = Math.PI / 2;
  group.add(body);
  group.userData.body = body;
  group.userData.bodyBaseY = body.position.y;
  group.userData.bodyBaseRotationX = body.rotation.x;
  group.userData.bodyBaseRotationZ = body.rotation.z;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 12), darkMaterial);
  head.scale.set(1.15, 0.78, 0.85);
  head.position.set(2.55, 1.45, -0.05);
  group.add(head);
  group.userData.head = head;
  group.userData.headBaseY = head.position.y;
  group.userData.headBaseRotationX = head.rotation.x;
  group.userData.headBaseRotationZ = head.rotation.z;

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), muzzleMaterial);
  muzzle.scale.set(1.15, 0.7, 0.8);
  muzzle.position.set(3.08, 1.35, -0.05);
  group.add(muzzle);

  const faceMark = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.56, 0.08), markingMaterial);
  faceMark.position.set(2.94, 1.66, -0.05);
  faceMark.rotation.z = -0.24;
  group.add(faceMark);

  const mane = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 0.14), darkMaterial);
  mane.position.set(1.45, 1.92, 0);
  mane.rotation.z = -0.36;
  group.add(mane);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.18, 1.25, 10), darkMaterial);
  tail.position.set(-2.55, 1.1, 0);
  tail.rotation.z = 1.18;
  tail.rotation.x = 0.18;
  group.add(tail);
  group.userData.tail = tail;
  group.userData.tailBaseRotationX = tail.rotation.x;
  group.userData.tailBaseRotationZ = tail.rotation.z;

  for (const x of [-1.15, 0.95]) {
    for (const z of [-0.48, 0.48]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.25, 10), darkMaterial);
      leg.position.set(x, 0.45, z);
      leg.rotation.z = (x > 0 ? -0.12 : 0.1) + z * 0.05;
      group.add(leg);

      const legWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.18, 10), uniformMaterial);
      legWrap.position.set(x, 0.78, z);
      legWrap.rotation.z = leg.rotation.z;
      group.add(legWrap);

      legs.push({
        mesh: leg,
        wrap: legWrap,
        baseX: x,
        baseZ: z,
        baseY: leg.position.y,
        baseWrapY: legWrap.position.y,
        baseRotationX: leg.rotation.x,
        baseRotationZ: leg.rotation.z,
        phase: (x > 0) === (z > 0) ? 0 : Math.PI
      });
    }
  }
  group.userData.legs = legs;

  const saddleBlanket = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.28), uniformMaterial);
  saddleBlanket.position.set(-0.2, 2.02, 0);
  saddleBlanket.rotation.z = -0.02;
  group.add(saddleBlanket);

  const blanketTrim = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.08, 1.42), trimMaterial);
  blanketTrim.position.set(-0.2, 1.94, 0);
  blanketTrim.rotation.z = -0.02;
  group.add(blanketTrim);

  const saddlePad = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.18, 0.92), tackMaterial);
  saddlePad.position.set(-0.22, 2.16, 0);
  saddlePad.rotation.z = -0.02;
  group.add(saddlePad);

  const jerseyBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.78), uniformMaterial);
  jerseyBack.position.set(-0.16, 2.82, 0);
  jerseyBack.rotation.z = -0.08;
  group.add(jerseyBack);

  const girth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 1.52), tackMaterial);
  girth.position.set(-0.05, 1.18, 0);
  girth.rotation.z = -0.02;
  group.add(girth);

  for (const z of [-0.73, 0.73]) {
    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.08), uniformMaterial);
    sidePanel.position.set(-0.28, 1.36, z);
    sidePanel.rotation.z = -0.04;
    group.add(sidePanel);
  }

  const bridle = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 8, 24), tackMaterial);
  bridle.position.set(2.58, 1.45, -0.03);
  bridle.rotation.y = Math.PI / 2;
  group.add(bridle);

  for (const z of [-0.22, 0.22]) {
    const rein = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.045, 0.035), tackMaterial);
    rein.position.set(1.32, 1.95, z);
    rein.rotation.z = -0.25;
    group.add(rein);
  }

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.92, 8, 16), riderMaterial);
  torso.position.set(-0.12, 2.3, 0);
  group.add(torso);
  upperBody.push({
    mesh: torso,
    baseRotationX: torso.rotation.x,
    baseRotationZ: torso.rotation.z,
    baseY: torso.position.y
  });

  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.58), trimMaterial);
  chestStripe.position.set(0.04, 2.35, 0);
  chestStripe.rotation.z = -0.1;
  group.add(chestStripe);
  upperBody.push({
    mesh: chestStripe,
    baseRotationX: chestStripe.rotation.x,
    baseRotationZ: chestStripe.rotation.z,
    baseY: chestStripe.position.y
  });

  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMaterial);
  riderHead.position.set(0.1, 3.03, 0);
  group.add(riderHead);
  upperBody.push({
    mesh: riderHead,
    baseRotationX: riderHead.rotation.x,
    baseRotationZ: riderHead.rotation.z,
    baseY: riderHead.position.y
  });

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), uniformMaterial);
  helmet.position.set(0.1, 3.18, 0);
  group.add(helmet);
  upperBody.push({
    mesh: helmet,
    baseRotationX: helmet.rotation.x,
    baseRotationZ: helmet.rotation.z,
    baseY: helmet.position.y
  });

  const helmetBrim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.5), darkMaterial);
  helmetBrim.position.set(0.35, 3.14, 0);
  helmetBrim.rotation.z = -0.06;
  group.add(helmetBrim);
  upperBody.push({
    mesh: helmetBrim,
    baseRotationX: helmetBrim.rotation.x,
    baseRotationZ: helmetBrim.rotation.z,
    baseY: helmetBrim.position.y
  });

  for (const z of [-0.34, 0.34]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.78, 10), riderMaterial);
    arm.position.set(0.25, 2.38, z);
    arm.rotation.z = Math.PI / 2.6;
    arm.rotation.x = z > 0 ? 0.38 : -0.38;
    group.add(arm);
    arms.push({
      mesh: arm,
      side: Math.sign(z),
      baseRotationX: arm.rotation.x,
      baseRotationZ: arm.rotation.z,
      baseY: arm.position.y
    });

    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.78, 10), darkMaterial);
    boot.position.set(-0.28, 1.75, z * 1.18);
    boot.rotation.z = -0.1;
    group.add(boot);
  }
  group.userData.arms = arms;
  group.userData.upperBody = upperBody;

  const dust = new THREE.Group();
  for (const [x, z, scale, baseY] of [
    [-2.3, -0.55, 1.4, 0.38],
    [-2.75, 0.12, 1.1, 0.28],
    [-2.1, 0.58, 0.9, 0.22],
    [-1.5, -0.78, 0.72, 0.18],
    [-1.45, 0.78, 0.72, 0.18],
    [-3.2, -0.22, 0.85, 0.32],
    [-1.1, 0.1, 0.6, 0.12]
  ]) {
    const puffMaterial = dustMaterial.clone();
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.68 * scale, 8, 5), puffMaterial);
    puff.position.set(x, baseY, z);
    puff.scale.y = 0.45;
    puff.userData.baseScale = scale;
    puff.userData.baseY = baseY;
    dust.add(puff);
  }
  dust.visible = false;
  group.add(dust);
  group.userData.dust = dust;

  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = !node.material?.transparent;
      node.receiveShadow = true;
    }
  });

  return group;
}

export function createKokparMesh() {
  const group = new THREE.Group();
  const hideMaterial = new THREE.MeshStandardMaterial({ color: "#e5c99a", roughness: 0.95 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#2b1a12", roughness: 0.9 });
  const strapMaterial = new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.72 });
  const markerMaterial = new THREE.MeshStandardMaterial({ color: "#f4ead2", roughness: 0.86 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.86, 24, 14), hideMaterial);
  body.scale.set(1.55, 0.5, 0.78);
  body.rotation.z = -0.35;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 10), darkMaterial);
  head.scale.set(1.2, 0.8, 0.8);
  head.position.set(1.22, 0.04, -0.04);
  group.add(head);

  const bellyPatch = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 10), markerMaterial);
  bellyPatch.scale.set(1.45, 0.16, 0.68);
  bellyPatch.position.set(-0.08, 0.34, 0);
  group.add(bellyPatch);

  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 28), strapMaterial);
  strap.position.set(0.12, 0.02, 0);
  strap.rotation.y = Math.PI / 2;
  group.add(strap);

  for (const x of [-0.58, 0.52]) {
    for (const z of [-0.34, 0.34]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.48, 8), darkMaterial);
      leg.position.set(x, -0.35, z);
      leg.rotation.z = x > 0 ? -0.58 : 0.58;
      leg.rotation.x = z > 0 ? 0.28 : -0.28;
      group.add(leg);
    }
  }

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.82, 8), darkMaterial);
  tail.position.set(-1.2, -0.06, 0.15);
  tail.rotation.z = 1.25;
  group.add(tail);

  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.09), strapMaterial);
  ribbon.position.set(-0.28, -0.48, 0.42);
  ribbon.rotation.x = -0.22;
  group.add(ribbon);

  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  return group;
}

export function createContestIndicatorMesh() {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#f4ead2", transparent: true, opacity: 0.92 });
  const backMaterial = new THREE.MeshBasicMaterial({ color: "#24170f", transparent: true, opacity: 0.72 });
  const blueMaterial = new THREE.MeshBasicMaterial({ color: COLORS.blue });
  const redMaterial = new THREE.MeshBasicMaterial({ color: COLORS.red });
  const markerMaterial = new THREE.MeshBasicMaterial({ color: "#f4ead2" });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.055, 8, 56), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const barBack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.22), backMaterial);
  barBack.position.set(0, 0.02, -1.92);
  group.add(barBack);

  const blueEnd = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.09, 0.24), blueMaterial);
  blueEnd.position.set(-0.86, 0.07, -1.92);
  group.add(blueEnd);

  const redEnd = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.09, 0.24), redMaterial);
  redEnd.position.set(0.86, 0.07, -1.92);
  group.add(redEnd);

  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.38), markerMaterial);
  marker.position.set(0, 0.18, -1.92);
  group.add(marker);

  const leaderBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 1.1, 12), markerMaterial.clone());
  leaderBeam.position.set(0, 0.9, 0);
  group.add(leaderBeam);

  group.visible = false;
  group.userData.ring = ring;
  group.userData.marker = marker;
  group.userData.leaderBeam = leaderBeam;
  return group;
}

function createGroundGoalMesh(color) {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: "#f6e6bd",
    roughness: 0.8,
    transparent: true,
    opacity: 0.75
  });

  const disk = new THREE.Mesh(new THREE.CylinderGeometry(GOAL_RADIUS, GOAL_RADIUS, 0.12, 48), baseMaterial);
  disk.position.y = 0.04;
  disk.receiveShadow = true;
  group.add(disk);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(GOAL_RADIUS, 0.22, 12, 56), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.22;
  group.add(ring);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), ringMaterial);
    post.position.set(Math.cos(angle) * GOAL_RADIUS, 0.65, Math.sin(angle) * GOAL_RADIUS);
    group.add(post);
  }

  return group;
}

function createKazanGoalMesh(color) {
  const group = new THREE.Group();

  const ironMat   = new THREE.MeshStandardMaterial({ color: "#1c1c20", roughness: 0.78, metalness: 0.58 });
  const accentMat = new THREE.MeshStandardMaterial({ color, roughness: 0.50, metalness: 0.22 });

  // Polygonal segments give the faceted look from the image
  const POLY = 10;

  const BASE_R_BOT = GOAL_RADIUS * 0.90;  // wide foot
  const BASE_R_TOP = GOAL_RADIUS * 0.74;  // top of base (matches bowl outer edge)
  const BASE_H     = 1.4;

  // Torus bowl: ring center radius + tube radius
  // outer edge = BOWL_R + BOWL_TUBE, inner hole = BOWL_R - BOWL_TUBE
  const BOWL_R    = GOAL_RADIUS * 0.54;
  const BOWL_TUBE = GOAL_RADIUS * 0.22;
  // Flatten the torus in world-Y: after rotation.x=PI/2, local-Z maps to world-Y
  const BOWL_FLAT = 0.52;
  const BOWL_HALF_H = BOWL_TUBE * BOWL_FLAT;
  const BOWL_Y    = BASE_H + BOWL_HALF_H;

  // Thin flat disc at ground level
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_R_BOT, BASE_R_BOT, 0.12, POLY),
    ironMat
  );
  disc.position.y = 0.06;
  disc.receiveShadow = true;
  group.add(disc);

  // Trapezoidal base (wide at bottom, narrower at top)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_R_TOP, BASE_R_BOT, BASE_H, POLY),
    ironMat
  );
  base.position.y = BASE_H / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Torus bowl flattened in Y (scale.z compresses world-Y after rotation.x=PI/2)
  const bowl = new THREE.Mesh(
    new THREE.TorusGeometry(BOWL_R, BOWL_TUBE, 24, 64),
    ironMat
  );
  bowl.rotation.x = Math.PI / 2;
  bowl.scale.z = BOWL_FLAT;
  bowl.position.y = BOWL_Y;
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  group.add(bowl);

  // Team-colour accent band around the outer rim of the bowl
  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(BOWL_R + BOWL_TUBE * 0.70, 0.20, 8, 64),
    accentMat
  );
  accent.name = "kazan_team_rim";
  accent.rotation.x = Math.PI / 2;
  accent.position.y = BOWL_Y + BOWL_HALF_H * 0.35;
  accent.castShadow = true;
  group.add(accent);

  return group;
}

export function createGoalMesh(color, goalType = "circle", kazanGlb = null) {
  if (goalType === "kazan" && kazanGlb) return kazanGlb;
  return goalType === "kazan" ? createKazanGoalMesh(color) : createGroundGoalMesh(color);
}

export function disposeObject3D(object) {
  object.traverse((node) => {
    if (!node.isMesh && !node.isLine) return;
    node.geometry?.dispose();

    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material.dispose());
    } else {
      node.material?.dispose();
    }
  });
}
