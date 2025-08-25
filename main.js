// No assets needed: procedural backgrounds, CSS-only thumbs, and a small canvas pixel pulse.

(() => {
  const chapters = [...document.querySelectorAll(".chapter")];
  const progressEls = chapters.map(s => s.querySelector(".progress"));
  const parallaxEls = [...document.querySelectorAll(".parallax")];

  // Reveal on scroll
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach(e => e.isIntersecting && e.target.classList.add("in"));
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach(el => revObs.observe(el));

  // Section progress
  const vh = () => window.innerHeight || document.documentElement.clientHeight;
  function updateProgress() {
    const h = vh();
    chapters.forEach((sec, i) => {
      const r = sec.getBoundingClientRect();
      const total = r.height + h;
      const seen = Math.min(Math.max(h - r.top, 0), total);
      const pct = Math.round((seen / total) * 100);
      progressEls[i].textContent = `You’ve discovered ${pct}% of this chapter`;
    });
  }

  // Parallax
  function updateParallax() {
    const h = vh();
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.speed || "0.1");
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) {
        const t = (h/2 - (r.top + r.height/2));
        el.style.transform = `translateY(${t * speed}px) scale(1.02)`;
      }
    });
  }

  // CSS-only thumbs: randomize angle/hue offsets at runtime (no images)
  document.querySelectorAll(".thumb").forEach((t, i) => {
    const baseHue = Number(t.dataset.hue || 190);
    const hue = (baseHue + (i * 23)) % 360;
    const angle = Math.floor(Math.random() * 360);
    t.style.setProperty("--h", hue);
    t.style.setProperty("--a", `${angle}deg`);
  });

  // Minimal audio: create a tiny oscillator loop so there's no file
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  let ctx, osc, gain;
  if (playBtn) {
    playBtn.addEventListener("click", async () => {
      if (!ctx) {
        const ACtx = window.AudioContext || window.webkitAudioContext;
        ctx = new ACtx();
        osc = ctx.createOscillator(); gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = 220; // A3
        gain.gain.value = 0.02;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start();
      }
      if (ctx.state === "suspended") await ctx.resume();
      else await ctx.suspend();
      playBtn.textContent = (ctx.state === "running") ? "Pause" : "Play";
    });
  }

  // Pixelation FX on hero — generated gradient + downsample/upscale
  const fx = document.getElementById("fx");
  const secIntro = document.getElementById("intro");
  const ctx2d = fx.getContext("2d", { alpha: false });
  let W=0, H=0, DPR=1;
  let pixelSize = 1, pixelTarget = 1;
  const pixelMin = 1, pixelMax = 24;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = secIntro.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width * DPR));
    H = Math.max(1, Math.floor(r.height * DPR));
    fx.width = W; fx.height = H;
    fx.style.width = r.width + "px";
    fx.style.height = r.height + "px";
  }

  function drawFx() {
    ctx2d.imageSmoothingEnabled = false;
    // Make a tiny procedural tile
    const off = document.createElement("canvas");
    const ow = Math.max(2, Math.floor(W / 2)), oh = Math.max(2, Math.floor(H / 2));
    off.width = ow; off.height = oh;
    const oc = off.getContext("2d", { alpha: false });

    // Gradient base
    const g = oc.createLinearGradient(0, 0, ow, oh);
    g.addColorStop(0, "#0b0b0c"); g.addColorStop(1, "#101216");
    oc.fillStyle = g; oc.fillRect(0, 0, ow, oh);

    // Soft dots
    for (let i=0;i<40;i++){
      oc.globalAlpha = 0.02 + Math.random()*0.05;
      oc.beginPath();
      const x = Math.random()*ow, y = Math.random()*oh, r = 8 + Math.random()*30;
      oc.fillStyle = "rgb(220,240,255)";
      oc.arc(x,y,r,0,Math.PI*2); oc.fill();
    }

    // Pixelation step (downsample then upscale)
    const chunk = Math.max(1, Math.floor(pixelSize));
    const dw = Math.max(1, Math.floor(W / chunk));
    const dh = Math.max(1, Math.floor(H / chunk));
    ctx2d.clearRect(0,0,W,H);
    ctx2d.drawImage(off, 0, 0, ow, oh, 0, 0, dw, dh);

    const data = ctx2d.getImageData(0,0,dw,dh);
    const tmp = document.createElement("canvas");
    tmp.width = dw; tmp.height = dh;
    tmp.getContext("2d").putImageData(data, 0, 0);
    ctx2d.drawImage(tmp, 0, 0, dw, dh, 0, 0, W, H);

    requestAnimationFrame(drawFx);
  }

  function pixelBlast() {
    let t = 0, up = true;
    (function step(){
      if (up) { t += 0.1; pixelTarget = lerp(pixelMin, pixelMax, Math.min(t,1)); if (t>=1) up=false; }
      else    { t -= 0.08; pixelTarget = lerp(pixelMin, pixelMax, Math.max(t,0)); if (t>0){} else pixelTarget=pixelMin; }
      if (up || t>0) requestAnimationFrame(step);
    })();
  }
  const lerp = (a,b,t)=>a+(b-a)*t;

  function animate() {
    pixelSize += (pixelTarget - pixelSize) * 0.15;
    updateProgress(); updateParallax();
    requestAnimationFrame(animate);
  }

  // Events
  window.addEventListener("scroll", () => { updateProgress(); updateParallax(); }, { passive:true });
  window.addEventListener("resize", () => { resize(); updateProgress(); updateParallax(); });
  document.getElementById("intro").addEventListener("pointerdown", pixelBlast);
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p") pixelTarget = (pixelTarget === pixelMin) ? 10 : pixelMin;
  });

  // Init
  resize(); updateProgress(); updateParallax();
  drawFx(); animate();
})();