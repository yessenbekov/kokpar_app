// Арена v2 — Көкпар. Drop-in модуль: копировать в src/game/arenaV2.js БЕЗ изменений.
// Единственная точка входа: createArenaV2(scene, renderer, { preset, isMobile }).
import * as THREE from "three";
import { COLORS, GOAL_RADIUS, WORLD } from "./constants.js";

const W = WORLD.width, H = WORLD.height;
export const GOAL_X = W / 2 - 18;
export const FENCE_X = W / 2 + 14;
export const SOUTH_Z = -H / 2 - 5.2;
export const NORTH_Z = H / 2 + 21;
const GOLD = "#f0c347";

// Цвета в sRGB-hex. НЕ вызывать convertSRGBToLinear — three.js делает это сам (ColorManagement).
export const LIGHT_PRESETS = {
  golden: { skyTop: "#5f8fc4", skyHorizon: "#e8c08c", sunColor: "#ffc978", sunIntensity: 3.6, sunPos: [-150, 70, -70], hemiSky: "#ffe2b0", hemiGround: "#8c8a5a", hemiIntensity: 1.4, fogColor: "#e8c08c", fogNear: 260, fogFar: 680, exposure: 1.0, mountain: "#9a8aa0" },
  noon:   { skyTop: "#3f7fd0", skyHorizon: "#cfe0ec", sunColor: "#fff4dc", sunIntensity: 3.4, sunPos: [-70, 160, -50], hemiSky: "#e8f0ff", hemiGround: "#9a9a62", hemiIntensity: 1.6, fogColor: "#d6e0e4", fogNear: 260, fogFar: 680, exposure: 0.95, mountain: "#7d8aa8" },
};

let seed = 7;
const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sr = (a, b) => a + srand() * (b - a);

function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
function blotches(ctx, w, h, n, colors, rMin, rMax, aMin, aMax) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = sr(aMin, aMax); ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.ellipse(sr(0, w), sr(0, h), sr(rMin, rMax), sr(rMin, rMax) * sr(.4, 1), sr(0, 3.14), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export const MATERIALS = {
  wood: new THREE.MeshStandardMaterial({ name: "wood", color: "#6b4426", roughness: .8 }),
  woodDark: new THREE.MeshStandardMaterial({ name: "woodDark", color: "#3d2819", roughness: .85 }),
  gold: new THREE.MeshStandardMaterial({ name: "gold", color: GOLD, roughness: .35, metalness: .6 }),
  felt: new THREE.MeshStandardMaterial({ name: "felt", color: "#efe4cc", roughness: .95 }),
  stone: new THREE.MeshStandardMaterial({ name: "stone", color: "#e8dcc0", roughness: .9 }),
  standWood: new THREE.MeshStandardMaterial({ name: "standWood", color: "#8a6440", roughness: .9 }),
  red: new THREE.MeshStandardMaterial({ name: "yurtRed", color: COLORS.red, roughness: .6 }),
};
const M = MATERIALS;

/* ---------------- sky + light ---------------- */
export function createArenaSky(scene) {
  const uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: "varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform vec3 top,horizon,sunDir,sunCol;varying vec3 vP;void main(){float h=clamp(vP.y,0.,1.);vec3 c=mix(horizon,top,pow(h,.55));float s=max(dot(vP,normalize(sunDir)),0.);c+=sunCol*(pow(s,600.)*1.2+pow(s,24.)*.18);if(vP.y<0.)c=horizon;gl_FragColor=vec4(min(c,vec3(1.)),1.);\n#include <colorspace_fragment>\n}"
  }));
  sky.name = "sky"; sky.frustumCulled = false; sky.renderOrder = -1;
  scene.add(sky);
  return { sky, uniforms };
}

export function createArenaLights(scene, { isMobile = false } = {}) {
  const hemi = new THREE.HemisphereLight("#ffffff", "#ffffff", 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffffff", 1);
  sun.castShadow = true;
  const size = isMobile ? 2048 : 4096; sun.shadow.mapSize.set(size, size);
  Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 10, far: 600 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);
  return { hemi, sun };
}

