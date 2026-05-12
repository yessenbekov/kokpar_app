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

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${min}:${sec}`;
}

function createInitialRiders() {
  return [
    createRider({ name: "Сен", team: TEAM.blue, human: true, x: 34, z: 0, color: COLORS.blue }),
    createRider({ name: "Арман", team: TEAM.blue, x: 40, z: -16, color: COLORS.blueAlt }),
    createRider({ name: "Ерлан", team: TEAM.blue, x: 41, z: 16, color: COLORS.blueAlt }),
    createRider({ name: "Бек", team: TEAM.red, x: -34, z: -17, color: COLORS.red }),
    createRider({ name: "Нур", team: TEAM.red, x: -41, z: 0, color: COLORS.red }),
    createRider({ name: "Самат", team: TEAM.red, x: -34, z: 17, color: COLORS.red })
  ];
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
    rider.group = createHorseMesh(rider.color);
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
    message: "Матч начался",
    submessage: "Кокпар в центре поля.",
    messageTime: 3
  };

  let animationFrame = 0;
  let lastFrameTime = performance.now();
  let isDestroyed = false;

  function publishHud() {
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
      message: match.message,
      submessage: match.submessage,
      showBanner: match.messageTime > 0 || match.over
    });
  }

  function showMessage(message, submessage, seconds = 2.5) {
    match.message = message;
    match.submessage = submessage;
    match.messageTime = seconds;
    publishHud();
  }

  function resetPositions() {
    const spots = [
      [34, 0],
      [40, -16],
      [41, 16],
      [-34, -17],
      [-41, 0],
      [-34, 17]
    ];

    riders.forEach((rider, index) => {
      rider.x = spots[index][0];
      rider.z = spots[index][1];
      rider.vx = 0;
      rider.vz = 0;
      rider.grabCooldown = 0.8;
      rider.bumpCooldown = 0.3;
    });

    kokpar.x = 0;
    kokpar.z = 0;
    kokpar.vx = 0;
    kokpar.vz = 0;
    kokpar.holder = null;
    kokpar.looseCooldown = 0.8;
  }

  function scoreGoal(team) {
    match[team] += 1;
    resetPositions();
    showMessage(
      team === TEAM.blue ? "Гол! Кокпар в казане" : "Красные забрали очко",
      "Центр поля снова открыт.",
      2.2
    );
  }

  function restart() {
    match.blue = 0;
    match.red = 0;
    match.time = MATCH_SECONDS;
    match.over = false;
    resetPositions();
    showMessage("Новый матч", "Кокпар в центре поля.", 2.8);
  }

  function supportPoint(holder, rider) {
    const scoringGoal = goalFor(rider.team);
    const side = rider.name.charCodeAt(0) % 2 === 0 ? -1 : 1;
    return {
      x: holder.x + (scoringGoal.x - holder.x) * 0.22,
      z: holder.z + side * 12
    };
  }

  function attemptGrab(rider, active) {
    if (match.over || rider.grabCooldown > 0) return;

    if (!kokpar.holder && kokpar.looseCooldown <= 0 && distance2D(rider, kokpar) < 4.2) {
      kokpar.holder = rider;
      rider.grabCooldown = active ? 0.18 : 0.44;
      showMessage(rider.human ? "Кокпар у тебя" : `${rider.name} поднял кокпар`, "Толпа закрывается.", 1.6);
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
    const sprint = keys.has(" ") && rider.stamina > 0.04;
    const direction = normalize2D(ax, az);

    if (moving) {
      const power = sprint ? 1.55 : 1;
      rider.vx += direction.x * rider.acceleration * power * dt;
      rider.vz += direction.z * rider.acceleration * power * dt;
    }

    if (sprint && moving) {
      rider.stamina = clamp(rider.stamina - dt * 0.36, 0, 1);
    } else {
      rider.stamina = clamp(rider.stamina + dt * 0.18, 0, 1);
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

    rider.vx += direction.x * rider.acceleration * urgency * dt;
    rider.vz += direction.z * rider.acceleration * urgency * dt;
    attemptGrab(rider, false);
  }

  function updateRiderMovement(dt, time) {
    riders.forEach((rider) => {
      rider.grabCooldown = Math.max(0, rider.grabCooldown - dt);
      rider.bumpCooldown = Math.max(0, rider.bumpCooldown - dt);

      if (rider.human) {
        updateHuman(rider, dt);
      } else {
        updateAI(rider, dt, time);
      }

      const maxSpeed = rider.maxSpeed * (kokpar.holder === rider ? 0.88 : 1);
      const speed = Math.hypot(rider.vx, rider.vz);

      if (speed > maxSpeed) {
        rider.vx = (rider.vx / speed) * maxSpeed;
        rider.vz = (rider.vz / speed) * maxSpeed;
      }

      const drag = Math.pow(0.9, dt * 60);
      rider.vx *= drag;
      rider.vz *= drag;
      rider.x = clamp(rider.x + rider.vx * dt, -WORLD.width / 2 + 3.5, WORLD.width / 2 - 3.5);
      rider.z = clamp(rider.z + rider.vz * dt, -WORLD.height / 2 + 3.5, WORLD.height / 2 - 3.5);

      if (Math.hypot(rider.vx, rider.vz) > 1) {
        rider.rotation = Math.atan2(rider.vz, rider.vx);
      }
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
      }
      return;
    }

    kokpar.vx *= Math.pow(0.91, dt * 60);
    kokpar.vz *= Math.pow(0.91, dt * 60);
    kokpar.x = clamp(kokpar.x + kokpar.vx * dt, -WORLD.width / 2 + 3, WORLD.width / 2 - 3);
    kokpar.z = clamp(kokpar.z + kokpar.vz * dt, -WORLD.height / 2 + 3, WORLD.height / 2 - 3);
  }

  function syncMeshes(time) {
    riders.forEach((rider) => {
      const speed = Math.hypot(rider.vx, rider.vz);
      const bob = Math.sin(time * 11 + rider.aiPhase) * Math.min(speed / 120, 0.18);
      const scale = rider.bumpCooldown > 0 ? 1.08 : 1;

      rider.group.position.set(rider.x, Math.max(0, bob), rider.z);
      rider.group.rotation.y = -rider.rotation;
      rider.group.scale.setScalar(scale);
    });

    kokpar.mesh.position.set(kokpar.x, kokpar.holder ? 1.55 : 0.72, kokpar.z);
    kokpar.mesh.rotation.y += 0.02 + Math.hypot(kokpar.vx, kokpar.vz) * 0.002;
  }

  function updateCamera(dt) {
    const desired = new THREE.Vector3(player.x - 16, 31, player.z + 30);
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(player.x + 5, 0.8, player.z);
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

    const dt = Math.min((now - lastFrameTime) / 1000, 0.033);
    const time = now / 1000;
    lastFrameTime = now;

    if (!match.over) {
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
