// 3D WORLD MENU — WASD + mouse look (pointer lock), clickable pylons that zoom/fly & open panels.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/* ============= Scene / Camera / Renderer ============= */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0c1218, 14, 60);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 6); // human height

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias:true, alpha:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

/* ============= Lights ============= */
const hemi = new THREE.HemisphereLight(0x88ccff, 0x223344, 0.7);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5,10,5);
scene.add(dir);

/* ============= Ground / Grid ============= */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x0d141b, roughness: 1 })
);
ground.rotation.x = -Math.PI/2;
ground.position.y = 0;
scene.add(ground);

const grid = new THREE.GridHelper(200, 200, 0x1e2a35, 0x1e2a35);
grid.position.y = 0.01;
scene.add(grid);

/* ============= Stars ============= */
function makeStars(count=1200, spread=150){
  const pos = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    pos[i*3+0]=(Math.random()-0.5)*spread;
    pos[i*3+1]=Math.random()*spread*0.5 + 10; // above
    pos[i*3+2]=(Math.random()-0.5)*spread;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({ size:0.04, color:0xffffff, transparent:true, opacity:0.9 });
  const pts=new THREE.Points(geo,mat);
  pts.position.y = 0;
  return pts;
}
const stars = makeStars();
scene.add(stars);

/* ============= Mouse-reactive “hero” cube ============= */
function gradientTexture() {
  const size=256, c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d'), g=ctx.createLinearGradient(0,0,size,size);
  g.addColorStop(0,'#00ffd5'); g.addColorStop(0.5,'#7a5cff'); g.addColorStop(1,'#ff72e1');
  ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
  return new THREE.CanvasTexture(c);
}
const hero = new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({ map: gradientTexture(), roughness:.35, metalness:.2, emissive:0x111111 })
);
hero.position.set(0, 1.2, 0);
scene.add(hero);

let mouse = new THREE.Vector2(), tRot = new THREE.Vector2();
addEventListener('mousemove', (e)=>{
  mouse.x=(e.clientX/innerWidth)*2-1;
  mouse.y=-(e.clientY/innerHeight)*2+1;
  tRot.x = mouse.y * 0.4;
  tRot.y = mouse.x * 0.6;
});

/* ============= Pylons (in-world menu) ============= */
const pylons = [];
const MENU = [
  { id:'work',    label:'WORK',    pos:new THREE.Vector3(-6, 0, -6), color:0x00ffd5 },
  { id:'about',   label:'ABOUT',   pos:new THREE.Vector3(  0, 0, -10), color:0x7a5cff },
  { id:'contact', label:'CONTACT', pos:new THREE.Vector3(  6, 0, -6), color:0xff72e1 }
];

function makeLabelTexture(text, color='#e8eef3'){
  const p=24, pad=16; // font px size
  const font = `700 ${p}px Inter, Arial, sans-serif`;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad*2;
  const h = p + pad*2;
  ctx.canvas.width = w; ctx.canvas.height = h;
  ctx.font = font; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(12,18,24,.6)'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.strokeRect(0.5,0.5,w-1,h-1);
  ctx.fillStyle=color; ctx.fillText(text, pad, h/2 + 1);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makePylon(item){
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 2.2, 16),
    new THREE.MeshStandardMaterial({ color:0x0f1820, metalness:0.2, roughness:0.8, emissive:item.color, emissiveIntensity:0.08 })
  );
  shaft.position.copy(item.pos).add(new THREE.Vector3(0, 1.1, 0));

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 24),
    new THREE.MeshStandardMaterial({ color:item.color, emissive:item.color, emissiveIntensity:0.4 })
  );
  cap.position.copy(item.pos).add(new THREE.Vector3(0, 2.0, 0));

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.9),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture(item.label), transparent:true })
  );
  label.position.copy(item.pos).add(new THREE.Vector3(0, 1.6, 0));
  label.lookAt(camera.position);

  const group = new THREE.Group();
  group.userData.menuId = item.id;
  group.add(shaft, cap, label);
  scene.add(group);
  pylons.push(group);
}
MENU.forEach(makePylon);

