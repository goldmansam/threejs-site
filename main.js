// Import Three via import map, GLTFLoader via direct URL
import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';

/* =========================
   Scene / Camera / Renderer
========================= */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* Lights */
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);
const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambLight);

/* Utility: gradient texture with Canvas2D (no external assets) */
function makeGradientTexture() {
  const size = 256;
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d');
  const g = ctx.createLinearGradient(0,0,size,size);
  g.addColorStop(0, '#00ffd5');
  g.addColorStop(0.5, '#7a5cff');
  g.addColorStop(1, '#ff72e1');
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  return tex;
}

/* Hero cube (mouse-reactive) */
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({ map: makeGradientTexture(), roughness:.35, metalness:.2 })
);
scene.add(cube);

/* Stars background */
function makeStars(count=1500, spread=60){
  const pos = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    pos[i*3+0]=(Math.random()-0.5)*spread;
    pos[i*3+1]=(Math.random()-0.5)*spread;
    pos[i*3+2]=(Math.random()-0.5)*spread;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({ size:0.04, color:0xffffff });
  return new THREE.Points(geo,mat);
}
const stars = makeStars();
scene.add(stars);

/* Optional model (shows when scrolled a bit) */
let astronaut=null;
new GLTFLoader().load(
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  (gltf)=>{
    astronaut=gltf.scene;
    astronaut.scale.set(1.2,1.2,1.2);
    astronaut.position.set(0,-0.3,-1.5);
    astronaut.rotation.y=Math.PI*0.25;
    astronaut.visible=false;
    scene.add(astronaut);
  },
  undefined,
  (err)=>console.warn('Astronaut failed to load, continuing.',err)
);

/* =========================
   Interactivity
========================= */
/* Mouse → smooth target rotation */
const mouse=new THREE.Vector2(0,0);
const targetRot=new THREE.Vector2(0,0);
window.addEventListener('mousemove',(e)=>{
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  targetRot.x=mouse.y*0.5;
  targetRot.y=mouse.x*0.8;
});

/* Smooth zoom (wheel + buttons) */
let targetZoom = 3;                // desired camera z
const Z_MIN = 1.6, Z_MAX = 8;      // clamp range
const Z_STEP = 0.6;                // button step

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

window.addEventListener('wheel', (e)=>{
  // deltaY: positive = scroll down (zoom out), negative = up (zoom in)
  targetZoom = clamp(targetZoom + Math.sign(e.deltaY) * 0.5, Z_MIN, Z_MAX);
});

document.getElementById('zoomIn').addEventListener('click', ()=>{
  targetZoom = clamp(targetZoom - Z_STEP, Z_MIN, Z_MAX);
});
document.getElementById('zoomOut').addEventListener('click', ()=>{
  targetZoom = clamp(targetZoom + Z_STEP, Z_MIN, Z_MAX);
});

/* Scroll parallax (separate from zoom) */
function onScroll(){
  const y=window.scrollY||0;
  // Parallax stars
  stars.position.y = -y*0.002;
  stars.position.z =  y*0.004;
  if(astronaut){
    astronaut.visible = y>150;
    astronaut.rotation.y += 0.003;
  }
}
window.addEventListener('scroll', onScroll);

/* Panels open/close */
function openPanel(id){
  const el = document.getElementById(`panel-${id}`);
  if(!el) return;
  el.setAttribute('aria-hidden','false');
}
function closePanel(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.setAttribute('aria-hidden','true');
}
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const which = btn.dataset.panel;
    // Close others first
    document.querySelectorAll('.panel').forEach(p=>p.setAttribute('aria-hidden','true'));
    openPanel(which);
  });
});
document.querySelectorAll('.close').forEach(btn=>{
  btn.addEventListener('click', ()=> closePanel(btn.dataset.close));
});

/* Resize */
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================
   Render Loop
========================= */
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);

  // camera zoom easing
  camera.position.z += (targetZoom - camera.position.z) * 0.12;

  // cube motion: auto + towards mouse
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.012;
  cube.rotation.x += (targetRot.x - cube.rotation.x) * 0.08;
  cube.rotation.y += (targetRot.y - cube.rotation.y) * 0.08;

  // stars slow drift
  const t=clock.getElapsedTime();
  stars.rotation.y = t * 0.02;

  renderer.render(scene, camera);
}
animate();