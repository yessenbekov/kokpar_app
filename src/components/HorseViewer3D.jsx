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
  return THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(src));
}

function stripRootMotion(clip) {
  clip.tracks = clip.tracks.filter((track) => {
    const isRoot = /^(Align|RootNode|Root|Object_2)\./.test(track.name);
    return !(isRoot && track.name.endsWith(".position"));
  });
  return clip;
}

export function HorseViewer3D({ style }) {
  const mountRef = useRef(null);
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x110b04);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x110b04, 0.28);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.05, 50);
    // 3/4 front-right view: horse faces -Z, nose at Z≈-1.2, tail at Z≈+1.2
    camera.position.set(2.2, 1.7, -2.0);
    camera.lookAt(0.1, 1.05, 0);

    // Ground plane for shadow
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1108, roughness: 1.0, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Key light (upper front-right, warm)
    const key = new THREE.DirectionalLight(0xfff0d0, 3.5);
    key.position.set(5, 8, -4);
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

    // Fill light (cool, left)
    const fill = new THREE.DirectionalLight(0x8ab4e8, 0.9);
    fill.position.set(-4, 3, 2);
    scene.add(fill);

    // Rim light (back glow)
    const rim = new THREE.DirectionalLight(0xffcc66, 0.6);
    rim.position.set(-1, 4, 6);
    scene.add(rim);

    // Ambient
    scene.add(new THREE.AmbientLight(0x503020, 1.2));

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

      model.traverse((node) => {
        if (node.isMesh || node.isSkinnedMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

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
    <div ref={mountRef} style={{ width: "100%", height: "100%", ...style }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,220,130,0.45)", fontSize: 12, pointerEvents: "none"
        }}>
          загрузка...
        </div>
      )}
    </div>
  );
}
