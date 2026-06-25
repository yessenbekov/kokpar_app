import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { COLORS, TEAM } from "./constants.js";
import { horseTypeById } from "./horseTypes.js";

const MODEL_MANIFEST_URL = "/models/manifest.json";

const DEFAULT_MODEL_MANIFEST = {
  riderHorse: null,
  horse: null,
  rider: null,
  serke: null
};

const TEAM_MATERIAL_TOKENS = ["uniform", "jersey", "shirt", "kit", "team", "saddleblanket", "blanket", "char"];
const HORSE_MATERIAL_TOKENS = ["horse", "coat", "body", "mane", "tail"];
const SERKE_MATERIAL_TOKENS = ["serke", "kokpar", "dummy", "hide"];
const LEG_KEYS = ["fl", "fr", "bl", "br"];

const gltfLoader = new GLTFLoader();

function normalizeDescriptor(entry) {
  if (!entry) return { path: null };
  if (typeof entry === "string") return { path: entry };
  return {
    path: entry.path ?? null,
    scale: entry.scale ?? 1,
    position: entry.position ?? [0, 0, 0],
    rotation: entry.rotation ?? [0, 0, 0]
  };
}

async function loadManifest() {
  try {
    const response = await fetch(MODEL_MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) return DEFAULT_MODEL_MANIFEST;

    return {
      ...DEFAULT_MODEL_MANIFEST,
      ...(await response.json())
    };
  } catch {
    return DEFAULT_MODEL_MANIFEST;
  }
}

function prepareScene(root) {
  root.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
}

async function loadOptionalModel(entry) {
  const descriptor = normalizeDescriptor(entry);
  if (!descriptor.path) return null;

  try {
    const gltf = await gltfLoader.loadAsync(descriptor.path);
    const scene = gltf.scene ?? gltf.scenes?.[0];
    if (!scene) return null;

    prepareScene(scene);
    return {
      animations: gltf.animations ?? [],
      descriptor,
      scene
    };
  } catch (error) {
    console.warn(`Could not load GLB asset at ${descriptor.path}. Falling back to procedural mesh.`, error);
    return null;
  }
}

function cloneMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;

    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material.clone());
    } else if (node.material) {
      node.material = node.material.clone();
    }
  });
}

function clonePrototype(prototype) {
  const clone = cloneSkeleton(prototype.scene);
  cloneMaterials(clone);
  prepareScene(clone);
  clone.userData.animations = prototype.animations;
  return clone;
}

function applyTransform(object, descriptor) {
  const scale = descriptor.scale ?? 1;
  if (Array.isArray(scale)) {
    object.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);
  } else {
    object.scale.setScalar(scale);
  }

  const position = descriptor.position ?? [0, 0, 0];
  object.position.set(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);

  const rotation = descriptor.rotation ?? [0, 0, 0];
  object.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
}

function materialSource(node, material) {
  return `${node.name ?? ""} ${node.parent?.name ?? ""} ${material?.name ?? ""}`.toLowerCase();
}

function matchesAnyToken(node, material, tokens) {
  const source = materialSource(node, material);
  return tokens.some((token) => source.includes(token));
}

function forEachMaterial(node, callback) {
  if (Array.isArray(node.material)) {
    node.material.forEach((material) => callback(material));
    return;
  }

  if (node.material) callback(node.material);
}

function setMaterialColor(material, color) {
  if (!material?.color) return;
  material.color.set(color);
  material.needsUpdate = true;
}

function horseColorForRider(rider) {
  const horseType = horseTypeById(rider.horseType);
  return horseType.palette[rider.team === TEAM.red ? "red" : "blue"].coat;
}

function tintRiderModel(root, rider) {
  root.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;

    forEachMaterial(node, (material) => {
      if (matchesAnyToken(node, material, TEAM_MATERIAL_TOKENS)) {
        setMaterialColor(material, rider.color);
      } else if (matchesAnyToken(node, material, HORSE_MATERIAL_TOKENS)) {
        setMaterialColor(material, horseColorForRider(rider));
      }
    });
  });
}

function tintSerkeModel(root) {
  root.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;

    forEachMaterial(node, (material) => {
      if (matchesAnyToken(node, material, SERKE_MATERIAL_TOKENS)) {
        setMaterialColor(material, "#e5c99a");
      }
    });
  });
}

function addModelPart(root, prototype, name) {
  if (!prototype) return null;

  const part = clonePrototype(prototype);
  part.name = name;
  applyTransform(part, prototype.descriptor);
  root.add(part);
  return part;
}

