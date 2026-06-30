import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { coatPresetById } from "../game/horseTypes.js";

const HORSE_GLB_PATH = "/models/horse_arabian.glb";
const gltfLoader = new GLTFLoader();
let cachedGltf = null;

function loadHorse() {
  if (!cachedGltf) cachedGltf = gltfLoader.loadAsync(HORSE_GLB_PATH);
  return cachedGltf;
}

function cloneClip(src) {
  return THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(src));
}

function stripRootMotion(clip) {
  clip.tracks = clip.tracks.filter((track) => {
    const isRoot = /^(Align|RootNode|Root|Object_2|Pelvis_01)\./.test(track.name);
    return !(isRoot && track.name.endsWith(".position"));
  });
  return clip;
}

function pickViewerClip(animations) {
  return (
    animations.find((a) => a.name.includes("Walk Forward")) ??
    animations.find((a) => a.name.includes("Idle")) ??
    animations[0]
  );
}

function applyCoatToModel(model, coatId) {
  const preset = coatPresetById(coatId);
  const coatColor = new THREE.Color(preset.coat);
  const darkColor = new THREE.Color(preset.dark);

  model.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    const name = (node.name + " " + (node.material?.name ?? "")).toLowerCase();
    const isDark = name.includes("hair") || name.includes("mane") || name.includes("tail") || name.includes("hoof") || name.includes("leg");
    const target = isDark ? darkColor : coatColor;

    if (Array.isArray(node.material)) {
      node.material.forEach((m) => {
        if (m?.color) { m.color.copy(target); m.needsUpdate = true; }
      });
    } else if (node.material?.color) {
      node.material.color.copy(target);
      node.material.needsUpdate = true;
    }
  });
}

export function HorseViewer3D({ coatId, style }) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 480;
    const h = container.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1c1208);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none;";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.05, 50);
    camera.position.set(3.2, 1.6, -2.0);
    camera.lookAt(0, 1.0, 0);

    scene.add(new THREE.AmbientLight(0xffd8a0, 3.5));

    const key = new THREE.DirectionalLight(0xfff0c8, 9.0);
    key.position.set(4, 7, -4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.002;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x90b8e8, 2.5);
    fill.position.set(-5, 2, 2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffaa40, 3.0);
    rim.position.set(-1, 5, 6);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const orbit = { azimuth: -0.62, elevation: 0.28, dist: 4.5, targetY: 1.0 };

    function applyOrbit() {
      const x = orbit.dist * Math.cos(orbit.elevation) * Math.sin(orbit.azimuth);
      const y = orbit.dist * Math.sin(orbit.elevation) + orbit.targetY;
      const z = orbit.dist * Math.cos(orbit.elevation) * Math.cos(orbit.azimuth);
      camera.position.set(x, y, z);
      camera.lookAt(0, orbit.targetY, 0);
    }

    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e) {
      e.currentTarget.setPointerCapture(e.pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
    }

    function onPointerMove(e) {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbit.azimuth -= dx * 0.008;
      orbit.elevation = Math.max(-0.15, Math.min(Math.PI / 2.2, orbit.elevation - dy * 0.006));
      applyOrbit();
    }

    function onPointerUp(e) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      renderer.domElement.style.cursor = "grab";
    }

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    const clock = new THREE.Clock();
    let mixer = null;
    let rafId;
    let alive = true;

    loadHorse().then((gltf) => {
      if (!alive) return;

      const model = cloneSkeleton(gltf.scene);
      model.scale.setScalar(1);
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      model.position.set(-center.x, -box.min.y, -center.z);

      model.traverse((node) => {
        if (node.isMesh || node.isSkinnedMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material = Array.isArray(node.material)
              ? node.material.map((m) => m.clone())
              : node.material.clone();
          }
        }
      });

      scene.add(model);
      modelRef.current = model;

      applyCoatToModel(model, coatId ?? "bay");

      const horseHeight = size.y;
      const fovRad = camera.fov * (Math.PI / 180);
      const dist = (horseHeight / 0.85) / (2 * Math.tan(fovRad / 2));

      orbit.dist = dist * 1.05;
      orbit.targetY = horseHeight * 0.48;
      orbit.azimuth = -0.62;
      orbit.elevation = Math.atan2(horseHeight * 0.52, dist * 0.9);
      applyOrbit();

      if (gltf.animations.length > 0) {
        const clip = stripRootMotion(cloneClip(pickViewerClip(gltf.animations)));
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(clip).play();
      }

      setLoading(false);
    }).catch(console.error);

    function tick() {
      rafId = requestAnimationFrame(tick);
      mixer?.update(clock.getDelta());
      renderer.render(scene, camera);
    }
    tick();

    return () => {
      alive = false;
      modelRef.current = null;
      cancelAnimationFrame(rafId);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      if (container.contains(el)) container.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (modelRef.current) {
      applyCoatToModel(modelRef.current, coatId ?? "bay");
    }
  }, [coatId]);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative", ...style }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,210,130,0.5)", fontSize: 12, pointerEvents: "none"
        }}>
          загрузка...
        </div>
      )}
    </div>
  );
}
