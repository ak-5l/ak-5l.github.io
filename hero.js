// A planet on a real gravitational orbit around the portrait.
// The orbit is simulated in its own plane (units: star at the origin, G*M = 1),
// then tilted toward the viewer. The half of the path nearer the viewer is drawn
// on the canvas above the portrait, the far half on the canvas below it.
(() => {
  const back = document.getElementById("orbitBack");
  const front = document.getElementById("orbitFront");
  if (!back || !front) return;

  const sky = back.parentElement;
  const ctxs = [back.getContext("2d"), front.getContext("2d")];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TILT = 0.3, ROT = -0.14, MAX_TRAIL = 260, TIME_SCALE = 0.29;
  const cos = Math.cos(ROT), sin = Math.sin(ROT);

  let w = 0, h = 0, cx = 0, cy = 0, radius = 0, visible = true, last = performance.now();
  const planet = { x: 1, y: 0, vx: 0, vy: 0.82 }; // starts at its farthest point
  let trail = [];

  function accel(x, y) {
    const r2 = x * x + y * y;
    const k = -1 / (r2 * Math.sqrt(r2));
    return [x * k, y * k];
  }

  function step(dt) {
    let [ax, ay] = accel(planet.x, planet.y);
    planet.vx += ax * dt / 2;
    planet.vy += ay * dt / 2;
    planet.x += planet.vx * dt;
    planet.y += planet.vy * dt;
    [ax, ay] = accel(planet.x, planet.y);
    planet.vx += ax * dt / 2;
    planet.vy += ay * dt / 2;
    trail.push({ x: planet.x, y: planet.y });
    if (trail.length > MAX_TRAIL) trail.shift();
  }

  function project(x, y) {
    const px = x * radius, py = y * radius * TILT;
    return [cx + px * cos - py * sin, cy + px * sin + py * cos];
  }

  function resize() {
    const rect = sky.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    for (const c of [back, front]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    cx = w * 0.5;
    cy = h * 0.56;
    radius = Math.min(w * 0.46, h * 0.7);
    draw();
  }

  function draw() {
    ctxs.forEach(c => c.clearRect(0, 0, w, h));
    const [bk, fr] = ctxs;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      const c = (a.y + b.y) / 2 > 0 ? fr : bk;
      const [x0, y0] = project(a.x, a.y);
      const [x1, y1] = project(b.x, b.y);
      c.strokeStyle = `rgba(243, 236, 217, ${(i / trail.length) * 0.7})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    const c = planet.y > 0 ? fr : bk;
    const [x, y] = project(planet.x, planet.y);
    c.fillStyle = "#e0b45a";
    c.beginPath();
    c.arc(x, y, 7 + 4 * planet.y, 0, Math.PI * 2);
    c.fill();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05) * TIME_SCALE;
    last = now;
    if (visible) {
      step(dt / 2);
      step(dt / 2);
      draw();
    }
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(sky);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }).observe(sky);

  if (still) {
    for (let i = 0; i < 360; i++) step(0.0048);
    resize();
  } else {
    resize();
    requestAnimationFrame(frame);
  }
})();
