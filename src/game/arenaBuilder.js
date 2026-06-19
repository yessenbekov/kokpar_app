import * as THREE from "three";
import { COLORS, WORLD } from "./constants.js";

const KOKPAR_START = { x: 0, z: -14.5 };
const CENTER_MARK = { x: 0, z: 0 };
const CENTER_CIRCLE_RADIUS = 8.5;
const START_LINE_Z = WORLD.height / 2;
const START_LANE_DEPTH = 17;
const RIDER_FIELD_EXIT_BUFFER = 10;

export function createGroundDetails(scene) {
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

export function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  draw(context, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return { canvas, context, texture, draw };
}

export function createKazakhstanFlagTexture() {
  return createCanvasTexture(768, 384, (context, width, height) => {
    context.fillStyle = "#00a9c7";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#f2c84b";
    context.strokeStyle = "#f2c84b";
    context.lineWidth = 8;

    const ornamentX = width * 0.12;
    context.lineWidth = 6;
    for (let i = 0; i < 5; i += 1) {
      const y = height * 0.12 + i * height * 0.18;
      context.beginPath();
      context.moveTo(ornamentX - 28, y + 24);
      context.quadraticCurveTo(ornamentX + 22, y - 16, ornamentX + 52, y + 26);
      context.quadraticCurveTo(ornamentX + 18, y + 10, ornamentX - 4, y + 58);
      context.stroke();
    }

    const sunX = width * 0.54;
    const sunY = height * 0.38;
    const sunRadius = height * 0.075;
    for (let i = 0; i < 28; i += 1) {
      const angle = (i / 28) * Math.PI * 2;
      context.beginPath();
      context.moveTo(sunX + Math.cos(angle) * (sunRadius + 8), sunY + Math.sin(angle) * (sunRadius + 8));
      context.lineTo(sunX + Math.cos(angle) * (sunRadius + 28), sunY + Math.sin(angle) * (sunRadius + 28));
      context.stroke();
    }
    context.beginPath();
    context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.moveTo(sunX - 92, height * 0.67);
    context.quadraticCurveTo(sunX - 46, height * 0.55, sunX - 10, height * 0.66);
    context.quadraticCurveTo(sunX - 54, height * 0.71, sunX - 112, height * 0.72);
    context.quadraticCurveTo(sunX - 84, height * 0.69, sunX - 92, height * 0.67);
    context.fill();

    context.beginPath();
    context.moveTo(sunX + 92, height * 0.67);
    context.quadraticCurveTo(sunX + 46, height * 0.55, sunX + 10, height * 0.66);
    context.quadraticCurveTo(sunX + 54, height * 0.71, sunX + 112, height * 0.72);
    context.quadraticCurveTo(sunX + 84, height * 0.69, sunX + 92, height * 0.67);
    context.fill();

    context.beginPath();
    context.moveTo(sunX - 16, height * 0.67);
    context.quadraticCurveTo(sunX, height * 0.75, sunX + 16, height * 0.67);
    context.quadraticCurveTo(sunX, height * 0.7, sunX - 16, height * 0.67);
    context.fill();
  }).texture;
}

export function createStadiumScoreboardMesh() {
  const board = createCanvasTexture(1024, 384, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#18212a";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#223343";
    context.fillRect(20, 20, width - 40, height - 40);

    context.fillStyle = "#f4d66a";
    context.font = "700 54px Arial";
    context.textAlign = "center";
    context.fillText("KOKPAR 3D", width / 2, 82);

    context.font = "700 104px Arial";
    context.fillStyle = COLORS.blue;
    context.fillText("0", width * 0.28, 232);
    context.fillStyle = COLORS.red;
    context.fillText("0", width * 0.72, 232);

    context.fillStyle = "#f7e7b8";
    context.font = "700 42px Arial";
    context.fillText("00:00", width / 2, 216);
    context.font = "700 26px Arial";
    context.fillText("START", width / 2, 278);
  });

  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(26.6, 9.7, 0.55),
    new THREE.MeshStandardMaterial({ color: "#2f2419", roughness: 0.78 })
  );
  frame.position.z = -0.12;
  frame.castShadow = true;
  group.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(24.8, 8.25),
    new THREE.MeshBasicMaterial({ map: board.texture, side: THREE.DoubleSide })
  );
  screen.position.z = 0.19;
  group.add(screen);

  const legsMaterial = new THREE.MeshStandardMaterial({ color: "#3d2819", roughness: 0.82 });
  for (const x of [-9.8, 9.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 8.8, 0.55), legsMaterial);
    leg.position.set(x, -8.5, -0.2);
    leg.castShadow = true;
    group.add(leg);
  }

  let lastKey = "";
  function update({ blue, red, timer, status }) {
    const key = `${blue}|${red}|${timer}|${status}`;
    if (key === lastKey) return;
    lastKey = key;

    const { context, canvas, texture } = board;
    const width = canvas.width;
    const height = canvas.height;

    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#14202b");
    gradient.addColorStop(1, "#243446");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "#f2c84b";
    context.lineWidth = 10;
    context.strokeRect(18, 18, width - 36, height - 36);

    context.fillStyle = "#f7e7b8";
    context.font = "700 42px Arial";
    context.textAlign = "center";
    context.fillText("KOKPAR 3D", width / 2, 76);

    context.fillStyle = "rgba(247,231,184,0.16)";
    context.fillRect(width * 0.39, 118, width * 0.22, 116);

    context.font = "700 44px Arial";
    context.fillStyle = COLORS.blue;
    context.fillText("BLUE", width * 0.23, 132);
    context.fillStyle = COLORS.red;
    context.fillText("RED", width * 0.77, 132);

    context.font = "700 132px Arial";
    context.fillStyle = "#e6f4ff";
    context.fillText(String(blue), width * 0.23, 260);
    context.fillStyle = "#ffe4dc";
    context.fillText(String(red), width * 0.77, 260);

    context.fillStyle = "#f2c84b";
    context.font = "700 56px Arial";
    context.fillText(timer, width / 2, 197);
    context.fillStyle = "#f7e7b8";
    context.font = "700 30px Arial";
    context.fillText(status.toUpperCase(), width / 2, 306);

    texture.needsUpdate = true;
  }

  return { group, update };
}