/* ---------------- ground ---------------- */
export function createArenaGround(scene) {
  seed = 7;
  const grassTex = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = "#a59c58"; c.fillRect(0, 0, w, h);
    blotches(c, w, h, 900, ["#8f8a48", "#b8ad66", "#9a9a52", "#c2b070"], 3, 26, .15, .4);
    c.strokeStyle = "#7a7a3c"; c.globalAlpha = .35;
    for (let i = 0; i < 1400; i++) { const x = sr(0, w), y = sr(0, h); c.beginPath(); c.moveTo(x, y); c.lineTo(x + sr(-2, 2), y - sr(3, 7)); c.stroke(); }
  }, 60);
  const steppe = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({ name: "steppe", map: grassTex, roughness: 1 }));
  steppe.rotation.x = -Math.PI / 2; steppe.receiveShadow = true; steppe.name = "steppe"; scene.add(steppe);

  const apronW = FENCE_X * 2 + 6, apronD = NORTH_Z - SOUTH_Z + 6;
  const apronTex = canvasTexture(1024, Math.round(1024 * apronD / apronW), (c, w, h) => {
    c.fillStyle = "#b98f58"; c.fillRect(0, 0, w, h);
    blotches(c, w, h, 1600, ["#a77d48", "#c9a068", "#9c7444"], 4, 40, .08, .22);
  });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(apronW, apronD), new THREE.MeshStandardMaterial({ name: "apron", map: apronTex, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2; apron.position.set(0, 0.02, (SOUTH_Z + NORTH_Z) / 2); apron.receiveShadow = true; apron.name = "apron"; scene.add(apron);

  const FW = 2048, FH = Math.round(2048 * H / W), S = FW / W;
  const px = x => (x + W / 2) * S, pz = z => (z + H / 2) * S;
  const R = GOAL_RADIUS;
  const fieldTex = canvasTexture(FW, FH, (c, w, h) => {
    c.fillStyle = "#d6ab69"; c.fillRect(0, 0, w, h);
    blotches(c, w, h, 5200, ["#c99a58", "#e3bd80", "#bd8d4f", "#d9b47a"], 6, 110, .05, .16);
    for (const [x, z, r, a] of [[0, 0, 36, .28], [-GOAL_X, 0, R * 3.2, .22], [GOAL_X, 0, R * 3.2, .22], [0, -14.5, 10, .16]]) {
      const g = c.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r * S);
      g.addColorStop(0, `rgba(140,92,44,${a})`); g.addColorStop(1, "rgba(140,92,44,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    c.fillStyle = "rgba(23,109,159,.07)"; c.fillRect(0, 0, w / 2, h);
    c.fillStyle = "rgba(187,60,49,.07)"; c.fillRect(w / 2, 0, w / 2, h);
    c.lineCap = "round";
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = srand() > .5 ? "rgba(112,74,36,.22)" : "rgba(240,214,160,.25)";
      c.lineWidth = sr(2, 5); c.setLineDash([sr(2, 5), sr(8, 16)]);
      const x0 = sr(0, w), y0 = sr(0, h);
      c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0 + sr(-500, 500), y0 + sr(-300, 300), x0 + sr(-500, 500), y0 + sr(-300, 300), x0 + sr(-700, 700), y0 + sr(-400, 400)); c.stroke();
    }
    c.setLineDash([]);
    c.save(); c.translate(px(0), pz(0)); c.strokeStyle = "rgba(122,78,34,.32)"; c.lineWidth = 0.9 * S;
    for (let k = 0; k < 4; k++) {
      c.rotate(Math.PI / 2);
      for (const sx of [-1, 1]) {
        c.beginPath(); c.moveTo(0, -1.4 * S);
        c.bezierCurveTo(sx * 1 * S, -4 * S, sx * 4.6 * S, -4.4 * S, sx * 4.4 * S, -2.2 * S);
        c.bezierCurveTo(sx * 4.2 * S, -.6 * S, sx * 2.4 * S, -.8 * S, sx * 2.6 * S, -2 * S); c.stroke();
      }
    }
    c.restore();
    c.strokeStyle = "rgba(250,238,205,.9)"; c.lineWidth = .32 * S;
    const lw = .32 * S / 2;
    c.strokeRect(lw + 6, lw + 6, w - lw * 2 - 12, h - lw * 2 - 12);
    c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w / 2, h - 6); c.stroke();
    c.beginPath(); c.arc(px(0), pz(0), 8.5 * S, 0, 7); c.stroke();
    c.fillStyle = "rgba(250,238,205,.9)"; c.beginPath(); c.arc(px(0), pz(0), .8 * S, 0, 7); c.fill();
    for (const [x, col] of [[-GOAL_X, COLORS.blue], [GOAL_X, COLORS.red]]) {
      c.setLineDash([1.2 * S, .9 * S]); c.strokeStyle = "rgba(250,238,205,.85)";
      c.beginPath(); c.arc(px(x), pz(0), (R + 3) * S, 0, 7); c.stroke(); c.setLineDash([]);
      c.strokeStyle = col; c.globalAlpha = .55; c.lineWidth = .5 * S;
      c.beginPath(); c.arc(px(x), pz(0), (R + 4) * S, 0, 7); c.stroke(); c.globalAlpha = 1; c.lineWidth = .32 * S;
    }
    c.strokeStyle = "#4fd7c8"; c.globalAlpha = .9; c.lineWidth = .24 * S;
    c.beginPath(); c.arc(px(0), pz(-14.5), 3.2 * S, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(px(-2.55), pz(-14.5)); c.lineTo(px(2.55), pz(-14.5)); c.moveTo(px(0), pz(-17.05)); c.lineTo(px(0), pz(-11.95)); c.stroke();
    c.globalAlpha = 1;
    const e = c.createLinearGradient(0, 0, 0, h);
    e.addColorStop(0, "rgba(150,104,56,.25)"); e.addColorStop(.06, "rgba(150,104,56,0)"); e.addColorStop(.94, "rgba(150,104,56,0)"); e.addColorStop(1, "rgba(150,104,56,.25)");
    c.fillStyle = e; c.fillRect(0, 0, w, h);
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ name: "field", map: fieldTex, roughness: .96 }));
  field.rotation.x = -Math.PI / 2; field.position.y = 0.04; field.receiveShadow = true; field.name = "field"; scene.add(field);

  seed = 11;
  const n = 900, tm = new THREE.InstancedMesh(new THREE.ConeGeometry(.22, 1, 5), new THREE.MeshStandardMaterial({ name: "tuft", color: "#7c8a46", roughness: 1 }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    let x, z;
    do { x = sr(-200, 200); z = sr(-150, 160); }
    while (Math.abs(x) < FENCE_X + 1 && z > SOUTH_Z - 1 && z < NORTH_Z + 1 || Math.abs(z - (NORTH_Z + 7)) < 6 && Math.abs(x) < 62 || Math.abs(z - (SOUTH_Z - 7)) < 6 && Math.abs(x) < 62);
    const s = sr(.6, 1.5); m.compose(new THREE.Vector3(x, .5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); tm.setMatrixAt(i, m);
  }
  tm.castShadow = true; tm.name = "tufts"; scene.add(tm);
}

/* ---------------- fence ---------------- */
export function createArenaFence(scene) {
  const fence = new THREE.Group(); fence.name = "fence";
  function rail(x1, z1, x2, z2) {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    for (const y of [.62, 1.22]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, .2, .22), M.wood);
      r.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); r.rotation.y = -ang; r.castShadow = true; fence.add(r);
    }
    const n = Math.round(len / 4);
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = new THREE.Mesh(new THREE.CylinderGeometry(.14, .18, 1.6, 7), M.woodDark);
      p.position.set(x1 + (x2 - x1) * t, .8, z1 + (z2 - z1) * t); p.castShadow = true; fence.add(p);
    }
  }
  rail(-FENCE_X, SOUTH_Z, FENCE_X, SOUTH_Z); rail(FENCE_X, SOUTH_Z, FENCE_X, NORTH_Z); rail(FENCE_X, NORTH_Z, -FENCE_X, NORTH_Z); rail(-FENCE_X, NORTH_Z, -FENCE_X, SOUTH_Z);
  for (const [x, z] of [[-FENCE_X, SOUTH_Z], [FENCE_X, SOUTH_Z], [FENCE_X, NORTH_Z], [-FENCE_X, NORTH_Z]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, 3.4, 8), M.woodDark); p.position.set(x, 1.7, z); p.castShadow = true; fence.add(p);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(.55), M.gold); cap.position.set(x, 3.75, z); cap.castShadow = true; fence.add(cap);
  }
  scene.add(fence);
}

