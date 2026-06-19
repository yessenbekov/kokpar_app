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
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0, flatShading: true });
}

const materials = {
  horse:      makeMaterial("horse_body_coat",           "#8a5c35", 0.82),
  horseDark:  makeMaterial("horse_dark_mane_tail_legs", "#24160f", 0.86),
  horseMid:   makeMaterial("horse_mid_inner_ear",       "#7a3d22", 0.84),
  horseMuzzle:makeMaterial("horse_muzzle",              "#b87a45", 0.84),
  uniform:    makeMaterial("uniform_team_jersey",       "#176d9f", 0.55),
  trim:       makeMaterial("uniform_trim",              "#f0dba6", 0.66),
  tack:       makeMaterial("tack_leather",              "#2b1a12", 0.70),
  skin:       makeMaterial("rider_skin",                "#d89a72", 0.62),
  serkeHide:  makeMaterial("serke_hide",                "#e5c99a", 0.94),
  serkeDark:  makeMaterial("serke_dark_head_legs",      "#2b1a12", 0.90),
  serkeMark:  makeMaterial("serke_marker_belly",        "#f4ead2", 0.86),
  serkeHorn:  makeMaterial("serke_horn",                "#6a5a3a", 0.80),
};

function mesh(name, geometry, material, position = [0,0,0], scale = [1,1,1], rotation = [0,0,0]) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function box(name, size, material, position, scale = [1,1,1], rotation = [0,0,0]) {
  return mesh(name, new THREE.BoxGeometry(...size), material, position, scale, rotation);
}

function sphere(name, radius, material, position, scale = [1,1,1], rotation = [0,0,0]) {
  return mesh(name, new THREE.SphereGeometry(radius, 14, 9), material, position, scale, rotation);
}

function cylinder(name, radiusTop, radiusBottom, height, material, position, rotation = [0,0,0]) {
  return mesh(name, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 9, 1), material, position, [1,1,1], rotation);
}

function capsule(name, radius, length, material, position, rotation = [0,0,0]) {
  return mesh(name, new THREE.CapsuleGeometry(radius, length, 6, 10), material, position, [1,1,1], rotation);
}

function createLeg(name, x, z, wrapY) {
  const leg = new THREE.Group();
  leg.name = `gait_leg_${name}`;
  leg.position.set(x, 0.76, z);

  const splayX = x > 0 ? -0.07 : 0.07;
  leg.add(cylinder(`${name}_lower_leg`, 0.09, 0.12, 0.96, materials.horseDark, [0, -0.48, 0], [0, 0, splayX]));
  leg.add(sphere(`${name}_fetlock`, 0.1, materials.horseDark, [0.04, -0.98, 0], [1, 0.9, 1]));
  leg.add(box(`${name}_hoof`, [0.30, 0.17, 0.28], materials.horseDark, [0.06, -1.16, 0], [1, 1, 1], [0, 0, -0.08]));

  const wrap = new THREE.Group();
  wrap.name = `gait_wrap_${name}`;
  wrap.position.set(x, wrapY, z);
  wrap.add(cylinder(`${name}_uniform_wrap`, 0.12, 0.13, 0.18, materials.uniform, [0, 0, 0]));

  return { leg, wrap };
}

