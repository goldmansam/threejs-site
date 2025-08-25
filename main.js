// Inspired-by “chaptered garden” UX: section progress, parallax, reveals, and a subtle pixelation pulse.
// Keep assets in /assets (hero.jpg, work.jpg, about.jpg, contact.jpg, thumbs, demo.mp3).

(() => {
  const chapters = [...document.querySelectorAll(".chapter")];
  const progressEls = chapters.map(s => s.querySelector(".progress"));
  const parallaxEls = [...document.querySelectorAll(".parallax")];

  // Reveal on scroll
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add("in");
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach(el => revObs.observe(el));

  // Section progress (“You’ve discovered X%”)
  // We approximate per-section progress by how much of it has crossed the viewport
  const winH = () => window.innerHeight || document.documentElement.clientHeight;
  function updateProgress() {
    const vh = winH();
    chapters.forEach((sec, i) => {
      const rect = sec.getBoundingClientRect();
      const total = rect.height + vh;    // how much travel from top enters to bottom leaves
      const seen = Math.min(Math.max(vh - rect.top, 0), total);
      const pct = Math.round((seen / total) * 100);
      if (progressEls[i]) progressEls[i].textContent = `You’ve discovered ${pct}% of this chapter`;
    });
  }

  // Parallax backgrounds
  function updateParallax() {
    const vh = winH();
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.speed || "0.1");
      const r = el.parentElement.getBoundingClientRect();
      // move only when in view
      if (r.bottom > 0 && r.top < vh) {
        const t = (vh/2 - (r.top + r.height/2));
        el.style.transform = `translateY(${t * speed}px) scale(1.02)`;
      }
    });
  }

  // Minimal audio player
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  if (audio && playBtn) {
    playBtn.addEventListener("click", () => {
      if (audio.paused) { audio.play(); playBtn.textContent = "Pause"; }
      else { audio.pause(); playBtn.textContent = "Play"; }
    });
  }

  // Pixelation FX canvas over the hero
  const fx = document.getElementById("fx");
  const secIntro = document.getElementById("intro");
  const ctx = fx.getContext("2d", { alpha: false });
  let W=0, H=0, DPR=1;
  let pixelSize = 1, pixelTarget = 1;
  const pixelMin = 1, pixelMax = 24;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = secIntro.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * DPR));
    const h = Math.max(1, Math.floor(rect.height * DPR));
    W = w; H = h;
    fx.width = W; fx.height = H;
    fx.style.width = rect.width + "px";
    fx.style.height = rect.height + "px";
  }

  function drawFx() {
    // Render a simple grainy gradient as the “source”, then downscale-upscale for pixelation
    ctx.imageSmoothingEnabled = false;

    // Compose gradient tile
    const off = document.createElement("canvas");
    off.width = Math.max(2, Math.floor(W / 2));
    off.height = Math.max(2, Math.floor(H / 2));
    const oc = off.getContext("2d", { alpha: false });

    const g = oc.createLinearGradient(0, 0, off.width, off.height);
    g.addColorStop(0, "#0b0b0c");
    g.addColorStop(1, "#101216");
    oc.fillStyle = g;
    oc.fillRect(0, 0, off.width, off.height);

    // light bloom dots
    for (let i=0; i<40; i++) {
      const x = Math.random() * off.width;
      const y = Math.random() * off.height;
      const r = 8 + Math.random() * 30;
      const a = 0.02 + Math.random() * 0.05;
      oc.fillStyle = `rgba(220,240,255,${a})`;
      oc.beginPath(); oc.arc(x,y,r,0,Math.PI*2); oc.fill();
    }

    // Pixelation step
    const chunk = Math.max(1, Math.floor(pixelSize));
    const dw = Math.max(1, Math.floor(W / chunk));
    const dh = Math.max(1, Math.floor(H / chunk));
    // draw to fx with pixelation
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, dw, dh);
    // scale up to cover
    // draw fx canvas onto itself (cheeky but fine)
    const data = ctx.getImageData(0,0,dw,dh);
    ctx.clearRect(0,0,W,H);
    // put the low-res data onto a temp then scale
    const tmp = document.createElement("canvas");
    tmp.width = dw; tmp.height = dh;
    tmp.getContext("2d").putImageData(data, 0, 0);
    ctx.drawImage(tmp, 0, 0, dw, dh, 0, 0, W, H);

    requestAnimationFrame(drawFx);
  }

  function pixelBlast() {
    let t = 0, up = true;
    function step() {
      if (up) {
        t += 0.1;
        pixelTarget = lerp(pixelMin, pixelMax, Math.min(t, 1));
        if (t >= 1) up = false;
        requestAnimationFrame(step);
      } else {
        t -= 0.08;
        pixelTarget = lerp(pixelMin, pixelMax, Math.max(t, 0));
        if (t > 0) requestAnimationFrame(step);
        else pixelTarget = pixelMin;
      }
    }
    step();
  }

  const lerp = (a,b,t)=>a+(b-a)*t;
  function animate() {
    // Ease pixel size
    pixelSize += (pixelTarget - pixelSize) * 0.15;

    updateProgress();
    updateParallax();
    requestAnimationFrame(animate);
  }

  // Interactions
  window.addEventListener("scroll", () => { updateProgress(); updateParallax(); }, { passive: true });
  window.addEventListener("resize", () => { resize(); updateProgress(); updateParallax(); });
  // Click anywhere on the hero to pulse
  secIntro.addEventListener("pointerdown", () => pixelBlast());
  // Toggle steady pixels
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p") {
      pixelTarget = (pixelTarget === pixelMin) ? 10 : pixelMin;
    }
  });

  // Init
  resize();
  updateProgress();
  updateParallax();
  drawFx();
  animate();
})();