/* ---------------- ad boards ---------------- */
function boardTex(segs) {
  return canvasTexture(2048, 128, (c, w, h) => {
    const tot = segs.reduce((s, x) => s + x[3], 0); let x = 0;
    for (const [label, bg, fg, flex] of segs) {
      const sw = Math.round(flex / tot * w);
      c.fillStyle = bg; c.fillRect(x, 0, sw, h);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.28)");
      c.fillStyle = g; c.fillRect(x, 0, sw, h);
      c.fillStyle = fg; c.font = "900 64px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, x + sw / 2, h / 2 + 4);
      if (x) { c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x, 0, 3, h); }
      x += sw;
    }
    c.fillStyle = GOLD; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 5, w, 5);
  });
}
export function createAdBoards(scene) {
  const SP = { qt: ["QAZAQ TELECOM", "#1668b8", "#fff", 1.5], bg: ["BAIGE", "#f6f4ee", "#1a1008", 1], tl: ["TULPAR", "#c02020", "#fff8ec", 1], ad: ["ALTYN DALA", "#0f8a4c", "#fff", 1.1], ko: ["KOKPAR.ONLINE", "#1a1005", GOLD, 1.3] };
  const boards = new THREE.Group(); boards.name = "adBoards";
  for (const b of [
    { segs: [SP.qt, SP.bg, SP.ko, SP.tl, SP.ad], len: FENCE_X * 2 - 6, pos: [0, SOUTH_Z + 1.2], ry: 0 },
    // стартовая (северная) сторона без щитов — оттуда выезжают всадники. Щиты стоят у забора, между полем и щитами ~5 м (юг) и ~13 м (бока) для выхода в аут
    { segs: [SP.qt, SP.ko, SP.ad], len: H * .9, pos: [-FENCE_X + 1.2, 0], ry: Math.PI / 2 },
    { segs: [SP.tl, SP.ko, SP.bg], len: H * .9, pos: [FENCE_X - 1.2, 0], ry: -Math.PI / 2 },
  ]) {
    const g = new THREE.Group(); g.position.set(b.pos[0], .95, b.pos[1]); g.rotation.y = b.ry;
    const tilt = new THREE.Group(); tilt.rotation.x = -.16; g.add(tilt);
    const back = new THREE.Mesh(new THREE.BoxGeometry(b.len + .2, 1.5, .14), M.woodDark); back.position.z = -.08; back.castShadow = true; tilt.add(back);
    const map = boardTex(b.segs);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(b.len, 1.4), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: .12, roughness: .55 }));
    face.position.z = .001; tilt.add(face);
    boards.add(g);
  }
  scene.add(boards);
}