function findLegKey(name) {
  return LEG_KEYS.find((key) => name.includes(`_${key}`) || name.endsWith(key)) ?? null;
}

function legPhaseFor(key) {
  return key === "fl" || key === "br" ? 0 : Math.PI;
}

function addRiderDustPuffs(root) {
  const dustMaterial = new THREE.MeshStandardMaterial({
    color: "#c8a050",
    transparent: true,
    opacity: 0.32,
    roughness: 1,
    depthWrite: false
  });
  const dust = new THREE.Group();
  dust.name = "asset_dust";

  for (const [x, z, scale, baseY] of [
    [-2.3, -0.55, 1.4, 0.38],
    [-2.75, 0.12, 1.1, 0.28],
    [-2.1,  0.58, 0.9, 0.22],
    [-1.5, -0.78, 0.72, 0.18],
    [-1.45, 0.78, 0.72, 0.18],
    [-3.2, -0.22, 0.85, 0.32],
    [-1.1,  0.10, 0.60, 0.12]
  ]) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.68 * scale, 8, 5), dustMaterial.clone());
    puff.name = `asset_dust_puff_${dust.children.length + 1}`;
    puff.position.set(x, baseY, z);
    puff.scale.y = 0.45;
    puff.userData.baseScale = scale;
    puff.userData.baseY = baseY;
    dust.add(puff);
  }

  dust.visible = false;
  root.add(dust);
  root.userData.dust = dust;
}

function hydrateRiderModelControls(root) {
  const legNodes = [];
  const wrapByKey = new Map();

  root.traverse((node) => {
    if (node === root || !node.name) return;

    const name = node.name.toLowerCase();
    const key = findLegKey(name);

    if (name.includes("gait_wrap") && key) {
      wrapByKey.set(key, node);
      return;
    }

    if (name.includes("gait_leg") && key) {
      legNodes.push({ key, node });
      return;
    }

    if (name.includes("gait_tail")) {
      root.userData.tail = node;
      root.userData.tailBaseRotationX = node.rotation.x;
      root.userData.tailBaseRotationZ = node.rotation.z;
      return;
    }

    if (name.includes("pose_arm")) {
      root.userData.arms ??= [];
      root.userData.arms.push({
        mesh: node,
        side: name.includes("left") ? 1 : -1,
        baseRotationX: node.rotation.x,
        baseRotationZ: node.rotation.z,
        baseY: node.position.y
      });
      return;
    }

    if (name.includes("pose_torso") || name.includes("pose_chest") || name.includes("pose_head") || name.includes("pose_helmet")) {
      root.userData.upperBody ??= [];
      root.userData.upperBody.push({
        mesh: node,
        baseRotationX: node.rotation.x,
        baseRotationZ: node.rotation.z,
        baseY: node.position.y
      });
    }
  });

  if (legNodes.length > 0) {
    root.userData.legs = legNodes.map(({ key, node }) => {
      const wrap = wrapByKey.get(key);

      return {
        mesh: node,
        wrap,
        baseX: node.position.x,
        baseZ: node.position.z,
        baseY: node.position.y,
        baseWrapY: wrap?.position.y ?? 0,
        baseRotationX: node.rotation.x,
        baseRotationZ: node.rotation.z,
        phase: legPhaseFor(key)
      };
    });
  }

  addRiderDustPuffs(root);
}

export function createGameAssetPipeline() {
  const pipeline = {
    manifest: DEFAULT_MODEL_MANIFEST,
    prototypes: {
      horse: null,
      rider: null,
      riderHorse: null,
      serke: null
    },
    ready: false,
    readyPromise: null
  };

  pipeline.readyPromise = loadManifest().then(async (manifest) => {
    pipeline.manifest = manifest;

    const [riderHorse, horse, rider, serke] = await Promise.all([
      loadOptionalModel(manifest.riderHorse),
      loadOptionalModel(manifest.horse),
      loadOptionalModel(manifest.rider),
      loadOptionalModel(manifest.serke)
    ]);

    pipeline.prototypes = { horse, rider, riderHorse, serke };
    pipeline.ready = true;
    return pipeline;
  });

  return pipeline;
}

