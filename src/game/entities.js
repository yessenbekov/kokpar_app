import * as THREE from "three";
import { COLORS, GOAL_RADIUS, TEAM } from "./constants.js";

export function createRider(config) {
  return {
    ...config,
    vx: 0,
    vz: 0,
    rotation: 0,
    stamina: 1,
    grabCooldown: 0,
    bumpCooldown: 0,
    staggerTime: 0,
    hitFlash: 0,
    lean: 0,
    aiRole: "idle",
    aiPhase: Math.random() * Math.PI * 2,
    maxSpeed: config.human ? 19.5 : 18,
    acceleration: config.human ? 27 : 24,
    brakePower: config.human ? 39 : 34,
    turnRate: config.human ? 3.2 : 2.65,
    lateralGrip: config.human ? 7.4 : 6.2,
    group: null
  };
}

function horsePaletteFor(team) {
  if (team === TEAM.red) {
    return {
      coat: "#4f2b1a",
      dark: "#1d120d",
      muzzle: "#7a4a2e",
      marking: "#2a1810"
    };
  }

  return {
    coat: "#8a5c35",
    dark: "#2d1b13",
    muzzle: "#b87a45",
    marking: "#ead7bd"
  };
}

export function createHorseMesh(color, team) {
  const group = new THREE.Group();
  const horsePalette = horsePaletteFor(team);
  const horseMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.coat, roughness: 0.78 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.dark, roughness: 0.82 });
  const muzzleMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.muzzle, roughness: 0.84 });
  const markingMaterial = new THREE.MeshStandardMaterial({ color: horsePalette.marking, roughness: 0.86 });
  const riderMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.58 });
  const uniformMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const tackMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.48 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#f2dfb2", roughness: 0.68 });
  const dustMaterial = new THREE.MeshStandardMaterial({
    color: "#e4c681",
    transparent: true,
    opacity: 0.34,
    roughness: 1,
    depthWrite: false
  });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: "#e4b482", roughness: 0.62 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 14), horseMaterial);
  body.scale.set(1.6, 0.52, 0.7);
  body.position.y = 1.2;
  body.rotation.z = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 12), darkMaterial);
  head.scale.set(1.15, 0.78, 0.85);
  head.position.set(2.55, 1.45, -0.05);
  group.add(head);

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
    }
  }

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

  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.58), trimMaterial);
  chestStripe.position.set(0.04, 2.35, 0);
  chestStripe.rotation.z = -0.1;
  group.add(chestStripe);

  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMaterial);
  riderHead.position.set(0.1, 3.03, 0);
  group.add(riderHead);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), uniformMaterial);
  helmet.position.set(0.1, 3.18, 0);
  group.add(helmet);

  const helmetBrim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.5), darkMaterial);
  helmetBrim.position.set(0.35, 3.14, 0);
  helmetBrim.rotation.z = -0.06;
  group.add(helmetBrim);

  for (const z of [-0.34, 0.34]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.78, 10), riderMaterial);
    arm.position.set(0.25, 2.38, z);
    arm.rotation.z = Math.PI / 2.6;
    arm.rotation.x = z > 0 ? 0.38 : -0.38;
    group.add(arm);

    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.78, 10), darkMaterial);
    boot.position.set(-0.28, 1.75, z * 1.18);
    boot.rotation.z = -0.1;
    group.add(boot);
  }

  const dust = new THREE.Group();
  for (const [x, z, scale] of [
    [-2.3, -0.55, 1.4],
    [-2.75, 0.12, 1.1],
    [-2.1, 0.58, 0.9]
  ]) {
    const puff = new THREE.Mesh(new THREE.CircleGeometry(0.72 * scale, 18), dustMaterial);
    puff.position.set(x, 0.04, z);
    puff.rotation.x = -Math.PI / 2;
    dust.add(puff);
  }
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

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.045, 8, 44), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const barBack = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 0.2), backMaterial);
  barBack.position.set(0, 0.02, -1.55);
  group.add(barBack);

  const blueEnd = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 0.22), blueMaterial);
  blueEnd.position.set(-0.66, 0.07, -1.55);
  group.add(blueEnd);

  const redEnd = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 0.22), redMaterial);
  redEnd.position.set(0.66, 0.07, -1.55);
  group.add(redEnd);

  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.38), markerMaterial);
  marker.position.set(0, 0.18, -1.55);
  group.add(marker);

  group.visible = false;
  group.userData.ring = ring;
  group.userData.marker = marker;
  return group;
}

export function createGoalMesh(color) {
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

export function disposeObject3D(object) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose();

    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material.dispose());
    } else {
      node.material?.dispose();
    }
  });
}
