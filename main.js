/* Year */
document.getElementById('year').textContent = new Date().getFullYear();

/* Parallax + pinned scene animation WITHOUT libraries */
const lerp = (a,b,t)=> a+(b-a)*t;

/* Track scroll progress across the document */
function onScroll(){
  const y = window.scrollY;
  // Subtle vertical drift for depth
  document.querySelectorAll('.silhouettes').forEach(el=>{
    el.style.transform = `translateY(${y * 0.06}px)`;
  });
  document.querySelectorAll('.trunks').forEach(el=>{
    el.style.transform = `translateY(${y * 0.12}px)`;
  });
  document.querySelectorAll('.foreground').forEach(el=>{
    el.style.transform = `translateY(${y * 0.18}px)`;
  });
  document.querySelectorAll('.rays').forEach(el=>{
    el.style.transform = `translateY(${y * 0.04}px)`;
  });
}
window.addEventListener('scroll', onScroll, {passive:true});
onScroll();

/* Pin scene micro-animations (doors settle in, exposure lift) */
const pin = document.querySelector('.pin');
const clearingHills = document.querySelector('.clearing-hills');
const skyBright = document.querySelector('.sky--bright');
const doors = document.querySelector('.doors');

let last = 0;
function tick(t){
  const dt = (t - last) * 0.001; last = t;

  // Gentle breathing for the clearing hills (scale + y)
  const breathe = Math.sin(t * 0.0009) * 0.01;
  clearingHills.style.transform = `translateY(${Math.sin(t*0.0006)*6}px) scale(${1+breathe})`;

  // Idle float on doors
  const bob = Math.sin(t * 0.002) * 4;
  doors.style.transform = `translateY(${12 + bob}px)`;

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* Mouse-driven tilt on doors for fun */
const pinWrap = document.querySelector('.pin-wrap');
pinWrap.addEventListener('mousemove', (e)=>{
  const r = pinWrap.getBoundingClientRect();
  const rx = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
  const ry = (e.clientY - r.top) / r.height - 0.5;
  document.querySelectorAll('.door').forEach(d=>{
    d.style.transform = `translateY(-6px) rotateY(${rx*6}deg) rotateX(${ -ry*4 }deg)`;
  });
});
pinWrap.addEventListener('mouseleave', ()=>{
  document.querySelectorAll('.door').forEach(d=>{
    d.style.transform = '';
  });
});

/* Open/close panels */
function openPanel(id, doorBtn){
  const p = document.getElementById(id);
  p.classList.add('active');
  doorBtn?.setAttribute('aria-expanded','true');
  // focus close btn
  const close = p.querySelector('[data-close]');
  close && close.focus();
}
function closePanel(p){
  p.classList.remove('active');
  const id = p.id;
  // restore aria-expanded on the owning door
  document.querySelectorAll('.door').forEach(btn=>{
    if(btn.getAttribute('aria-controls') === id) btn.setAttribute('aria-expanded','false');
  });
}

document.querySelectorAll('.door').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    openPanel(btn.getAttribute('aria-controls'), btn);
  });
});
document.querySelectorAll('[data-close]').forEach(b=>{
  b.addEventListener('click', ()=> closePanel(b.closest('.panel')));
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    document.querySelectorAll('.panel.active').forEach(p=> closePanel(p));
  }
});

/* Intersection polish: brighten clearing as it enters view */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    const k = entry.isIntersecting ? 1 : 0;
    // lift exposure via opacity of a CSS overlay trick (use filter on .pin)
    pin.style.filter = `brightness(${lerp(0.95, 1.08, k)}) contrast(${lerp(1.0,1.06,k)})`;
  });
}, {threshold: 0.3});
io.observe(document.getElementById('clearing'));