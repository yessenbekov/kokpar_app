import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function makeMaterial(name, color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness: 0,
    flatShading: true
  });
}

const materials = {
  horse: makeMaterial("horse_body_coat", "#8a5c35", 0.82),
  horseDark: makeMaterial("horse_dark_mane_tail_legs", "#24160f", 0.86),
  horseMuzzle: makeMaterial("horse_muzzle", "#b87a45", 0.84),
  uniform: makeMaterial("uniform_team_jersey", "#176d9f", 0.55),
  trim: makeMaterial("uniform_trim", "#f0dba6", 0.66),
  tack: makeMaterial("tack_leather", "#2b1a12", 0.7),
  skin: makeMaterial("rider_skin", "#d89a72", 0.62),
  serkeHide: makeMaterial("serke_hide", "#e5c99a", 0.94),
  serkeDark: makeMaterial("serke_dark_head_legs", "#2b1a12", 0.9),
  serkeMark: makeMaterial("serke_marker_belly", "#f4ead2", 0.86)
};

function mesh(name, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function box(name, size, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  return mesh(name, new THREE.BoxGeometry(...size), material, position, scale, rotation);
}

function sphere(name, radius, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  return mesh(name, new THREE.SphereGeometry(radius, 12, 8), material, position, scale, rotation);
}

function cylinder(name, radiusTop, radiusBottom, height, material, position, rotation = [0, 0, 0]) {
  return mesh(name, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8, 1), material, position, [1, 1, 1], rotation);
}

function capsule(name, radius, length, material, position, rotation = [0, 0, 0]) {
  return mesh(name, new THREE.CapsuleGeometry(radius, length, 6, 10), material, position, [1, 1, 1], rotation);
}

function createLeg(name, x, z, wrapY) {
  const leg = new THREE.Group();
  leg.name = `gait_leg_${name}`;
  leg.position.set(x, 0.56, z);

  leg.add(cylinder(`${name}_lower_leg`, 0.11, 0.15, 1.16, materials.horseDark, [0, 0, 0], [0, 0, x > 0 ? -0.08 : 0.08]));
  leg.add(box(`${name}_hoof`, [0.28, 0.14, 0.26], materials.horseDark, [0.05, -0.66, 0], [1, 1, 1], [0, 0, -0.08]));

  const wrap = new THREE.Group();
  wrap.name = `gait_wrap_${name}`;
  wrap.position.set(x, wrapY, z);
  wrap.add(cylinder(`${name}_uniform_wrap`, 0.14, 0.15, 0.2, materials.uniform, [0, 0, 0]));

  return { leg, wrap };
}