function createRiderHorseAsset() {
  const root = new THREE.Group();
  root.name = "kokpar_rider_horse";

  // ── HORSE BODY ─────────────────────────────────────────────────────────────
  root.add(sphere("horse_body",         1,    materials.horse,  [0,     1.22, 0], [2.80, 0.72, 0.82]));
  root.add(sphere("horse_hindquarters", 0.88, materials.horse,  [-1.62, 1.38, 0], [1.14, 0.90, 0.90]));
  root.add(sphere("horse_croup",        0.44, materials.horse,  [-2.04, 1.86, 0], [1.10, 0.74, 0.80]));
  root.add(sphere("horse_chest",        0.72, materials.horse,  [1.36,  1.28, 0], [1.05, 0.95, 0.88]));
  root.add(sphere("horse_withers",      0.38, materials.horse,  [0.86,  2.00, 0], [0.95, 0.82, 0.72]));

  // ── NECK ───────────────────────────────────────────────────────────────────
  root.add(capsule("horse_neck", 0.40, 0.56, materials.horse, [1.96, 1.84, 0], [0, 0, -0.62]));

  // ── HEAD ───────────────────────────────────────────────────────────────────
  root.add(sphere("horse_head",     0.50, materials.horseDark,  [2.68, 1.78,  0],    [1.12, 0.80, 0.80]));
  root.add(sphere("horse_forehead", 0.30, materials.horseDark,  [2.84, 2.00,  0],    [0.82, 0.72, 0.78]));
  root.add(sphere("horse_muzzle",   0.24, materials.horseMuzzle,[3.12, 1.60,  0],    [1.25, 0.70, 0.78]));
  root.add(sphere("horse_jaw",      0.22, materials.horseDark,  [2.90, 1.50,  0],    [1.00, 0.62, 0.72]));

  // Eyes
  root.add(sphere("horse_eye_left",  0.09, materials.horseDark, [2.76, 1.88,  0.38], [1, 0.72, 0.72]));
  root.add(sphere("horse_eye_right", 0.09, materials.horseDark, [2.76, 1.88, -0.38], [1, 0.72, 0.72]));

  // Nostrils
  root.add(sphere("horse_nostril_left",  0.06, materials.horseDark, [3.18, 1.53,  0.15], [1, 0.8, 0.8]));
  root.add(sphere("horse_nostril_right", 0.06, materials.horseDark, [3.18, 1.53, -0.15], [1, 0.8, 0.8]));

  // Ears
  root.add(box("horse_ear_left",      [0.08, 0.30, 0.12], materials.horseDark, [2.52, 2.24,  0.26], [1,1,1], [ 0.18, 0, 0.14]));
  root.add(box("horse_ear_right",     [0.08, 0.30, 0.12], materials.horseDark, [2.52, 2.24, -0.26], [1,1,1], [-0.18, 0, 0.14]));
  root.add(box("horse_ear_inner_left", [0.04, 0.20, 0.07], materials.horseMid, [2.54, 2.24,  0.26], [1,1,1], [ 0.18, 0, 0.14]));
  root.add(box("horse_ear_inner_right",[0.04, 0.20, 0.07], materials.horseMid, [2.54, 2.24, -0.26], [1,1,1], [-0.18, 0, 0.14]));

  root.add(box("horse_face_mark", [0.10, 0.48, 0.08], materials.trim, [2.92, 1.96, -0.02], [1,1,1], [0, 0, -0.24]));
  root.add(box("horse_mane",      [1.28, 0.20, 0.14], materials.horseDark, [1.48, 2.06, 0], [1,1,1], [0, 0, -0.36]));

  // ── TAIL ───────────────────────────────────────────────────────────────────
  const tail = new THREE.Group();
  tail.name = "gait_tail";
  tail.position.set(-2.64, 1.44, 0);
  tail.rotation.set(0.20, 0, 1.08);
  tail.add(cylinder("horse_tail_root", 0.10, 0.20, 0.54, materials.horseDark, [0,     -0.02, 0]));
  tail.add(cylinder("horse_tail_mid",  0.07, 0.10, 0.58, materials.horseDark, [0.14,  -0.58, 0], [0, 0, -0.22]));
  tail.add(cylinder("horse_tail_tip",  0.04, 0.07, 0.44, materials.horseDark, [0.30,  -1.08, 0], [0, 0, -0.40]));
  root.add(tail);

  // ── UPPER LEGS (static mass above animated pivot) ──────────────────────────
  for (const [suffix, x, z, rx, rz] of [
    ["fl",  1.04,  0.48, -0.10,  0.08],
    ["fr",  1.04, -0.48,  0.10, -0.08],
    ["bl", -1.22,  0.46, -0.26,  0.08],
    ["br", -1.22, -0.46,  0.26, -0.08]
  ]) {
    root.add(capsule(`upper_leg_${suffix}`, 0.18, 0.36, materials.horse, [x, 1.10, z], [rx, 0, rz]));
  }

  // ── LOWER LEGS (animated groups) ──────────────────────────────────────────
  for (const [name, x, z, wrapY] of [
    ["fl",  1.04,  0.48, 0.84],
    ["fr",  1.04, -0.48, 0.84],
    ["bl", -1.22,  0.46, 0.84],
    ["br", -1.22, -0.46, 0.84]
  ]) {
    const { leg, wrap } = createLeg(name, x, z, wrapY);
    root.add(leg);
    root.add(wrap);
  }

  // ── TACK ───────────────────────────────────────────────────────────────────
  root.add(box("uniform_saddleblanket",    [1.92, 0.14, 1.32], materials.uniform, [-0.20,  1.98, 0], [1,1,1], [0,0,-0.02]));
  root.add(box("uniform_trim_blanket",     [2.04, 0.08, 1.46], materials.trim,    [-0.20,  1.90, 0], [1,1,1], [0,0,-0.02]));
  root.add(box("tack_saddle",              [1.34, 0.20, 0.94], materials.tack,    [-0.22,  2.16, 0], [1,1,1], [0,0,-0.02]));
  root.add(box("tack_girth",               [0.18, 1.04, 1.52], materials.tack,    [-0.05,  1.18, 0], [1,1,1], [0,0,-0.02]));
  root.add(box("uniform_side_panel_left",  [1.16, 0.62, 0.08], materials.uniform, [-0.28,  1.36,  0.73], [1,1,1], [0,0,-0.04]));
  root.add(box("uniform_side_panel_right", [1.16, 0.62, 0.08], materials.uniform, [-0.28,  1.36, -0.73], [1,1,1], [0,0,-0.04]));

  // Bridle
  root.add(box("tack_noseband",        [0.04, 0.18, 0.72], materials.tack, [2.90, 1.70,  0], [1,1,1], [0, 0,  0.10]));
  root.add(box("tack_crownpiece",      [0.18, 0.06, 0.80], materials.tack, [2.62, 2.04,  0], [1,1,1], [0, 0,  0.15]));
  root.add(box("tack_cheekpiece_left", [0.06, 0.54, 0.04], materials.tack, [2.76, 1.84,  0.38], [1,1,1], [0, 0, 0.18]));
  root.add(box("tack_cheekpiece_right",[0.06, 0.54, 0.04], materials.tack, [2.76, 1.84, -0.38], [1,1,1], [0, 0, 0.18]));

  root.add(box("tack_rein_left",  [1.95, 0.04, 0.035], materials.tack, [1.32, 2.00,  0.20], [1,1,1], [0, 0, -0.25]));
  root.add(box("tack_rein_right", [1.95, 0.04, 0.035], materials.tack, [1.32, 2.00, -0.20], [1,1,1], [0, 0, -0.25]));

  // ── RIDER ──────────────────────────────────────────────────────────────────
  // Thighs over saddle
  root.add(capsule("rider_thigh_left",  0.16, 0.50, materials.uniform, [-0.40, 2.24,  0.50], [ 0.18, 0, 0.84]));
  root.add(capsule("rider_thigh_right", 0.16, 0.50, materials.uniform, [-0.40, 2.24, -0.50], [-0.18, 0, 0.84]));

  // Torso + body (named pose_* for animation hooks)
  root.add(capsule("pose_torso", 0.42, 0.90, materials.uniform, [-0.10, 2.48, 0], [0, 0, -0.08]));
  root.add(box("pose_chest_stripe", [0.16, 0.84, 0.58], materials.trim, [0.04, 2.50, 0], [1,1,1], [0, 0, -0.10]));

  // Shoulders
  root.add(sphere("pose_shoulder_left",  0.22, materials.uniform, [0.12, 2.84,  0.48], [1, 0.85, 0.85]));
  root.add(sphere("pose_shoulder_right", 0.22, materials.uniform, [0.12, 2.84, -0.48], [1, 0.85, 0.85]));

  // Head & helmet (all named pose_* for upper-body lean animation)
  root.add(sphere("pose_head",   0.31, materials.skin,    [0.10, 3.14,  0]));
  root.add(sphere("pose_helmet", 0.38, materials.uniform, [0.10, 3.28,  0], [1, 0.58, 1]));
  root.add(box("pose_helmet_brim",  [0.58, 0.05, 0.50], materials.tack, [0.36, 3.22, 0], [1,1,1], [0, 0, -0.06]));
  root.add(sphere("pose_helmet_peak", 0.22, materials.uniform, [0.44, 3.30, 0], [0.58, 0.40, 0.72]));

  // Arms (named pose_arm_* for arm swing animation)
  root.add(cylinder("pose_arm_left",  0.07, 0.10, 0.82, materials.uniform, [0.22, 2.54,  0.38], [ 0.36, 0, Math.PI / 2.65]));
  root.add(cylinder("pose_arm_right", 0.07, 0.10, 0.82, materials.uniform, [0.22, 2.54, -0.38], [-0.36, 0, Math.PI / 2.65]));
  root.add(cylinder("pose_forearm_left",  0.062, 0.072, 0.56, materials.skin, [1.24, 2.10,  0.46], [ 0.20, 0, -Math.PI / 3.2]));
  root.add(cylinder("pose_forearm_right", 0.062, 0.072, 0.56, materials.skin, [1.24, 2.10, -0.46], [-0.20, 0, -Math.PI / 3.2]));
  root.add(box("pose_hand_left",  [0.14, 0.10, 0.12], materials.tack, [1.56, 1.96,  0.38]));
  root.add(box("pose_hand_right", [0.14, 0.10, 0.12], materials.tack, [1.56, 1.96, -0.38]));

  // Boots
  root.add(cylinder("rider_boot_left",  0.10, 0.12, 0.84, materials.tack, [-0.28, 1.86,  0.44], [0, 0, -0.10]));
  root.add(cylinder("rider_boot_right", 0.10, 0.12, 0.84, materials.tack, [-0.28, 1.86, -0.44], [0, 0, -0.10]));
  root.add(box("rider_boot_toe_left",  [0.26, 0.12, 0.24], materials.tack, [-0.04, 1.48,  0.44]));
  root.add(box("rider_boot_toe_right", [0.26, 0.12, 0.24], materials.tack, [-0.04, 1.48, -0.44]));

  return root;
}