/* ---------------- stands ---------------- */
function kzFlagTexture() {
  return canvasTexture(256, 128, (c, w, h) => {
    c.fillStyle = "#00a9c7"; c.fillRect(0, 0, w, h); c.fillStyle = "#f2c84b";
    c.beginPath(); c.arc(w * .55, h * .42, h * .16, 0, 7); c.fill();
    c.strokeStyle = "#f2c84b"; c.lineWidth = 3;
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; c.beginPath(); c.moveTo(w * .55 + Math.cos(a) * h * .2, h * .42 + Math.sin(a) * h * .2); c.lineTo(w * .55 + Math.cos(a) * h * .28, h * .42 + Math.sin(a) * h * .28); c.stroke(); }
    c.fillRect(w * .1, h * .1, 6, h * .8);
  });
}
export function createStands(scene, { isMobile = false } = {}) {
  seed = 7;
  const awningTex = canvasTexture(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? "#efe4cc" : "#b8442f"; c.fillRect(i * 32, 0, 32, h); } });
  awningTex.wrapS = THREE.RepeatWrapping; awningTex.repeat.set(5, 1);
  const kzFlag = kzFlagTexture();
  const crowdCols = ["#26384a", "#7d3029", "#ded1a8", "#2e5f62", "#b9852f", "#5a3a6a", "#e9e0cc", "#176d9f", "#bb3c31", "#3f5f2a"].map(c => new THREE.Color(c));
  const skinCols = ["#c99a6e", "#a8774f", "#e0b48a", "#8d6040"].map(c => new THREE.Color(c));
  const per = isMobile ? 90 : 132;
  for (const [zEdge, dir] of [[NORTH_Z + 3, 1], [SOUTH_Z - 3, -1]]) {
    const g = new THREE.Group(); g.name = dir > 0 ? "standNorth" : "standSouth";
    const L = 116, rows = 7, step = 1.15, rise = .62;
    for (let r = 0; r < rows; r++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(L, rise * (r + 1), step), M.standWood);
      s.position.set(0, rise * (r + 1) / 2, zEdge + dir * (r * step + step / 2)); s.castShadow = s.receiveShadow = true; g.add(s);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(L, rise * rows + 2.6, .4), M.standWood);
    back.position.set(0, (rise * rows + 2.6) / 2, zEdge + dir * (rows * step + .2)); back.castShadow = true; g.add(back);
    const count = per * rows;
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(.55, .8, .4), new THREE.MeshStandardMaterial({ roughness: .95 }), count);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshStandardMaterial({ roughness: .9 }), count);
    bodies.name = "crowd"; heads.name = "crowdHeads"; bodies.castShadow = true;
    const m = new THREE.Matrix4(); let k = 0;
    for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
      if (srand() < .1) { m.makeScale(0, 0, 0); bodies.setMatrixAt(k, m); heads.setMatrixAt(k, m); bodies.setColorAt(k, crowdCols[0]); heads.setColorAt(k, skinCols[0]); k++; continue; }
      const x = -L / 2 + 1 + i * (L - 2) / per + sr(-.15, .15), y = rise * (r + 1), z = zEdge + dir * (r * step + step * .55);
      const hh = sr(.9, 1.1);
      m.compose(new THREE.Vector3(x, y + .4 * hh, z), new THREE.Quaternion(), new THREE.Vector3(1, hh, 1)); bodies.setMatrixAt(k, m);
      m.makeTranslation(x, y + .8 * hh + .2, z); heads.setMatrixAt(k, m);
      bodies.setColorAt(k, crowdCols[Math.floor(srand() * crowdCols.length)]); heads.setColorAt(k, skinCols[Math.floor(srand() * skinCols.length)]); k++;
    }
    g.add(bodies, heads);
    const depth = rows * step + 1.4, topY = rise * rows + 5.2;
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, depth + 1.5), new THREE.MeshStandardMaterial({ name: "awning", map: awningTex, roughness: .9, side: THREE.DoubleSide }));
    roof.rotation.x = -Math.PI / 2 + dir * -.14; roof.position.set(0, topY - .5, zEdge + dir * depth / 2); roof.castShadow = true; g.add(roof);
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, .9), new THREE.MeshStandardMaterial({ map: awningTex, roughness: .9, side: THREE.DoubleSide }));
    valance.position.set(0, topY - 1.65, zEdge - dir * .7); g.add(valance);
    for (let i = 0; i <= 8; i++) {
      const x = -L / 2 - 1 + i * (L + 2) / 8;
      for (const zz of [zEdge - dir * .6, zEdge + dir * (rows * step + .5)]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, topY, 8), M.woodDark); p.position.set(x, topY / 2, zz); p.castShadow = true; g.add(p);
      }
      if (i % 2 === 0) {
        const fp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, 3.4, 6), M.woodDark); fp.position.set(x, topY + 1.2, zEdge + dir * (rows * step + .5)); g.add(fp);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1, 8, 1), new THREE.MeshStandardMaterial({ map: kzFlag, roughness: .6, side: THREE.DoubleSide }));
        f.position.set(x + 1.1, topY + 2.3, zEdge + dir * (rows * step + .5)); f.userData.wave = true; g.add(f);
      }
    }
    scene.add(g);
  }
}