export function createArenaEnvironment(scene) {
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#5f3b22", roughness: 0.78 });
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#3d2819", roughness: 0.82 });
  const flagBlueMaterial = new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.55, side: THREE.DoubleSide });
  const flagRedMaterial = new THREE.MeshStandardMaterial({ color: COLORS.red, roughness: 0.55, side: THREE.DoubleSide });
  const kazakhstanFlagMaterial = new THREE.MeshStandardMaterial({
    map: createKazakhstanFlagTexture(),
    roughness: 0.54,
    side: THREE.DoubleSide
  });
  const standMaterial = new THREE.MeshStandardMaterial({ color: "#8b704a", roughness: 0.9 });
  const crowdMaterials = [
    new THREE.MeshStandardMaterial({ color: "#26384a", roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: "#7d3029", roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: "#ded1a8", roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: "#2e5f62", roughness: 0.92 })
  ];
  const trackMaterials = [
    new THREE.MeshStandardMaterial({ color: "#a98248", roughness: 0.96, transparent: true, opacity: 0.2 }),
    new THREE.MeshStandardMaterial({ color: "#d5b36d", roughness: 0.96, transparent: true, opacity: 0.16 })
  ];

  const fenceOffset = 5.2;
  const southFenceZ = -WORLD.height / 2 - fenceOffset;
  const northFenceZ = START_LINE_Z + START_LANE_DEPTH + 4;
  const fenceCenterZ = (southFenceZ + northFenceZ) / 2;
  const fenceDepth = northFenceZ - southFenceZ;
  const fenceX = WORLD.width / 2 + RIDER_FIELD_EXIT_BUFFER + 4;

  for (const z of [southFenceZ, northFenceZ]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(fenceX * 2, 0.28, 0.42), railMaterial);
    rail.position.set(0, 0.82, z);
    rail.castShadow = true;
    scene.add(rail);
  }

  for (const x of [-fenceX, fenceX]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, fenceDepth), railMaterial);
    rail.position.set(x, 0.82, fenceCenterZ);
    rail.castShadow = true;
    scene.add(rail);
  }

  for (let x = -fenceX; x <= fenceX; x += 10) {
    for (const z of [southFenceZ, northFenceZ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.55, 8), postMaterial);
      post.position.set(x, 0.78, z);
      post.castShadow = true;
      scene.add(post);
    }
  }

  for (let z = southFenceZ + 10; z <= northFenceZ - 10; z += 10) {
    for (const x of [-fenceX, fenceX]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.55, 8), postMaterial);
      post.position.set(x, 0.78, z);
      post.castShadow = true;
      scene.add(post);
    }
  }

  for (const [x, z, material] of [
    [-fenceX, southFenceZ, flagBlueMaterial],
    [-fenceX, northFenceZ, flagBlueMaterial],
    [fenceX, southFenceZ, flagRedMaterial],
    [fenceX, northFenceZ, flagRedMaterial],
    [0, northFenceZ + 15.5, kazakhstanFlagMaterial]
  ]) {
    const isNationalFlag = x === 0;
    const poleHeight = isNationalFlag ? 8.6 : 4.4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, poleHeight, 8), postMaterial);
    pole.position.set(x, poleHeight / 2, z);
    pole.castShadow = true;
    scene.add(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(isNationalFlag ? 7.2 : 2.8, isNationalFlag ? 3.6 : 1.35),
      material
    );
    flag.position.set(x + (isNationalFlag ? 0 : Math.sign(x) * 1.35), isNationalFlag ? 6.1 : 3.35, z);
    flag.rotation.y = isNationalFlag ? Math.PI : Math.PI / 2;
    flag.castShadow = true;
    scene.add(flag);
  }

  for (const [x, z, rotationY] of [
    [-fenceX, -9, Math.PI / 2],
    [fenceX, 10, -Math.PI / 2]
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.8, 8), postMaterial);
    pole.position.set(x, 2.4, z);
    pole.castShadow = true;
    scene.add(pole);

    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.9), kazakhstanFlagMaterial);
    flag.position.set(x, 4.15, z);
    flag.rotation.y = rotationY;
    flag.castShadow = true;
    scene.add(flag);
  }

  for (let i = 0; i < 36; i += 1) {
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(8 + (i % 5) * 3.5, 0.035, 0.18 + (i % 3) * 0.05),
      trackMaterials[i % trackMaterials.length]
    );
    track.position.set(
      (Math.random() - 0.5) * (WORLD.width - 10),
      0.045,
      (Math.random() - 0.5) * (WORLD.height - 8)
    );
    track.rotation.y = Math.random() * Math.PI;
    scene.add(track);
  }

  for (const z of [southFenceZ - 13, northFenceZ + 13]) {
    const side = Math.sign(z);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(WORLD.width * 0.78, 2.2, 5.8), standMaterial);
    stand.position.set(0, 1.1, z);
    stand.rotation.x = side > 0 ? -0.08 : 0.08;
    stand.receiveShadow = true;
    scene.add(stand);

    for (let row = 0; row < 3; row += 1) {
      for (let i = 0; i < 32; i += 1) {
        const spectator = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.46), crowdMaterials[(i + row) % crowdMaterials.length]);
        spectator.position.set(-WORLD.width * 0.36 + i * 3.2, 2.35 + row * 0.55, z + side * (-1.8 + row * 1.25));
        spectator.castShadow = true;
        scene.add(spectator);
      }
    }
  }

  const scoreboard = createStadiumScoreboardMesh();
  scoreboard.group.position.set(0, 12.2, northFenceZ + 23);
  scoreboard.group.rotation.y = Math.PI;
  scene.add(scoreboard.group);

  return { scoreboard };
}
