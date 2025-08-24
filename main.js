// Import Three.js and GLTFLoader as ES modules
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';

/* ------------------------------
   Scene, Camera, Renderer
------------------------------ */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
  antialias: true,
  alpha: true, // allows CSS gradient background to show
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* ------------------------------
   Lights
------------------------------ */
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambLight);

/* ------------------------------
   Procedural Gradient Texture
------------------------------ */
function makeGradientTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0,   '#00ffd5');
  grad.addColorStop(0.5, '#7a5cff');
  grad.addColorStop(1,   '#ff72e1');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------
   Hero Cube (mouse-reactive)
------------------------------ */
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({
    map: makeGradientTexture(),
    roughness: 0.35,
    metalness: 0.2,
  })
);
scene.add(cube);

// Mouse → smooth target rotation
const mouse = new THREE.Vector2(0, 0);
const targetRot = new THREE.Vector2(0, 0);

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  targetRot.x = mouse.y * 0.5;
  targetRot.y = mouse.x * 0.8;
});

/* ------------------------------
   Starfield (background)
------------------------------ */
function makeStars(count = 1500, spread = 60) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 0.04, color: 0xffffff });
  return new THREE.Points(geo, mat);
}
const stars = makeStars();
scene.add(stars);

/* ------------------------------
   Optional: Astronaut Model
------------------------------ */
let astronaut = null;
const loader = new GLTFLoader();
loader.load(
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  (gltf) => {
    astronaut = gltf.scene;
    astronaut.scale.set(1.2, 1.2, 1.2);
    astronaut.position.set(0, -0.3, -1.5);
    astronaut.rotation.y = Math.PI * 0.25;
    astronaut.visible = false; // appears on scroll
    scene.add(astronaut);
  },
  undefined,
  (err) => {
    console.warn('Astronaut model failed to load, continuing without it.', err);
  }
);

/* ------------------------------
   Scroll Parallax
------------------------------ */
function onScroll() {
  const y = window.scrollY || 0;
  camera.position.z = 3 + y * 0.005;
  stars.position.y = -y * 0.002;
  stars.position.z =  y * 0.004;

  if (astronaut) {
    astronaut.visible = y > 150;
    astronaut.rotation.y += 0.003;
  }
}
window.addEventListener('scroll', onScroll);

/* ------------------------------
   Resize Handling
------------------------------ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------
   Animation Loop
------------------------------ */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  // Auto rotation
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.012;

  // Ease towards mouse-driven target
  cube.rotation.x += (targetRot.x - cube.rotation.x) * 0.08;
  cube.rotation.y += (targetRot.y - cube.rotation.y) * 0.08;

  // Stars drift
  const t = clock.getElapsedTime();
  stars.rotation.y = t * 0.02;

  renderer.render(scene, camera);
}
animate();