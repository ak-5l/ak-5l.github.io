/* Gravity demo. Self-contained: builds its own markup inside `root`, so several demos can coexist.
   Register a new demo with: (window.DEMOS = window.DEMOS || {}).myName = function (root) {...} */
(window.DEMOS = window.DEMOS || {}).gravity = function (root) {
  root.innerHTML =
    '<div class="sim"><div class="sim-stage"><canvas aria-label="Interactive orbit simulation"></canvas>' +
    '<span class="nb-sticker is-yellow sim-status" data-r="status">Running</span>' +
    '<div class="sim-telemetry"><div><span>Speed</span><output data-r="speed">0</output></div>' +
    '<div><span>Distance</span><output data-r="distance">0</output></div><div><span>Time</span><output data-r="time">0.0 s</output></div></div></div>' +
    '<form class="nb-card sim-panel"><h4>Initial conditions</h4><p class="card-copy">Change a value, then reset the orbit.</p>' +
    field("gravity", "Gravity (G)", 200, 2000, 50, 1000) + field("mass", "Star mass", 40, 280, 5, 140) + field("velocity", "Planet velocity", 8, 42, 1, 23) +
    '<label class="nb-switch">Orbit trail<input type="checkbox" data-r="trail" checked><i></i></label>' +
    '<div class="sim-actions"><button type="button" class="nb-btn is-coral" data-r="pause">Pause</button><button type="button" class="nb-btn is-teal" data-r="reset">Reset orbit</button></div>' +
    '<p class="sim-hint">Press <kbd class="nb-kbd">Space</kbd> to pause or resume.</p></form></div>';

  function field(k, label, min, max, step, val) {
    return '<label class="nb-field"><span>' + label + ' <output data-r="' + k + 'Out">' + val + '</output></span>' +
      '<input class="nb-range" type="range" data-r="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"></label>';
  }
  var $ = function (k) { return root.querySelector('[data-r="' + k + '"]'); };
  var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
  var C = { bg: "#14111f", grid: "#2a2540", star: "#ffe566", planet: "#4ecdc4", trail: "#ff6b6b" };
  var S = { w: 0, h: 0, paused: matchMedia("(prefers-reduced-motion: reduce)").matches, visible: true, t: 0, last: performance.now(),
            star: { x: 0, y: 0 }, p: { x: 0, y: 0, vx: 0, vy: 0 }, trail: [] };

  function setPaused(v) { S.paused = v; $("pause").textContent = v ? "Resume" : "Pause"; $("status").textContent = v ? "Paused" : "Running"; }
  function reset() {
    var r = Math.min(S.w, S.h) * 0.31;
    S.star.x = S.w / 2; S.star.y = S.h * 0.46;
    S.p = { x: S.star.x, y: S.star.y - r, vx: +$("velocity").value, vy: 0 };
    S.trail = []; S.t = 0; readout();
  }
  function readout() {
    var dx = S.star.x - S.p.x, dy = S.star.y - S.p.y;
    $("speed").value = Math.hypot(S.p.vx, S.p.vy).toFixed(2);
    $("distance").value = Math.hypot(dx, dy).toFixed(2);
    $("time").value = S.t.toFixed(1) + " s";
  }
  function step(dt) {
    var h = Math.min(dt, 0.032) * 6;                      // ≈0.1 per frame at 60 fps, same as TIMESTEP in gravity.py
    var dx = S.star.x - S.p.x, dy = S.star.y - S.p.y;
    var d2 = Math.max(dx * dx + dy * dy, 400), d = Math.sqrt(d2);
    var a = (+$("gravity").value * +$("mass").value) / d2; // planet mass cancels: F/m = G·M/r²
    S.p.vx += a * dx / d * h; S.p.vy += a * dy / d * h;
    S.p.x += S.p.vx * h; S.p.y += S.p.vy * h; S.t += h;
    S.trail.push({ x: S.p.x, y: S.p.y }); if (S.trail.length > 700) S.trail.shift();
    readout();
  }
  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, S.w, S.h);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = 0; x <= S.w; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, S.h); }
    for (var y = 0; y <= S.h; y += 48) { ctx.moveTo(0, y); ctx.lineTo(S.w, y); }
    ctx.stroke();
    if ($("trail").checked && S.trail.length > 1) {
      ctx.beginPath(); S.trail.forEach(function (q, i) { i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
      ctx.strokeStyle = C.trail; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.beginPath();                                       // 6-point star, black outline = neo-brutalist
    for (var i = 0; i < 12; i++) {
      var r = i % 2 ? 11 : 26, ang = -Math.PI / 2 + i * Math.PI / 6;
      ctx[i ? "lineTo" : "moveTo"](S.star.x + r * Math.cos(ang), S.star.y + r * Math.sin(ang));
    }
    ctx.closePath(); ctx.fillStyle = C.star; ctx.fill(); ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(S.p.x, S.p.y, 8, 0, 7); ctx.fillStyle = C.planet; ctx.fill(); ctx.stroke();
  }
  function frame(now) {
    var dt = (now - S.last) / 1000; S.last = now;
    if (S.visible && !S.paused) step(dt);
    if (S.visible) draw();
    requestAnimationFrame(frame);
  }

  function resize() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), first = !S.w;
    var sx = first ? 1 : r.width / S.w, sy = first ? 1 : r.height / S.h;
    S.w = r.width; S.h = r.height; canvas.width = Math.round(S.w * dpr); canvas.height = Math.round(S.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (first) reset(); else {
      [S.star, S.p].forEach(function (o) { o.x *= sx; o.y *= sy; });
      S.trail.forEach(function (q) { q.x *= sx; q.y *= sy; });
    }
  }

  ["gravity", "mass", "velocity"].forEach(function (k) {
    $(k).addEventListener("input", function () { $(k + "Out").value = $(k).value; });
  });
  $("pause").addEventListener("click", function () { setPaused(!S.paused); });
  $("reset").addEventListener("click", reset);
  document.addEventListener("keydown", function (e) {     // Space toggles pause, unless a control already handles it
    if (e.code === "Space" && !/^(INPUT|BUTTON|TEXTAREA|SELECT|A)$/.test(e.target.tagName)) { e.preventDefault(); setPaused(!S.paused); }
  });
  new IntersectionObserver(function (en) { S.visible = en[0].isIntersecting; S.last = performance.now(); }).observe(canvas); // idle when off-screen
  new ResizeObserver(resize).observe(canvas);
  setPaused(S.paused);
  requestAnimationFrame(frame);
};