/* ---------------- scoreboard (drop-in replacement for createStadiumScoreboardMesh) ---------------- */
export function createScoreboardV2(scene) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 384;
  const ctx = c.getContext("2d");
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  let lastKey = "";
  function update({ blue = 0, red = 0, timer = "00:00", status = "" } = {}) {
    const key = `${blue}|${red}|${timer}|${status}`; if (key === lastKey) return; lastKey = key;
    const w = c.width, h = c.height;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#2a1a08"); g.addColorStop(1, "#140c03"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 10; ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.textAlign = "center"; ctx.fillStyle = "#f7ecd0"; ctx.font = "700 44px Oswald, Arial"; ctx.fillText("КӨКПАР", w / 2, 82);
    ctx.font = "700 132px Oswald, Arial"; ctx.fillStyle = "#6fc0f0"; ctx.fillText(String(blue), w * .23, 262); ctx.fillStyle = "#ff8b7c"; ctx.fillText(String(red), w * .77, 262);
    ctx.fillStyle = GOLD; ctx.font = "700 64px Oswald, Arial"; ctx.fillText(timer, w / 2, 210);
    ctx.fillStyle = "rgba(242,226,184,.7)"; ctx.font = "600 26px Manrope, Arial"; ctx.fillText(status ? status.toUpperCase() : "kokpar.online", w / 2, 300);
    texture.needsUpdate = true;
  }
  update({});
  const group = new THREE.Group(); group.name = "scoreboard";
  const fr = new THREE.Mesh(new THREE.BoxGeometry(27, 10, .6), M.woodDark); fr.castShadow = true; group.add(fr);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(25.2, 8.4), new THREE.MeshBasicMaterial({ map: texture })); sc.position.z = .31; group.add(sc);
  for (const x of [-9.5, 9.5]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.6, 13, .6), M.woodDark); l.position.set(x, -11, 0); l.castShadow = true; group.add(l); }
  group.position.set(0, 17.5, NORTH_Z + 18); group.rotation.y = Math.PI; scene.add(group);
  return { group, update };
}

