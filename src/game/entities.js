import * as THREE from "three";
import { COLORS, GOAL_RADIUS } from "./constants.js";

export function createRider(config) {
  return {
    ...config,
    vx: 0,
    vz: 0,
    rotation: 0,
    stamina: 1,
    grabCooldown: 0,
    bumpCooldown: 0,
    aiPhase: Math.random() * Math.PI * 2,
    maxSpeed: config.human ? 25 : 22,
    acceleration: config.human ? 82 : 64,
    group: null
  };
}

export function createHorseMesh(color) {
  const group = new THREE.Group();
  const horseMaterial = new THREE.MeshStandardMaterial({ color: COLORS.horse, roughness: 0.78 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: COLORS.horseDark, roughness: 0.82 });
  const riderMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.58 });
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

  for (const x of [-1.15, 0.95]) {
    for (const z of [-0.48, 0.48]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.25, 10), darkMaterial);
      leg.position.set(x, 0.45, z);
      leg.rotation.z = (x > 0 ? -0.12 : 0.1) + z * 0.05;
      group.add(leg);
    }
  }

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.72, 8, 16), riderMaterial);
  torso.position.set(-0.12, 2.22, 0);
  group.add(torso);

  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMaterial);
  riderHead.position.set(0.1, 2.92, 0);
  group.add(riderHead);

  const rein = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.035, 0.035), darkMaterial);
  rein.position.set(1.1, 2.02, 0);
  rein.rotation.z = -0.24;
  group.add(rein);

  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
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
