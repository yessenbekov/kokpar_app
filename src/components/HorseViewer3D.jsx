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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1c1208);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.05, 50);
    // Start with a reasonable position; will be adjusted after model loads
    camera.position.set(3.2, 1.6, -2.0);
    camera.lookAt(0, 1.0, 0);

    // Bright warm ambient — no fog so the horse is fully visible
    scene.add(new THREE.AmbientLight(0xffd8a0, 3.5));

    // Key light: strong, front-right-top, warm
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

    // Cool fill from left
    const fill = new THREE.DirectionalLight(0x90b8e8, 2.5);
    fill.position.set(-5, 2, 2);
    scene.add(fill);

    // Warm rim from behind (separates horse from background)
    const rim = new THREE.DirectionalLight(0xffaa40, 3.0);
    rim.position.set(-1, 5, 6);
    scene.add(rim);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const clock = new THREE.Clock();
    let mixer = null;
    let rafId;
    let alive = true;

    loadHorse().then((gltf) => {
      if (!alive) return;

      const model = cloneSkeleton(gltf.scene);
      model.scale.setScalar(0.01);
      model.updateMatrixWorld(true);

      // Center horizontally, place hooves on ground
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
        }
      });

      scene.add(model);

      // Reframe camera to properly fit the horse (size is already in world units after scale)
      const horseHeight = size.y;
      const horseDepth  = size.z;
      const fovRad = camera.fov * (Math.PI / 180);
      // Distance to see horseHeight at 85% of frame height
      const dist = (horseHeight / 0.85) / (2 * Math.tan(fovRad / 2));
      // 3/4 front-right view; horse faces -Z (nose at -horseDepth/2)
      camera.position.set(dist * 0.55, horseHeight * 0.52, -(horseDepth * 0.5 + dist * 0.72));
      camera.lookAt(0, horseHeight * 0.48, 0);

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
