import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const HORSE_GLB_PATH = "/models/horse_1.glb";
const gltfLoader = new GLTFLoader();
let cachedGltf = null;

function loadHorse() {
  if (!cachedGltf) cachedGltf = gltfLoader.loadAsync(HORSE_GLB_PATH);
  return cachedGltf;
}

function cloneClip(src) {
  // Deep-clone so we can strip tracks without mutating the cached original
  return THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(src));
}

function stripRootMotion(clip) {
  // Remove XZ translation on root nodes so the horse stays centered during the animation
  clip.tracks = clip.tracks.filter((track) => {
    const isRoot =
      /^(Align|RootNode|Root|Object_2)\./.test(track.name);
    return !(isRoot && track.name.endsWith(".position"));
  });
  return clip;
}

export function HorseViewer3D() {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 152;
    const h = container.clientHeight || 220;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, w / h, 0.05, 50);
    camera.position.set(2.6, 1.7, 1.5);
    camera.lookAt(0, 1.1, 0.2);

    scene.add(new THREE.AmbientLight(0xfff5e0, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 6, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8deff, 0.7);
    fill.position.set(-3, 2, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8c0, 0.5);
    rim.position.set(0, 3, -4);
    scene.add(rim);

    const clock = new THREE.Clock();
    let mixer = null;
    let rafId;
    let alive = true;

    loadHorse().then((gltf) => {
      if (!alive) return;

      const model = cloneSkeleton(gltf.scene);
      model.scale.setScalar(0.01);
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.set(-center.x, -box.min.y, -center.z);

      scene.add(model);

      if (gltf.animations.length > 0) {
        const clip = stripRootMotion(cloneClip(gltf.animations[0]));
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
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="horse-portrait horse-portrait-3d"
      aria-hidden="true"
      style={{ minHeight: 220, position: "relative" }}
    >
      {loading && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "rgba(80,50,20,0.5)",
            pointerEvents: "none"
          }}
        >
          загрузка...
        </span>
      )}
    </div>
  );
}
