const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  money: document.getElementById("money"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  remaining: document.getElementById("remaining"),
  startWaveBtn: document.getElementById("startWaveBtn"),
  buildModeBtn: document.getElementById("buildModeBtn"),
  speedBtn: document.getElementById("speedBtn"),
  infiniteModeBtn: document.getElementById("infiniteModeBtn"),
  toast: document.getElementById("toast"),
};

const state = {
  money: 120,
  lives: 20,
  wave: 0,
  speed: 1,
  building: false,
  infiniteMode: false,
  infiniteSpawned: 0,
  towers: [],
  bloons: [],
  projectiles: [],
  activeWave: null,
  spawnTimer: 0,
  elapsed: 0,
};

const path = [
  { x: 0, y: 110 },
  { x: 180, y: 110 },
  { x: 180, y: 260 },
  { x: 420, y: 260 },
  { x: 420, y: 150 },
  { x: 680, y: 150 },
  { x: 680, y: 380 },
  { x: 960, y: 380 },
];

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => ui.toast.classList.remove("visible"), 1200);
}

function worldPos(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointSegmentDistance(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx ** 2 + aby ** 2)));
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  return distance(p, closest);
}

function isOnPath(point) {
  for (let i = 0; i < path.length - 1; i += 1) {
    if (pointSegmentDistance(point, path[i], path[i + 1]) < 28) {
      return true;
    }
  }
  return false;
}

function canBuildTower(point) {
  if (isOnPath(point)) return false;
  return !state.towers.some((tower) => distance(tower, point) < 55);
}

function tryBuildTower(point) {
  if (!state.building) return;
  const cost = 50;
  if (state.money < cost) {
    showToast("Sem moedas suficientes!");
    return;
  }

  if (!canBuildTower(point)) {
    showToast("Posição inválida para torre.");
    return;
  }

  state.money -= cost;
  state.towers.push({
    x: point.x,
    y: point.y,
    range: 140,
    fireRate: 0.55,
    cooldown: 0,
  });
  showToast("Torre construída!");
  updateUI();
}

function spawnBloon(kind) {
  const stats = {
    red: { hp: 1, speed: 60, reward: 9, color: "#ff5c5c", radius: 11 },
    blue: { hp: 2, speed: 76, reward: 13, color: "#4e9bff", radius: 12 },
    green: { hp: 4, speed: 92, reward: 18, color: "#5cff6f", radius: 13 },
  };
  const s = stats[kind];
  state.bloons.push({
    x: path[0].x,
    y: path[0].y,
    segment: 0,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed,
    reward: s.reward,
    color: s.color,
    radius: s.radius,
  });
}

function bloonKindByIndex(index) {
  const cycle = index % 10;
  if (cycle >= 8) return "green";
  if (cycle >= 5) return "blue";
  return "red";
}

function startWave() {
  if (state.activeWave) {
    showToast("A onda já começou.");
    return;
  }

  state.wave += 1;
  state.spawnTimer = 0;
  if (state.infiniteMode) {
    state.activeWave = {
      infinite: true,
      interval: Math.max(0.2, 0.65 - state.wave * 0.015),
      difficultyTimer: 0,
    };
    showToast(`Modo infinito ativo! Etapa ${state.wave}`);
  } else {
    const total = 8 + state.wave * 3;
    state.activeWave = {
      infinite: false,
      total,
      spawned: 0,
      interval: Math.max(0.3, 0.75 - state.wave * 0.03),
    };
    showToast(`Onda ${state.wave} iniciada!`);
  }

  updateUI();
}

function updateWave(dt) {
  if (!state.activeWave) return;
  state.spawnTimer += dt;

  if (state.activeWave.infinite) {
    state.activeWave.difficultyTimer += dt;

    while (state.spawnTimer >= state.activeWave.interval) {
      state.spawnTimer -= state.activeWave.interval;
      spawnBloon(bloonKindByIndex(state.infiniteSpawned));
      state.infiniteSpawned += 1;
    }

    if (state.activeWave.difficultyTimer >= 18) {
      state.activeWave.difficultyTimer = 0;
      state.wave += 1;
      state.activeWave.interval = Math.max(0.12, state.activeWave.interval - 0.03);
      state.money += 20 + state.wave * 2;
      showToast(`Etapa ${state.wave}: inimigos mais rápidos!`);
      updateUI();
    }
    return;
  }

  while (state.activeWave.spawned < state.activeWave.total && state.spawnTimer >= state.activeWave.interval) {
    state.spawnTimer -= state.activeWave.interval;
    spawnBloon(bloonKindByIndex(state.activeWave.spawned));
    state.activeWave.spawned += 1;
  }

  if (state.activeWave.spawned >= state.activeWave.total && state.bloons.length === 0) {
    state.money += 25 + state.wave * 3;
    state.activeWave = null;
    showToast("Onda concluída! Bônus recebido.");
    updateUI();
  }
}