function createSerkeAsset() {
  const root = new THREE.Group();
  root.name = "kokpar_serke";

  // Body — rounder, more goat-like silhouette
  root.add(sphere("serke_body",      0.92, materials.serkeHide, [0,     0.10, 0], [1.60, 0.58, 0.88]));
  root.add(sphere("serke_body_rear", 0.72, materials.serkeHide, [-0.62, 0.06, 0], [1.10, 0.62, 0.82]));
  root.add(sphere("serke_belly_mark",0.52, materials.serkeMark, [-0.04, 0.40, 0], [1.52, 0.18, 0.74]));

  // Neck
  root.add(capsule("serke_neck", 0.20, 0.28, materials.serkeHide, [0.82, 0.30, -0.02], [0, 0, -0.50]));

  // Head + snout
  root.add(sphere("serke_head",  0.40, materials.serkeDark, [1.18,  0.12, -0.04], [1.16, 0.86, 0.82]));
  root.add(sphere("serke_snout", 0.22, materials.serkeDark, [1.52,  0.00, -0.02], [1.10, 0.72, 0.74]));

  // Horns
  root.add(box("serke_horn_left",  [0.06, 0.30, 0.06], materials.serkeHorn, [1.10,  0.52,  0.20], [1,1,1], [ 0, 0, -0.40]));
  root.add(box("serke_horn_right", [0.06, 0.30, 0.06], materials.serkeHorn, [1.10,  0.52, -0.20], [1,1,1], [ 0, 0, -0.40]));

  // Ears
  root.add(box("serke_ear_left",  [0.06, 0.22, 0.08], materials.serkeDark, [0.96,  0.46,  0.40], [1,1,1], [ 0.22, 0, 0.60]));
  root.add(box("serke_ear_right", [0.06, 0.22, 0.08], materials.serkeDark, [0.96,  0.46, -0.40], [1,1,1], [-0.22, 0, 0.60]));

  // Strap ring + ribbon
  root.add(cylinder("serke_strap_ring", 0.04, 0.04, 1.62, materials.uniform, [0.12, 0.02, 0], [Math.PI / 2, 0, 0]));
  root.add(box("serke_uniform_ribbon",  [0.12, 0.68, 0.09], materials.uniform, [-0.28, -0.50, 0.44], [1,1,1], [-0.22, 0, 0]));

  // Legs — 4 pairs, each with a small hoof
  for (const [x, z, rx, rz] of [
    [-0.54, -0.36,  0.22, 0.54],
    [-0.54,  0.36, -0.22, 0.54],
    [ 0.54, -0.36,  0.22,-0.54],
    [ 0.54,  0.36, -0.22,-0.54]
  ]) {
    root.add(cylinder("serke_leg",  0.05, 0.08, 0.50, materials.serkeDark, [x, -0.38, z], [rx, 0, rz]));
    root.add(box("serke_hoof", [0.10, 0.08, 0.14], materials.serkeDark, [x + (x > 0 ? 0.06 : -0.06), -0.68, z]));
  }

  // Tail
  root.add(cylinder("serke_tail", 0.05, 0.09, 0.80, materials.serkeDark, [-1.18, -0.04, 0.18], [0, 0, 1.22]));

  return root;
}

async function writeGlb(object, outputPath) {
  object.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(object, { binary: true, includeCustomExtensions: false, onlyVisible: true, trs: false });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(glb));
  console.log(`Wrote ${outputPath.replace(`${ROOT}/`, "")}`);
}

await writeGlb(createRiderHorseAsset(), resolve(ROOT, "public/models/horses/kokpar-rider-horse.glb"));
await writeGlb(createSerkeAsset(),      resolve(ROOT, "public/models/serke/serke.glb"));