export function createRiderModelInstance(assetPipeline, rider) {
  const { horse, rider: riderPrototype, riderHorse } = assetPipeline.prototypes;
  if (!riderHorse && !horse && !riderPrototype) return null;

  const group = new THREE.Group();
  group.name = `${rider.name} GLB rider`;
  group.userData.assetDriven = true;

  if (riderHorse) {
    addModelPart(group, riderHorse, "combined-rider-horse");
  } else {
    const horsePart = addModelPart(group, horse, "horse");
    addModelPart(group, riderPrototype, "rider");

    if (horsePart?.userData.animations?.length > 0) {
      const anims = horsePart.userData.animations;
      const walkSrc = anims.find((a) => a.name.includes("Walk Forward")) ?? anims[0];
      const gallopSrc = anims.find((a) => /Gallop Forward/.test(a.name)) ?? walkSrc;

      function stripXZ(src) {
        const tracks = src.tracks.filter((t) => {
          const isRoot = /^(Align|RootNode|Root|Object_2|Pelvis_01)\./.test(t.name);
          return !(isRoot && t.name.endsWith(".position"));
        });
        return new THREE.AnimationClip(src.name, src.duration, tracks);
      }

      const mixer = new THREE.AnimationMixer(horsePart);
      const walkAction = mixer.clipAction(stripXZ(walkSrc));
      const gallopAction = mixer.clipAction(stripXZ(gallopSrc));
      walkAction.play();
      gallopAction.play();
      walkAction.setEffectiveWeight(1);
      gallopAction.setEffectiveWeight(0);

      group.userData.mixer = mixer;
      group.userData.walkAction = walkAction;
      group.userData.gallopAction = gallopAction;

      const coatColor = new THREE.Color(rider.color);
      const hairColor = coatColor.clone().multiplyScalar(0.5);
      const horseMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.72 });
      const hairMat  = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
      horsePart.traverse((node) => {
        if (!node.isMesh && !node.isSkinnedMesh) return;
        const n = node.name.toLowerCase();
        node.material = (n.includes("hair") || n.includes("mane")) ? hairMat : horseMat;
      });

      const saddleX = 0.9;
      const saddleY = 4.2;
      const skinMat = new THREE.MeshStandardMaterial({ color: "#f0e0c0", roughness: 0.65 });
      const clothMat = new THREE.MeshStandardMaterial({ color: rider.color, roughness: 0.55 });
      const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(rider.color).multiplyScalar(0.55), roughness: 0.6 });

      const rider3D = new THREE.Group();
      rider3D.position.set(saddleX, saddleY, 0);

      // Torso (jacket in team color)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.90, 1.40, 0.55), clothMat);
      torso.position.y = 0.70;
      torso.castShadow = true;
      rider3D.add(torso);

      // Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.32, 6), skinMat);
      neck.position.y = 1.56;
      rider3D.add(neck);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), skinMat);
      head.position.y = 1.92;
      head.castShadow = true;
      rider3D.add(head);

      // Helmet (team color)
      const helmetBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.08, 8), clothMat);
      helmetBrim.position.y = 2.10;
      rider3D.add(helmetBrim);
      const helmetTop = new THREE.Mesh(new THREE.SphereGeometry(0.40, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), clothMat);
      helmetTop.position.y = 2.10;
      rider3D.add(helmetTop);

      // Arms angled forward/down (holding reins)
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.80, 6), clothMat);
        arm.rotation.z = side * 0.60;
        arm.rotation.x = 0.30;
        arm.position.set(side * 0.54, 0.88, 0.22);
        arm.castShadow = true;
        rider3D.add(arm);
      }

      // Legs hanging down sides of horse
      for (const side of [-1, 1]) {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.85, 6), darkMat);
        thigh.rotation.z = side * 1.42;
        thigh.position.set(side * 0.58, 0.18, 0);
        thigh.castShadow = true;
        rider3D.add(thigh);

        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.38), darkMat);
        boot.position.set(side * 1.02, -0.38, 0.04);
        rider3D.add(boot);
      }

      group.add(rider3D);
      group.userData.rider3D = rider3D;
    }
  }

  tintRiderModel(group, rider);
  hydrateRiderModelControls(group);
  return group;
}

export function createSerkeModelInstance(assetPipeline) {
  const { serke } = assetPipeline.prototypes;
  if (!serke) return null;

  const group = new THREE.Group();
  group.name = "GLB serke";
  group.userData.assetDriven = true;
  addModelPart(group, serke, "serke");
  tintSerkeModel(group);
  return group;
}

export const MODEL_ASSET_HINTS = {
  horse: "/models/horses/horse.glb",
  rider: "/models/riders/rider.glb",
  riderHorse: "/models/horses/rider-horse.glb",
  serke: "/models/serke/serke.glb"
};