/* ---------------- yurts + mountains ---------------- */
export function createYurts(scene) {
  for (const [x, z, s, ry] of [[-108, -18, 1.1, 1.4], [-112, 4, 1, 1.7], [-104, 22, .9, 1.2], [104, -30, 1, -1.6], [110, -8, 1.15, -1.4], [-60, -86, 1, 0], [-46, -92, .85, .3], [70, -88, 1.05, -.2]]) {
    const g = new THREE.Group(); g.name = "yurt";
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2.4, 32), M.felt); wall.position.y = 1.2; wall.castShadow = wall.receiveShadow = true; g.add(wall);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(3.43, 3.43, .35, 32, 1, true), M.red); band.position.y = 2.1; g.add(band);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.2, 32), M.felt); roof.position.y = 3.5; roof.castShadow = true; g.add(roof);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(.7, .14, 8, 24), M.woodDark); sh.rotation.x = Math.PI / 2; sh.position.y = 4.35; g.add(sh);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), M.red); door.position.set(0, .9, 3.41); g.add(door);
    g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g);
  }
}
export function createMountains(scene) {
  const mtn = new THREE.MeshStandardMaterial({ name: "mountain", color: "#9a8aa0", roughness: 1, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ name: "snow", color: "#f4efe6", roughness: .9, flatShading: true });
  const hills = new THREE.MeshStandardMaterial({ name: "hills", color: "#a29c5e", roughness: 1 });
  seed = 42;
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * .95 + (i / 46) * Math.PI * 1.9 + sr(-.04, .04) - Math.PI / 2;
    const r = sr(380, 470), h = sr(55, 125) * (1 - Math.abs(Math.sin(a)) * .15), rad = sr(55, 95);
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7, 1), mtn); m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); m.rotation.y = sr(0, 3); m.name = "mountain"; scene.add(m);
    if (h > 80) { const sc = new THREE.Mesh(new THREE.ConeGeometry(rad * .3, h * .3, 7, 1), snow); sc.position.set(m.position.x, h - 4 - h * .15 + .2, m.position.z); sc.rotation.y = m.rotation.y; scene.add(sc); }
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + sr(-.1, .1), r = sr(250, 320), h = sr(5, 11);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 5, 0, 6.283, 0, Math.PI / 2), hills); m.scale.set(sr(70, 110), h, sr(35, 55));
    m.position.set(Math.cos(a) * r, -1, Math.sin(a) * r); m.rotation.y = -a; m.receiveShadow = true; scene.add(m);
  }
  return mtn;
}