/* ============= Pointer Lock Controls (WASD fly/walk) ============= */
const controls = new PointerLockControls(camera, document.body);
let velocity = new THREE.Vector3(), direction = new THREE.Vector3();
const speed = 6.0;

const keys = { w:false, a:false, s:false, d:false };
addEventListener('keydown', (e)=>{ if(keys[e.key.toLowerCase()]!==undefined){ keys[e.key.toLowerCase()]=true; }});
addEventListener('keyup',   (e)=>{ if(keys[e.key.toLowerCase()]!==undefined){ keys[e.key.toLowerCase()]=false; }});

document.getElementById('enter').addEventListener('click', ()=>{
  controls.lock();
});
controls.addEventListener('lock', ()=>{
  document.querySelector('.hint').textContent = 'Click a pylon to open a panel • Esc to release cursor';
});
controls.addEventListener('unlock', ()=>{
  document.querySelector('.hint').textContent = 'W/A/S/D to move • Mouse to look • Click pylons';
});

/* ============= Raycasting: click pylons to fly + open panel ============= */
const raycaster = new THREE.Raycaster();
addEventListener('click', (e)=>{
  if(!controls.isLocked) return; // only when pointer-locked
  raycaster.setFromCamera(new THREE.Vector2(0,0), camera); // center of screen
  const intersects = raycaster.intersectObjects(pylons, true);
  if(intersects.length){
    const group = intersects[0].object.parent; // label or cap belongs to group
    const id = group.userData.menuId;
    // Fly towards pylon and open panel
    flyTo(group.position.clone().add(new THREE.Vector3(0, 1.2, 2.8)), () => openPanel(id));
  }
});

/* ============= Fly-to (camera lerp) ============= */
let flyActive = false;
function flyTo(targetPos, onDone){
  flyActive = true;
  controls.unlock(); // disable free-look during auto-fly
  const start = camera.position.clone();
  const startLook = new THREE.Vector3().copy(start).add(controls.getDirection(new THREE.Vector3()).multiplyScalar(5));
  const end = targetPos.clone();
  const lookAt = targetPos.clone().add(new THREE.Vector3(0,-0.6,-4));
  const dur = 1.2;
  let t0 = performance.now();
  function step(){
    const t = Math.min(1, (performance.now()-t0)/(dur*1000));
    const ease = t<0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOutQuad
    camera.position.lerpVectors(start, end, ease);
    camera.lookAt(new THREE.Vector3().lerpVectors(startLook, lookAt, ease));
    if(t<1){ requestAnimationFrame(step); }
    else { flyActive=false; if(onDone) onDone(); }
  }
  requestAnimationFrame(step);
}

/* ============= Panels open/close ============= */
function openPanel(which){
  document.querySelectorAll('.panel').forEach(p=>p.setAttribute('aria-hidden','true'));
  document.getElementById(`panel-${which}`).setAttribute('aria-hidden','false');
}
document.querySelectorAll('.close').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    document.getElementById(btn.dataset.close).setAttribute('aria-hidden','true');
    controls.lock(); // resume walk after closing
  });
});

/* ============= Resize ============= */
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============= Animate Loop ============= */
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);

  // “hero” cube motion
  hero.rotation.x += 0.01;
  hero.rotation.y += 0.012;
  hero.rotation.x += (tRot.x - hero.rotation.x)*0.08;
  hero.rotation.y += (tRot.y - hero.rotation.y)*0.08;

  // star drift
  stars.rotation.y += 0.001;

  // player movement (disabled during flyTo)
  if(controls.isLocked && !flyActive){
    const delta = clock.getDelta();
    direction.set(0,0,0);
    direction.z = (keys.w? -1 : 0) + (keys.s? 1 : 0);
    direction.x = (keys.a? -1 : 0) + (keys.d? 1 : 0);
    direction.normalize();

    // simple acceleration / damping
    velocity.x += direction.x * speed * delta;
    velocity.z += direction.z * speed * delta;

    velocity.multiplyScalar(0.92); // damping

    controls.moveRight( velocity.x * delta );
    controls.moveForward( velocity.z * delta );
  }

  renderer.render(scene, camera);
}
animate();