function updateBloons(dt) {
  for (let i = state.bloons.length - 1; i >= 0; i -= 1) {
    const bloon = state.bloons[i];
    const target = path[bloon.segment + 1];

    if (!target) {
      state.bloons.splice(i, 1);
      state.lives -= 1;
      if (state.lives <= 0) {
        state.lives = 0;
        gameOver();
      }
      continue;
    }

    const dx = target.x - bloon.x;
    const dy = target.y - bloon.y;
    const dist = Math.hypot(dx, dy);
    const travel = bloon.speed * dt;

    if (travel >= dist) {
      bloon.x = target.x;
      bloon.y = target.y;
      bloon.segment += 1;
    } else {
      bloon.x += (dx / dist) * travel;
      bloon.y += (dy / dist) * travel;
    }
  }
}

function towerLogic(dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    let closest = null;
    let minDist = Infinity;
    for (const bloon of state.bloons) {
      const d = distance(tower, bloon);
      if (d <= tower.range && d < minDist) {
        closest = bloon;
        minDist = d;
      }
    }

    if (closest) {
      tower.cooldown = tower.fireRate;
      state.projectiles.push({
        x: tower.x,
        y: tower.y,
        tx: closest.x,
        ty: closest.y,
        speed: 430,
        damage: 1,
      });
    }
  }
}

function projectileLogic(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 9) {
      let hit = false;
      for (let j = 0; j < state.bloons.length; j += 1) {
        const bloon = state.bloons[j];
        if (distance(p, bloon) <= bloon.radius + 5) {
          bloon.hp -= p.damage;
          if (bloon.hp <= 0) {
            state.money += bloon.reward;
            state.bloons.splice(j, 1);
          }
          hit = true;
          updateUI();
          break;
        }
      }

      if (hit) state.projectiles.splice(i, 1);
      else state.projectiles.splice(i, 1);
      continue;
    }

    const step = Math.min(dist, p.speed * dt);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
}

let lost = false;
function gameOver() {
  if (lost) return;
  lost = true;
  state.activeWave = null;
  state.bloons.length = 0;
  showToast("Fim de jogo! Recarregue para jogar de novo.");
  updateUI();
}

function updateUI() {
  ui.money.textContent = `${Math.floor(state.money)}`;
  ui.lives.textContent = `${state.lives}`;
  ui.wave.textContent = `${state.wave}`;
  const remainingFromWave = state.activeWave && !state.activeWave.infinite ? state.activeWave.total - state.activeWave.spawned : 0;
  ui.remaining.textContent = state.activeWave && state.activeWave.infinite ? `${state.bloons.length}∞` : `${state.bloons.length + remainingFromWave}`;
  ui.buildModeBtn.classList.toggle("active", state.building);
  ui.speedBtn.textContent = `Velocidade x${state.speed}`;
  ui.infiniteModeBtn.textContent = `Modo infinito: ${state.infiniteMode ? "ON" : "OFF"}`;
  ui.infiniteModeBtn.classList.toggle("active", state.infiniteMode);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#234939";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#b3936b";
  ctx.lineWidth = 55;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i += 1) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  for (const tower of state.towers) {
    ctx.strokeStyle = "#6be3ff55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#1f4b8f";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6be3ff";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bloon of state.bloons) {
    ctx.fillStyle = bloon.color;
    ctx.beginPath();
    ctx.ellipse(bloon.x, bloon.y, bloon.radius, bloon.radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const hpPct = bloon.hp / bloon.maxHp;
    ctx.fillStyle = "#00000066";
    ctx.fillRect(bloon.x - 14, bloon.y - bloon.radius - 10, 28, 4);
    ctx.fillStyle = "#8cff8c";
    ctx.fillRect(bloon.x - 14, bloon.y - bloon.radius - 10, 28 * hpPct, 4);
  }

  ctx.fillStyle = "#ffe783";
  for (const p of state.projectiles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#f5f7ff";
  ctx.font = "bold 20px Inter, sans-serif";
  if (lost) {
    ctx.fillStyle = "#ff9f9f";
    ctx.fillText("Fim de jogo", canvas.width / 2 - 60, 42);
  } else if (!state.activeWave && state.wave === 0) {
    ctx.fillText("Pressione Iniciar onda para começar", canvas.width / 2 - 190, 42);
  }
}

let previous = performance.now();
function gameLoop(now) {
  const realDt = Math.min(0.033, (now - previous) / 1000);
  previous = now;
  const dt = realDt * state.speed;

  if (!lost) {
    state.elapsed += dt;
    updateWave(dt);
    updateBloons(dt);
    towerLogic(dt);
    projectileLogic(dt);
  }

  render();
  updateUI();
  requestAnimationFrame(gameLoop);
}

ui.startWaveBtn.addEventListener("click", startWave);
ui.infiniteModeBtn.addEventListener("click", () => {
  if (state.activeWave) {
    showToast("Troque o modo apenas entre ondas.");
    return;
  }
  state.infiniteMode = !state.infiniteMode;
  state.infiniteSpawned = 0;
  state.spawnTimer = 0;
  updateUI();
  showToast(state.infiniteMode ? "Modo infinito ligado" : "Modo infinito desligado");
});

ui.buildModeBtn.addEventListener("click", () => {
  state.building = !state.building;
  updateUI();
  showToast(state.building ? "Modo construção ativado" : "Modo construção desativado");
});
ui.speedBtn.addEventListener("click", () => {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  updateUI();
});

const pointerBuild = (event) => {
  event.preventDefault();
  tryBuildTower(worldPos(event));
};

canvas.addEventListener("pointerdown", pointerBuild);

requestAnimationFrame(gameLoop);
updateUI();