/* ---------------- dust ---------------- */
export function createDust(scene, { isMobile = false } = {}) {
  const n = isMobile ? 300 : 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * 160 - 80; pos[i * 3 + 1] = .2 + Math.random() * 6.8; pos[i * 3 + 2] = Math.random() * 115 - 55; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = canvasTexture(64, 64, (c, w) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,240,210,1)"); g.addColorStop(1, "rgba(255,240,210,0)"); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .55, map: dot, transparent: true, opacity: .45, depthWrite: false, color: "#f4d9a8" }));
  pts.name = "dust"; scene.add(pts);
  return (dt, t) => {
    for (let i = 0; i < n; i++) { pos[i * 3] += dt * (1.2 + Math.sin(i) * .4); pos[i * 3 + 1] += Math.sin(t + i) * dt * .15; if (pos[i * 3] > 80) pos[i * 3] = -80; }
    geo.attributes.position.needsUpdate = true;
  };
}

/* ---------------- goals (replace createGroundGoalMesh / createKazanGoalMesh) ---------------- */
// Позиция и радиус — из игры (GOAL_RADIUS). Возвращают Group с центром в (0,0,0). sign: -1 синие (слева), +1 красные — флаги смотрят от центра поля.
export function createRingGoalMeshV2(color, sign = 1) {
  const g = new THREE.Group(); g.name = "ringGoal"; const R = GOAL_RADIUS;
  const team = new THREE.MeshStandardMaterial({ color, roughness: .6 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R - .3, 64), new THREE.MeshStandardMaterial({ color: "#ead7a8", roughness: 1 })); disc.rotation.x = -Math.PI / 2; disc.position.y = .06; disc.receiveShadow = true; g.add(disc);
  const inner = new THREE.Mesh(new THREE.RingGeometry(R - 1.2, R - .9, 64), new THREE.MeshStandardMaterial({ color, roughness: .8, transparent: true, opacity: .45 })); inner.rotation.x = -Math.PI / 2; inner.position.y = .07; g.add(inner);
  const kerb = new THREE.Mesh(new THREE.TorusGeometry(R, .28, 10, 96), team); kerb.rotation.x = Math.PI / 2; kerb.position.y = .2; kerb.castShadow = true; g.add(kerb);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(R, .06, 6, 96), M.felt); rope.rotation.x = Math.PI / 2; rope.position.y = .85; g.add(rope);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 1, 6), i % 4 ? M.woodDark : M.gold);
    p.position.set(Math.cos(a) * R, .5, Math.sin(a) * R); p.castShadow = true; g.add(p);
  }
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 6, 8), M.woodDark); pole.position.set(0, 3, s * (R + .6)); pole.castShadow = true; g.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2, 8, 1), new THREE.MeshStandardMaterial({ color, roughness: .6, side: THREE.DoubleSide }));
    fl.position.set(sign * 1.2, 5.3, s * (R + .6)); fl.castShadow = true; fl.userData.wave = true; g.add(fl);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.28), M.gold); tip.position.set(0, 6.15, s * (R + .6)); g.add(tip);
  }
  return g;
}
export function createKazanGoalMeshV2(color, sign = 1) {
  const g = new THREE.Group(); g.name = "kazanGoal"; const k = GOAL_RADIUS / 8;
  const team = new THREE.MeshStandardMaterial({ color, roughness: .6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6.4 * k, 7 * k, 1.1, 48), M.stone); base.position.y = .55; base.castShadow = base.receiveShadow = true; g.add(base);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(6.45 * k, 6.45 * k, .35, 48, 1, true), team); band.position.y = .75; g.add(band);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.3 * k, .9 * k, 16, 64), team); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1 + .9 * k * .2; ring.castShadow = true; g.add(ring);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(5.3 * k, .16, 8, 64), M.gold); trim.rotation.x = Math.PI / 2; trim.position.y = 1.1 + .9 * k + .05; g.add(trim);
  const pit = new THREE.Mesh(new THREE.CircleGeometry(4.5 * k, 48), new THREE.MeshStandardMaterial({ color: "#5a3c20", roughness: 1 })); pit.rotation.x = -Math.PI / 2; pit.position.y = 1.12; g.add(pit);
  for (const s of [-1, 1]) {
    const z = s * 7.6 * k;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 7, 8), M.woodDark); pole.position.set(0, 3.5, z); pole.castShadow = true; g.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3, 8, 1), new THREE.MeshStandardMaterial({ color, roughness: .6, side: THREE.DoubleSide }));
    fl.position.set(sign * 1.3, 6.2, z); fl.castShadow = true; fl.userData.wave = true; g.add(fl);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.3), M.gold); tip.position.set(0, 7.15, z); g.add(tip);
  }
  return g;
}

