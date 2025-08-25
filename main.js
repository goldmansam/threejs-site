// Zoom Tunnel + Pixelation (no libs)
// - Renders particles (a star tunnel) to an offscreen canvas at device resolution.
// - Copies the offscreen into the visible canvas at reduced size to create pixelation.
// - Mouse wheel adjusts speed; hold mouse to boost; click triggers a pixelation "blast".

(() => {
  const display = document.getElementById("stage");
  const dCtx = display.getContext("2d", { alpha: false });

  // Offscreen canvas where we actually draw the scene at full resolution
  const scene = document.createElement("canvas");
  const sCtx = scene.getContext("2d", { alpha: false });

  let DPR = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
  let W = 0, H = 0; // internal pixel size
  let running = true;

  // Starfield params
  let stars = [];
  let starCount = 1200;     // will scale with size below
  const depth = 12;         // "distance" range (larger = deeper tunnel)
  let baseSpeed = 0.015;    // baseline z-advance per frame
  let targetSpeed = baseSpeed;
  let speed = baseSpeed;

  // Pixelation params
  let pixelSize = 1;          // 1 = no pixelation; >1 = chunk size
  let pixelTarget = 1;
  let pixelMin = 1;
  let pixelMax = 28;          // how chunky the click blast gets
  let pixelBlastActive = false;

  // Boost params
  let boosting = false;
  const boostSpeed = 0.15;

  // Resize setup
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth: cw, clientHeight: ch } = display;

    W = Math.max(1, Math.floor(cw * DPR));
    H = Math.max(1, Math.floor(ch * DPR));

    // Size the visible canvas (CSS size stays responsive)
    display.width = W; display.height = H;

    // Size the offscreen canvas at the same internal resolution
    scene.width = W; scene.height = H;

    // Adjust star count by area (keep density constant-ish)
    const density = 0.045; // tweak for your machine; higher = more stars
    starCount = Math.floor((W * H) / (10000 / density));
    makeStars();
  }

  // Create stars distributed within a square tunnel, with z in (0..depth]
  function makeStars() {
    stars = new Array(starCount).fill(0).map(() => spawnStar());
  }

  function spawnStar() {
    // Random x/y in a [-1, 1] square, then scale by viewport to avoid edges going empty
    const spread = 1.4;
    const x = (Math.random() * 2 - 1) * spread;
    const y = (Math.random() * 2 - 1) * spread;
    const z = Math.random() * depth + 0.0001;
    return { x, y, z };
  }

  function ease(current, to, rate) {
    return current + (to - current) * rate;
  }

  function animatePixelBlast() {
    // Animate pixelation up, then back down
    pixelBlastActive = true;
    pixelTarget = pixelMax;

    // Up ramp
    let upT = 0;
    const up = () => {
      if (upT < 1) {
        upT += 0.08;
        pixelTarget = pixelMin + (pixelMax - pixelMin) * Math.min(upT, 1);
        requestAnimationFrame(up);
      } else {
        // Down ramp
        let downT = 1;
        const down = () => {
          if (downT > 0) {
            downT -= 0.06;
            pixelTarget = pixelMin + (pixelMax - pixelMin) * Math.max(downT, 0);
            requestAnimationFrame(down);
          } else {
            pixelTarget = pixelMin;
            pixelBlastActive = false;
          }
        };
        requestAnimationFrame(down);
      }
    };
    requestAnimationFrame(up);
  }

  // Render one frame into the offscreen scene
  function renderScene(ctx) {
    // Clear (use a dark gray/black to avoid banding)
    ctx.fillStyle = "#0b0b0c";
    ctx.fillRect(0, 0, W, H);

    // Perspective factor (bigger = more spread)
    const fov = Math.min(W, H) * 0.85;

    // Slight vignette for mood
    const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.1, W/2, H/2, Math.hypot(W,H)*0.6);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Update & draw each star
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= speed;
      if (s.z <= 0.0001) {
        // Recycle to the back
        stars[i] = spawnStar();
        continue;
      }

      // Perspective projection
      const px = (s.x / s.z) * fov + W / 2;
      const py = (s.y / s.z) * fov + H / 2;

      // If out of bounds, recycle
      if (px < -50 || px > W + 50 || py < -50 || py > H + 50) {
        stars[i] = spawnStar();
        continue;
      }

      // Size & brightness by depth (nearer = larger/brighter)
      const t = 1 - (s.z / depth); // 0..1
      const size = 0.5 + t * 2.2;
      const alpha = 0.25 + t * 0.85;

      // Draw as tiny square (faster than arcs)
      ctx.fillStyle = `rgba(240,240,240,${alpha.toFixed(3)})`;
      ctx.fillRect(px, py, size, size);
    }
  }

  function frame() {
    if (!running) return;

    // Smoothly ease speed toward target
    speed = ease(speed, targetSpeed, 0.04);

    // Smoothly ease pixelation toward target
    pixelSize = ease(pixelSize, pixelTarget, 0.15);

    // Render scene at full resolution offscreen
    renderScene(sCtx);

    // Copy to display with optional pixelation
    // Disable smoothing for crisp nearest-neighbor
    dCtx.imageSmoothingEnabled = false;

    if (pixelSize <= 1.01) {
      // No pixelation, draw 1:1
      dCtx.drawImage(scene, 0, 0);
    } else {
      const w = Math.max(1, Math.floor(W / pixelSize));
      const h = Math.max(1, Math.floor(H / pixelSize));
      // Downsample into display at reduced resolution, then scale up to fill
      dCtx.clearRect(0, 0, W, H);
      dCtx.drawImage(scene, 0, 0, W, H, 0, 0, w, h);     // draw full scene into smaller area
      dCtx.drawImage(display, 0, 0, w, h, 0, 0, W, H);   // scale it back up (nearest-neighbor)
    }

    requestAnimationFrame(frame);
  }

  // Interactions
  window.addEventListener("resize", resize);

  // Scroll adjusts target speed
  window.addEventListener("wheel", (e) => {
    // Normalize direction
    const delta = Math.sign(e.deltaY);
    const step = 0.01;
    const next = targetSpeed + (delta > 0 ? step : -step);
    targetSpeed = clamp(next, 0.002, 0.35);
  }, { passive: true });

  // Hold mouse for boost
  window.addEventListener("pointerdown", () => {
    boosting = true;
    targetSpeed = Math.max(targetSpeed, boostSpeed);
    animatePixelBlast(); // also trigger a blast on press
  });
  window.addEventListener("pointerup", () => {
    boosting = false;
    targetSpeed = Math.max(baseSpeed, targetSpeed * 0.5);
  });

  // Keyboard: toggle steady pixelation mode with "P"
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p") {
      if (pixelTarget === pixelMin) {
        pixelTarget = 10; // medium chunky
      } else {
        pixelTarget = pixelMin;
      }
    }
  });

  // Utils
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Kickoff
  resize();
  frame();
})();