function createRiderHorseAsset() {
  const root = new THREE.Group();
  root.name = "kokpar_rider_horse_starter";

  root.add(sphere("horse_body", 1, materials.horse, [0, 1.22, 0], [2.8, 0.72, 0.82], [0, 0, 0]));
  root.add(sphere("horse_chest", 0.72, materials.horse, [1.36, 1.28, 0], [1.0, 0.95, 0.86], [0, 0, -0.15]));
  root.add(sphere("horse_neck", 0.48, materials.horse, [2.05, 1.72, 0], [0.72, 1.32, 0.72], [0, 0, -0.64]));
  root.add(sphere("horse_head", 0.5, materials.horseDark, [2.68, 1.72, -0.02], [1.16, 0.82, 0.82], [0, 0, -0.08]));
  root.add(sphere("horse_muzzle", 0.24, materials.horseMuzzle, [3.12, 1.6, -0.02], [1.25, 0.7, 0.78], [0, 0, -0.1]));
  root.add(box("horse_face_mark", [0.1, 0.48, 0.08], materials.trim, [2.92, 1.9, -0.04], [1, 1, 1], [0, 0, -0.24]));
  root.add(box("horse_mane", [1.22, 0.18, 0.14], materials.horseDark, [1.48, 1.96, 0], [1, 1, 1], [0, 0, -0.36]));

  const tail = new THREE.Group();
  tail.name = "gait_tail";
  tail.position.set(-2.54, 1.04, 0);
  tail.rotation.set(0.18, 0, 1.14);
  tail.add(cylinder("horse_tail_hair", 0.08, 0.18, 1.22, materials.horseDark, [0, -0.02, 0]));
  root.add(tail);

  for (const [name, x, z, wrapY] of [
    ["fl", 1.02, 0.48, 0.78],
    ["fr", 1.02, -0.48, 0.78],
    ["bl", -1.16, 0.48, 0.78],
    ["br", -1.16, -0.48, 0.78]
  ]) {
    const { leg, wrap } = createLeg(name, x, z, wrapY);
    root.add(leg);
    root.add(wrap);
  }

  root.add(box("uniform_saddleblanket", [1.92, 0.14, 1.32], materials.uniform, [-0.2, 1.98, 0], [1, 1, 1], [0, 0, -0.02]));
  root.add(box("uniform_trim_blanket", [2.04, 0.08, 1.46], materials.trim, [-0.2, 1.9, 0], [1, 1, 1], [0, 0, -0.02]));
  root.add(box("tack_saddle", [1.34, 0.2, 0.94], materials.tack, [-0.22, 2.16, 0], [1, 1, 1], [0, 0, -0.02]));
  root.add(box("tack_girth", [0.18, 1.04, 1.52], materials.tack, [-0.05, 1.18, 0], [1, 1, 1], [0, 0, -0.02]));
  root.add(box("uniform_side_panel_left", [1.16, 0.62, 0.08], materials.uniform, [-0.28, 1.36, 0.73], [1, 1, 1], [0, 0, -0.04]));
  root.add(box("uniform_side_panel_right", [1.16, 0.62, 0.08], materials.uniform, [-0.28, 1.36, -0.73], [1, 1, 1], [0, 0, -0.04]));

  const torso = capsule("pose_torso", 0.43, 0.88, materials.uniform, [-0.12, 2.42, 0], [0, 0, -0.08]);
  root.add(torso);
  root.add(box("pose_chest_stripe", [0.16, 0.78, 0.58], materials.trim, [0.04, 2.46, 0], [1, 1, 1], [0, 0, -0.1]));
  root.add(sphere("pose_head", 0.31, materials.skin, [0.1, 3.1, 0], [1, 1, 1]));
  root.add(sphere("pose_helmet", 0.38, materials.uniform, [0.1, 3.25, 0], [1, 0.58, 1]));
  root.add(box("pose_helmet_brim", [0.58, 0.05, 0.5], materials.tack, [0.35, 3.2, 0], [1, 1, 1], [0, 0, -0.06]));

  const leftArm = cylinder("pose_arm_left", 0.08, 0.1, 0.78, materials.uniform, [0.25, 2.48, 0.34], [0.34, 0, Math.PI / 2.65]);
  const rightArm = cylinder("pose_arm_right", 0.08, 0.1, 0.78, materials.uniform, [0.25, 2.48, -0.34], [-0.34, 0, Math.PI / 2.65]);
  root.add(leftArm);
  root.add(rightArm);
  root.add(cylinder("rider_boot_left", 0.1, 0.12, 0.78, materials.tack, [-0.28, 1.78, 0.42], [0, 0, -0.1]));
  root.add(cylinder("rider_boot_right", 0.1, 0.12, 0.78, materials.tack, [-0.28, 1.78, -0.42], [0, 0, -0.1]));
  root.add(box("tack_rein_left", [1.95, 0.04, 0.035], materials.tack, [1.32, 1.98, 0.2], [1, 1, 1], [0, 0, -0.25]));
  root.add(box("tack_rein_right", [1.95, 0.04, 0.035], materials.tack, [1.32, 1.98, -0.2], [1, 1, 1], [0, 0, -0.25]));

  return root;
}

function createSerkeAsset() {
  const root = new THREE.Group();
  root.name = "kokpar_serke_starter";

  root.add(sphere("serke_hide_body", 0.86, materials.serkeHide, [0, 0, 0], [1.55, 0.5, 0.78], [0, 0, -0.35]));
  root.add(sphere("serke_dark_head", 0.36, materials.serkeDark, [1.22, 0.04, -0.04], [1.2, 0.8, 0.8]));
  root.add(sphere("serke_marker_belly_patch", 0.48, materials.serkeMark, [-0.08, 0.34, 0], [1.45, 0.16, 0.68]));
  root.add(cylinder("serke_strap_ring", 0.04, 0.04, 1.62, materials.uniform, [0.12, 0.02, 0], [Math.PI / 2, 0, 0]));

  for (const [x, z, rz] of [
    [-0.58, -0.34, 0.58],
    [-0.58, 0.34, 0.58],
    [0.52, -0.34, -0.58],
    [0.52, 0.34, -0.58]
  ]) {
    root.add(cylinder("serke_dark_leg", 0.05, 0.07, 0.48, materials.serkeDark, [x, -0.35, z], [z > 0 ? 0.28 : -0.28, 0, rz]));
  }

  root.add(cylinder("serke_dark_tail", 0.05, 0.08, 0.82, materials.serkeDark, [-1.2, -0.06, 0.15], [0, 0, 1.25]));
  root.add(box("serke_uniform_ribbon", [0.12, 0.7, 0.09], materials.uniform, [-0.28, -0.48, 0.42], [1, 1, 1], [-0.22, 0, 0]));

  return root;
}

async function writeGlb(object, outputPath) {
  object.updateMatrixWorld(true);

  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(object, {
    binary: true,
    includeCustomExtensions: false,
    onlyVisible: true,
    trs: false
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(glb));
  console.log(`Wrote ${outputPath.replace(`${ROOT}/`, "")}`);
}

await writeGlb(createRiderHorseAsset(), resolve(ROOT, "public/models/horses/kokpar-rider-horse.glb"));
await writeGlb(createSerkeAsset(), resolve(ROOT, "public/models/serke/serke.glb"));
