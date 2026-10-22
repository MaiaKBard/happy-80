/*
  Little celebrations: fabric scraps, hearts and bits of thread that fly and fall.
  They're all drawn on one see-through canvas laid over the whole page,
  so they never get in the way of a tap.
*/

const fx = (() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#b8646e", "#8fa683", "#e9c98f", "#d9a54a", "#f3dcdc", "#8a6a55", "#94434f"];
  const HEART = new Path2D(
    "M12 21.5C5 16 1 12.2 1 7.4 1 3.8 3.8 1 7.2 1c2 0 3.8 1 4.8 2.6C13 2 14.8 1 16.8 1 20.2 1 23 3.8 23 7.4c0 4.8-4 8.6-11 14.1z"
  );

  // The canvas, sized to the screen (sharper on high-resolution phones)
  const canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  let particles = [];
  let running = false;

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function add(p) {
    particles.push({
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.15, 0.15),
      flutter: rand(0.05, 0.15),   // how fast a scrap flips over as it falls
      sway: rand(0.2, 0.8),
      age: 0,
      ...p,
    });
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  // One frame: move everything a little, then draw it.
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = particles.filter((p) => p.age < p.life && p.y < window.innerHeight + 40);

    for (const p of particles) {
      p.vx *= 0.985;                             // air slows it down
      p.vy += p.gravity;
      p.x += p.vx + Math.sin(p.age * 0.08) * p.sway * (p.gravity > 0 ? 0.5 : 1);
      p.y += p.vy;
      p.rot += p.spin;
      p.age++;

      ctx.save();
      ctx.globalAlpha = Math.min(1, (p.life - p.age) / 25);   // fade out at the end
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      draw(p);
      ctx.restore();
    }

    if (particles.length) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function draw(p) {
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.shape === "heart") {
      const s = p.size / 24;
      ctx.scale(s, s);
      ctx.translate(-12, -11);
      ctx.fill(HEART);
    } else if (p.shape === "thread") {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.quadraticCurveTo(0, -p.size * 0.8, p.size, 0);
      ctx.stroke();
    } else {
      // a little square scrap of fabric, flipping as it falls, with stitches on it
      ctx.scale(Math.cos(p.age * p.flutter), 1);
      ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
      ctx.strokeStyle = "rgba(255, 252, 245, 0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(-p.size / 2 + 2, -p.size * 0.35 + 2, p.size - 4, p.size * 0.7 - 4);
    }
  }

  // A pop of pieces flying out from one spot (x, y on the screen)
  function burst(x, y, { count = 12, shapes = ["scrap"], colors = COLORS, speed = 4 } = {}) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const v = rand(0.4, 1) * speed;
      add({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - speed * 0.5,
        gravity: 0.16,
        size: rand(7, 12),
        shape: pick(shapes),
        color: pick(colors),
        life: rand(50, 80),
      });
    }
  }

  // Pieces gently raining down from the top of the screen
  function rain(count = 60, { shapes = ["scrap", "scrap", "heart"], colors = COLORS } = {}) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      add({
        x: rand(0, window.innerWidth),
        y: rand(-window.innerHeight * 0.5, -10),
        vx: rand(-0.6, 0.6),
        vy: rand(1, 2.4),
        gravity: 0.025,
        size: rand(8, 14),
        shape: pick(shapes),
        color: pick(colors),
        life: 420,
      });
    }
  }

  // Hearts that float up and away (for the wish)
  function floatUp(x, y, count = 16) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      add({
        x: x + rand(-40, 40),
        y: y + rand(-10, 20),
        vx: rand(-0.5, 0.5),
        vy: rand(-2.2, -0.9),
        gravity: -0.012,
        size: rand(10, 18),
        shape: "heart",
        spin: rand(-0.03, 0.03),
        color: pick(["#b8646e", "#94434f", "#e3a3aa"]),
        life: rand(110, 170),
        delay: 0,
      });
    }
  }

  // The center of an element on the screen
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  // A tiny tap of vibration on phones that support it (most Androids; iPhones ignore it)
  function buzz(pattern = 12) {
    try { navigator.vibrate?.(pattern); } catch { /* not supported, that's fine */ }
  }

  return { burst, rain, floatUp, centerOf, buzz };
})();
