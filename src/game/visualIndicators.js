import * as THREE from "three";

export function createContestRiderMarker(color) {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const leaderMaterial = new THREE.MeshBasicMaterial({
    color: "#f7e7b8",
    transparent: true,
    opacity: 0.86,
    depthWrite: false
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 8, 52), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const leaderDot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20), leaderMaterial);
  leaderDot.position.y = 0.08;
  group.add(leaderDot);

  group.visible = false;
  group.userData.ring = ring;
  group.userData.leaderDot = leaderDot;
  return group;
}

export function createRiderRoleMarker() {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: "#f0c347",
    transparent: true,
    opacity: 0.78,
    depthTest: false,
    depthWrite: false
  });
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: "#f7e7b8",
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false
  });
  const pointerMaterial = new THREE.MeshBasicMaterial({
    color: "#24170f",
    transparent: true,
    opacity: 0.72,
    depthTest: false,
    depthWrite: false
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 28), ringMaterial);
  group.add(ring);

  const core = new THREE.Mesh(new THREE.CircleGeometry(0.23, 24), coreMaterial);
  core.position.z = 0.01;
  group.add(core);

  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 3), pointerMaterial);
  pointer.position.set(0, -0.42, 0.02);
  pointer.rotation.z = Math.PI;
  group.add(pointer);

  group.visible = false;
  group.renderOrder = 10;
  group.userData.ring = ring;
  group.userData.core = core;
  group.userData.pointer = pointer;
  return group;
}

export function createMountedTensionGuide() {
  const group = new THREE.Group();
  const shaftMaterial = new THREE.MeshBasicMaterial({
    color: "#f0c347",
    transparent: true,
    opacity: 0.78,
    depthWrite: false
  });
  const headMaterial = shaftMaterial.clone();

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 10), shaftMaterial);
  group.add(shaft);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.48, 12), headMaterial);
  group.add(head);

  group.visible = false;
  group.userData.shaft = shaft;
  group.userData.head = head;
  return group;
}
