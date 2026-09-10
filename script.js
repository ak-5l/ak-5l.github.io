const canvas = document.getElementById("gravityCanvas");
const context = canvas.getContext("2d");

const controls = {
  gravity: document.getElementById("gravityInput"),
  mass: document.getElementById("massInput"),
  velocity: document.getElementById("velocityInput"),
  gravityValue: document.getElementById("gravityValue"),
  massValue: document.getElementById("massValue"),
  velocityValue: document.getElementById("velocityValue"),
  pause: document.getElementById("pauseButton"),
  reset: document.getElementById("resetButton"),
  status: document.getElementById("simStatus"),
  speed: document.getElementById("speedReadout"),
  distance: document.getElementById("distanceReadout"),
  time: document.getElementById("timeReadout")
};

const colors = {
  background: "#050c14",
  grid: "#132434",
  star: "#ffd45c",
  starGlow: "rgba(255, 212, 92, 0.15)",
  planet: "#58d6ff",
  trail: "rgba(88, 214, 255, 0.72)",
  dust: "rgba(237, 246, 255, 0.42)"
};

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  paused: false,
  elapsed: 0,
  lastFrame: performance.now(),
  planet: { x: 0, y: 0, vx: 23, vy: 0 },
  star: { x: 0, y: 0 },
  trail: [],
  dust: []
};

function createDust() {
  const count = Math.max(35, Math.floor((state.width * state.height) / 12000));
  state.dust = Array.from({ length: count }, (_, index) => ({
    x: (((index * 97.31) % 100) / 100) * state.width,
    y: (((index * 53.77 + 17) % 100) / 100) * state.height,
    radius: index % 7 === 0 ? 1.1 : 0.6
  }));
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const oldWidth = state.width || rect.width;
  const oldHeight = state.height || rect.height;

  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.round(rect.width * state.dpr);
  canvas.height = Math.round(rect.height * state.dpr);
  context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  if (state.star.x === 0) {
    resetSimulation();
  } else {
    const scaleX = state.width / oldWidth;
    const scaleY = state.height / oldHeight;
    state.star.x *= scaleX;
    state.star.y *= scaleY;
    state.planet.x *= scaleX;
    state.planet.y *= scaleY;
    state.trail = state.trail.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    }));
  }

  createDust();
}

function resetSimulation() {
  const orbitRadius = Math.min(state.width, state.height) * 0.31;
  state.star.x = state.width * 0.5;
  state.star.y = state.height * 0.48;
  state.planet.x = state.star.x;
  state.planet.y = state.star.y - orbitRadius;
  state.planet.vx = Number(controls.velocity.value);
  state.planet.vy = 0;
  state.trail = [];
  state.elapsed = 0;
  updateReadouts();
}

function updateReadouts() {
  const dx = state.star.x - state.planet.x;
  const dy = state.star.y - state.planet.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.sqrt(
    state.planet.vx * state.planet.vx + state.planet.vy * state.planet.vy
  );

  controls.speed.value = speed.toFixed(2);
  controls.distance.value = distance.toFixed(2);
  controls.time.value = `${state.elapsed.toFixed(1)} s`;
}

function updateSimulation(deltaSeconds) {
  if (state.paused) return;

  const simulationStep = Math.min(deltaSeconds, 0.032) * 6;
  const dx = state.star.x - state.planet.x;
  const dy = state.star.y - state.planet.y;
  const distanceSquared = Math.max(dx * dx + dy * dy, 400);
  const distance = Math.sqrt(distanceSquared);
  const gravity = Number(controls.gravity.value);
  const starMass = Number(controls.mass.value);
  const acceleration = (gravity * starMass) / distanceSquared;

  state.planet.vx += acceleration * (dx / distance) * simulationStep;
  state.planet.vy += acceleration * (dy / distance) * simulationStep;
  state.planet.x += state.planet.vx * simulationStep;
  state.planet.y += state.planet.vy * simulationStep;
  state.elapsed += simulationStep;

  state.trail.push({ x: state.planet.x, y: state.planet.y });
  if (state.trail.length > 700) state.trail.shift();

  updateReadouts();
}

function drawGrid() {
  context.strokeStyle = colors.grid;
  context.lineWidth = 1;
  context.beginPath();

  for (let x = 0; x <= state.width; x += 52) {
    context.moveTo(x, 0);
    context.lineTo(x, state.height);
  }

  for (let y = 0; y <= state.height; y += 52) {
    context.moveTo(0, y);
    context.lineTo(state.width, y);
  }

  context.stroke();
}

function drawStar(x, y, points = 6, outerRadius = 23, innerRadius = 10) {
  context.save();
  context.translate(x, y);
  context.beginPath();

  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }

  context.closePath();
  context.fillStyle = colors.star;
  context.shadowColor = colors.star;
  context.shadowBlur = 22;
  context.fill();
  context.restore();
}

function drawSimulation() {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, state.width, state.height);
  drawGrid();

  context.fillStyle = colors.dust;
  for (const point of state.dust) {
    context.beginPath();
    context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
    context.fill();
  }

  if (state.trail.length > 1) {
    context.beginPath();
    state.trail.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.strokeStyle = colors.trail;
    context.lineWidth = 1.6;
    context.stroke();
  }

  context.beginPath();
  context.arc(state.star.x, state.star.y, 36, 0, Math.PI * 2);
  context.fillStyle = colors.starGlow;
  context.fill();
  drawStar(state.star.x, state.star.y);

  context.beginPath();
  context.arc(state.planet.x, state.planet.y, 7, 0, Math.PI * 2);
  context.fillStyle = colors.planet;
  context.shadowColor = colors.planet;
  context.shadowBlur = 14;
  context.fill();
  context.shadowBlur = 0;
}

function frame(now) {
  const deltaSeconds = (now - state.lastFrame) / 1000;
  state.lastFrame = now;
  updateSimulation(deltaSeconds);
  drawSimulation();
  requestAnimationFrame(frame);
}

function syncControlLabels() {
  controls.gravityValue.value = controls.gravity.value;
  controls.massValue.value = controls.mass.value;
  controls.velocityValue.value = controls.velocity.value;
}

function togglePause() {
  state.paused = !state.paused;
  controls.pause.textContent = state.paused ? "Resume" : "Pause";
  controls.status.value = state.paused ? "Paused" : "Running";
}

[controls.gravity, controls.mass, controls.velocity].forEach(input => {
  input.addEventListener("input", syncControlLabels);
});

controls.pause.addEventListener("click", togglePause);
controls.reset.addEventListener("click", resetSimulation);

document.addEventListener("keydown", event => {
  if (event.code === "Space" && event.target.tagName !== "INPUT") {
    event.preventDefault();
    togglePause();
  }
});

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(canvas);

syncControlLabels();
requestAnimationFrame(frame);
