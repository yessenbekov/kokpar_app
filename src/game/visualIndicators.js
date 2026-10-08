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

export function createPlayerGroundMarker() {
  const group = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    color: "#ff2020",
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const discMat = new THREE.MeshBasicMaterial({
    color: "#ff3030",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 40), ringMat.clone());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 40), discMat.clone());
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.04;
  group.add(disc);

  group.visible = false;
  group.renderOrder = 1;
  group.userData.ring = ring;
  group.userData.disc = disc;
  return group;
}

export function createPlayerArrowMarker() {
  const group = new THREE.Group();

  const mat = new THREE.MeshBasicMaterial({
    color: "#3dff6e",
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false
  });

  // Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.52, 10), mat.clone());
  shaft.position.y = 0.26;
  group.add(shaft);

  // Arrowhead pointing down
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 12), mat.clone());
  head.rotation.z = Math.PI;
  head.position.y = -0.05;
  group.add(head);

  group.visible = false;
  group.renderOrder = 15;
  group.userData.parts = [shaft, head];
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

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createSerkeHighlight() {
  const group = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    color: "#39ff14",
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const discMat = new THREE.MeshBasicMaterial({
    color: "#39ff14",
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.5, 52), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 52), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  group.add(disc);

  // Floating label sprite
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 72;
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(5.5, 1.25, 1);
  sprite.position.y = 5.2;
  group.add(sprite);

  group.visible = false;
  group.renderOrder = 2;
  group.userData.ring = ring;
  group.userData.disc = disc;
  group.userData.sprite = sprite;
  group.userData.canvas = canvas;
  group.userData.texture = texture;
  group.userData.lastDist = -1;
  return group;
}

export function updateSerkeLabel(highlight, distanceM) {
  const rounded = Math.round(distanceM);
  if (rounded === highlight.userData.lastDist) return;
  highlight.userData.lastDist = rounded;

  const canvas = highlight.userData.canvas;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background pill
  ctx.fillStyle = "rgba(18, 10, 3, 0.90)";
  roundedRect(ctx, 8, 6, w - 16, h - 12, (h - 12) / 2);
  ctx.fill();

  // Thin gold border
  ctx.strokeStyle = "rgba(240,195,71,0.45)";
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 8, 6, w - 16, h - 12, (h - 12) / 2);
  ctx.stroke();

  // Diamond
  ctx.fillStyle = "#f0c347";
  ctx.font = "bold 24px sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("◆", 26, h / 2);

  // Label text
  ctx.fillStyle = "#f7ecd0";
  ctx.font = "bold 22px Oswald, Arial, sans-serif";
  ctx.fillText(`СЕРКЕ  ${rounded} М`, 60, h / 2);

  highlight.userData.texture.needsUpdate = true;
}

export function createBodyCheckImpactMarker() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: "#f0c347",
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.07, 8, 28), material);
  group.add(ring);

  const slashA = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.065, 0.035), material.clone());
  slashA.rotation.z = Math.PI * 0.22;
  group.add(slashA);

  const slashB = slashA.clone();
  slashB.material = material.clone();
  slashB.rotation.z = -Math.PI * 0.22;
  group.add(slashB);

  group.visible = false;
  group.renderOrder = 12;
  group.userData.ring = ring;
  group.userData.slashes = [slashA, slashB];
  return group;
}