/* ---------------- flags ---------------- */
function createFlagWaver(scene) {
  let flags = [];
  const collect = () => { flags = []; scene.traverse(o => { if (o.userData.wave) { if (!o.userData.base) o.userData.base = o.geometry.attributes.position.array.slice(); flags.push(o); } }); };
  collect();
  return { collect, update: t => {
    for (const f of flags) {
      const a = f.geometry.attributes.position, b = f.userData.base;
      for (let i = 0; i < a.count; i++) { const x = b[i * 3]; a.array[i * 3 + 2] = Math.sin(t * 4 + x * 2.2) * .12 * (x + 1.3); }
      a.needsUpdate = true;
    }
  } };
}

/* ---------------- entry point ---------------- */
export function createArenaV2(scene, renderer, { preset = "golden", isMobile = false } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  scene.background = null;
  const { uniforms } = createArenaSky(scene);
  const { hemi, sun } = createArenaLights(scene, { isMobile });
  createArenaGround(scene);
  createArenaFence(scene);
  createAdBoards(scene);
  createStands(scene, { isMobile });
  const scoreboard = createScoreboardV2(scene);
  createYurts(scene);
  const mountainMat = createMountains(scene);
  const updateDust = createDust(scene, { isMobile });
  const waver = createFlagWaver(scene);

  function setPreset(name) {
    const p = LIGHT_PRESETS[name] ?? LIGHT_PRESETS.golden;
    uniforms.top.value.set(p.skyTop); uniforms.horizon.value.set(p.skyHorizon); uniforms.sunCol.value.set(p.sunColor); uniforms.sunDir.value.set(...p.sunPos).normalize();
    sun.color.set(p.sunColor); sun.intensity = p.sunIntensity; sun.position.set(...p.sunPos); sun.target.position.set(0, 0, 0);
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiIntensity;
    scene.fog = new THREE.Fog(p.fogColor, p.fogNear, p.fogFar);
    renderer.toneMappingExposure = p.exposure; mountainMat.color.set(p.mountain);
  }
  setPreset(preset);

  return {
    scoreboard, sun, setPreset,
    refreshFlags: waver.collect, // вызвать после добавления ворот в сцену
    update(dt, t) { updateDust(dt, t); waver.update(t); },
  };
}
