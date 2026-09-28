export const HEROES = {
  spider: {
    name: "The Spider",
    role: "AGILE / RANGED",
    color: "#ff6659",
    hp: 100,
    speed: 7.5,
    description: "Stick to walls. Rain down webs.",
    tip: "Hold into a wall to cling. ↑ / ↓ climb or aim your webs.",
  },
  steel: {
    name: "Steel",
    role: "ARMORED / POWER",
    color: "#b1c7ee",
    hp: 160,
    speed: 5.7,
    description: "Take the hit. Return the favor.",
    tip: "Tap attack to punch. Jump to kick. Hold attack, then release a shockwave.",
  },
  echo: {
    name: "Echo",
    role: "ABSORB / ADAPT",
    color: "#beee73",
    hp: 110,
    speed: 6.8,
    description: "Their power. Your advantage.",
    tip: "Punch to absorb: drone = flight, turret = lasers, robot = super jump. Lasts 10s.",
  },
};
export const PLATFORMS = [
  { x: -7, y: 3, w: 5 },
  { x: 7, y: 3, w: 5 },
  { x: 0, y: 6, w: 4.4 },
];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function difficulty(wave) {
  return {
    interval: Math.max(0.55, 2.9 * 0.91 ** (wave - 1)),
    hp: 2 + Math.floor((wave - 1) / 3),
    damage: 9 + (wave - 1) * 1.5,
    speed: Math.min(4.8, 1.7 + wave * 0.16),
    cap: Math.min(24, 5 + wave * 2),
  };
}
export function createGame(hero = "spider", rng = Math.random) {
  return {
    hero,
    rng,
    phase: "ready",
    time: 0,
    waveTime: 0,
    wave: 1,
    score: 0,
    kills: 0,
    nextId: 1,
    spawnIn: 0.7,
    pickupIn: 8,
    enemies: [],
    bullets: [],
    effects: [],
    pickups: [],
    events: [],
    previous: {},
    banner: 3,
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: HEROES[hero].hp,
      maxHp: HEROES[hero].hp,
      grounded: true,
      invulnerable: 0,
      cooldown: 0,
      charge: 0,
      chargeSpent: false,
      pose: 0,
      power: null,
      powerTime: 0,
      shield: 0,
      wall: false,
    },
  };
}
export function startGame(g) {
  g.phase = "playing";
}
export function togglePause(g) {
  if (g.phase === "playing") g.phase = "paused";
  else if (g.phase === "paused") {
    g.phase = "playing";
    g.previous = {};
  }
}
function effect(g, x, y, color, size = 1) {
  g.effects.push({
    id: g.nextId++,
    x,
    y,
    color,
    size,
    life: 0.35,
    maxLife: 0.35,
  });
}
export function spawnEnemy(g, type) {
  const d = difficulty(g.wave),
    side = g.rng() > 0.5 ? 1 : -1;
  type ??= ["robot", "drone", "turret"][Math.floor(g.rng() * 3)];
  const e = {
    id: g.nextId++,
    type,
    x: side * 11.3,
    y: type === "drone" ? 2.2 + g.rng() * 4 : 0,
    vy: 0,
    hp: d.hp + (type === "turret" ? 1 : 0),
    cool: 1.7,
    age: 0,
    slow: 0,
    flash: 0,
    telegraph: 0.85,
    facing: -side,
  };
  g.enemies.push(e);
  return e;
}
function hitEnemy(g, e, damage, web = false) {
  if (e.hp <= 0) return;
  e.hp -= damage;
  e.flash = 0.13;
  if (web) e.slow = 2;
  effect(g, e.x, e.y + 0.8, web ? "white" : "cyan", 0.65);
  g.events.push("hit");
  if (e.hp <= 0) {
    g.score += e.type === "robot" ? 100 : 150;
    g.kills++;
    effect(g, e.x, e.y + 0.8, "cyan", 1.8);
    g.events.push("destroy");
  }
}
function hurt(g, amount) {
  const p = g.player;
  if (p.invulnerable > 0 || p.shield > 0) return;
  p.hp = Math.max(0, p.hp - amount * (g.hero === "steel" ? 0.58 : 1));
  p.invulnerable = 0.9;
  g.events.push("hurt");
  effect(g, p.x, p.y + 0.8, "red", 1.2);
  if (!p.hp) {
    g.phase = "over";
    g.events.push("over");
  }
}
function melee(g) {
  const p = g.player;
  p.pose = 0.22;
  g.events.push("punch");
  effect(
    g,
    p.x + p.facing * 1.1,
    p.y + 0.9,
    g.hero === "steel" ? "white" : "green",
    0.7,
  );
  for (const e of g.enemies) {
    if (e.telegraph > 0 || e.hp <= 0) continue;
    const dx = (e.x - p.x) * p.facing;
    if (dx > -0.6 && dx < 2.1 && Math.abs(e.y - p.y) < 1.8) {
      hitEnemy(g, e, g.hero === "steel" ? 3 : 2);
      if (g.hero === "echo") {
        p.power = e.type;
        p.powerTime = 10;
        g.events.push("absorb");
      }
    }
  }
}
function fire(g, kind, charge = 0, aim = 0) {
  const p = g.player,
    speed = kind === "shock" ? 16 : 19;
  g.bullets.push({
    id: g.nextId++,
    x: p.x + p.facing * 0.75,
    y: p.y + 0.95,
    vx: p.facing * speed * (aim ? 0.75 : 1),
    vy: aim * speed * 0.66,
    kind,
    friendly: true,
    damage: kind === "shock" ? 3 + charge * 3 : kind === "laser" ? 2 : 1,
    radius: kind === "shock" ? 0.65 + charge * 0.3 : 0.2,
    life: 1.7,
    hit: [],
  });
  p.pose = 0.17;
  g.events.push(kind);
}
function land(entity, oldY, dt, down = false) {
  entity.y += entity.vy * dt;
  entity.grounded = false;
  if (entity.vy <= 0 && !down)
    for (const f of PLATFORMS)
      if (
        oldY >= f.y - 0.05 &&
        entity.y <= f.y &&
        Math.abs(entity.x - f.x) < f.w / 2 + 0.22
      ) {
        entity.y = f.y;
        entity.vy = 0;
        entity.grounded = true;
      }
  if (entity.y <= 0) {
    entity.y = 0;
    entity.vy = 0;
    entity.grounded = true;
  }
  if (entity.y > 10.5) {
    entity.y = 10.5;
    entity.vy = Math.min(0, entity.vy);
  }
}
export function step(g, input = {}, dt = 1 / 60) {
  if (g.phase !== "playing") return;
  dt = clamp(dt, 0, 0.05);
  const p = g.player,
    d = difficulty(g.wave),
    prev = g.previous;
  g.events = [];
  g.time += dt;
  g.waveTime += dt;
  g.banner = Math.max(0, g.banner - dt);
  for (const k of ["invulnerable", "cooldown", "pose", "shield"])
    p[k] = Math.max(0, p[k] - dt);
  p.powerTime = Math.max(0, p.powerTime - dt);
  if (!p.powerTime) p.power = null;
  const axis = Number(!!input.right) - Number(!!input.left);
  if (axis) p.facing = axis;
  p.vx = axis * HEROES[g.hero].speed * (input.down && p.grounded ? 0.5 : 1);
  p.x = clamp(p.x + p.vx * dt, -11.5, 11.5);
  p.wall =
    g.hero === "spider" &&
    Math.abs(p.x) >= 11.45 &&
    axis === Math.sign(p.x) &&
    p.y > 0;
  if (input.jump && !prev.jump && (p.grounded || p.wall)) {
    p.vy = p.power === "robot" ? 17 : 13;
    p.grounded = false;
    if (p.wall) {
      p.x -= axis * 0.55;
      p.facing = -axis;
    }
    g.events.push("jump");
  }
  if (p.wall) p.vy = (Number(!!input.up) - Number(!!input.down)) * 5;
  else if (p.power === "drone" && input.jump) p.vy = 6;
  else p.vy -= 24 * dt;
  land(p, p.y, dt, input.down && !p.wall);
  if (g.hero === "steel") {
    if (input.attack && !prev.attack) {
      if (p.cooldown <= 0) {
        melee(g);
        p.cooldown = 0.35;
      }
      p.chargeSpent = false;
    }
    if (input.attack && !p.chargeSpent) {
      p.charge += dt;
      if (p.charge >= 3) {
        fire(g, "shock", 3);
        p.charge = 0;
        p.chargeSpent = true;
      }
    }
    if (!input.attack && prev.attack) {
      if (p.charge >= 0.25) fire(g, "shock", p.charge);
      p.charge = 0;
      p.chargeSpent = false;
    }
  } else if (input.attack && p.cooldown <= 0) {
    if (g.hero === "spider" || p.power === "turret")
      fire(
        g,
        g.hero === "spider" ? "web" : "laser",
        0,
        Number(!!input.up) - Number(!!input.down),
      );
    else melee(g);
    p.cooldown = g.hero === "spider" ? 0.19 : 0.3;
  }
  g.spawnIn -= dt;
  if (g.spawnIn <= 0) {
    if (g.enemies.length < d.cap) spawnEnemy(g);
    g.spawnIn = d.interval;
  }
  for (const e of g.enemies) {
    e.age += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.slow = Math.max(0, e.slow - dt);
    e.telegraph = Math.max(0, e.telegraph - dt);
    if (e.telegraph > 0 || e.hp <= 0) continue;
    const dx = p.x - e.x;
    e.facing = dx >= 0 ? 1 : -1;
    e.cool -= dt;
    if (e.type === "robot") {
      e.x += e.facing * d.speed * (e.slow ? 0.35 : 1) * dt;
      if (e.grounded && p.y > e.y + 1 && e.cool <= 0) {
        e.vy = 13;
        e.cool = 2;
      }
      e.vy -= 24 * dt;
      land(e, e.y, dt);
    } else if (e.type === "drone") {
      e.x += e.facing * d.speed * 0.6 * dt;
      e.y += (p.y + 1.1 + Math.sin(e.age * 2) * 0.4 - e.y) * dt * 0.65;
    }
    if (e.type !== "robot" && e.cool <= 0) {
      const dy = p.y + 0.8 - (e.y + 0.8),
        len = Math.hypot(dx, dy) || 1,
        speed = Math.min(10, 4.5 + g.wave * 0.2);
      g.bullets.push({
        id: g.nextId++,
        x: e.x,
        y: e.y + 0.8,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        kind: "enemy",
        friendly: false,
        radius: 0.16,
        damage: d.damage,
        life: 5,
      });
      e.cool = Math.max(0.8, 2.8 - g.wave * 0.08);
    }
    if (Math.abs(dx) < 0.8 && Math.abs(e.y - p.y) < 1.3) hurt(g, d.damage);
  }
  for (const b of g.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.friendly) {
      for (const e of g.enemies)
        if (
          e.telegraph <= 0 &&
          e.hp > 0 &&
          !b.hit.includes(e.id) &&
          Math.abs(b.x - e.x) < 0.6 + b.radius &&
          Math.abs(b.y - e.y - 0.8) < 0.8 + b.radius
        ) {
          hitEnemy(g, e, b.damage, b.kind === "web");
          b.hit.push(e.id);
          if (b.kind !== "shock") {
            b.life = 0;
            break;
          }
        }
    } else if (Math.abs(b.x - p.x) < 0.48 && Math.abs(b.y - p.y - 0.8) < 0.8) {
      hurt(g, b.damage);
      b.life = 0;
    }
  }
  g.bullets = g.bullets
    .filter((b) => b.life > 0 && Math.abs(b.x) < 13 && b.y > -0.5 && b.y < 13)
    .slice(-100);
  g.enemies = g.enemies.filter((e) => e.hp > 0);
  g.pickupIn -= dt;
  if (g.pickupIn <= 0) {
    const f = PLATFORMS[Math.floor(g.rng() * PLATFORMS.length)];
    if (g.pickups.length < 3)
      g.pickups.push({
        id: g.nextId++,
        x: f.x,
        y: f.y + 0.45,
        kind: g.rng() > 0.4 ? "health" : "shield",
        life: 20,
      });
    g.pickupIn = 10;
  }
  for (const item of g.pickups) {
    item.life -= dt;
    if (Math.abs(item.x - p.x) < 0.85 && Math.abs(item.y - p.y - 0.7) < 1) {
      if (item.kind === "health") p.hp = Math.min(p.maxHp, p.hp + 30);
      else p.shield = 6;
      item.life = 0;
      g.events.push("pickup");
      effect(g, p.x, p.y + 1, "green", 2);
    }
  }
  g.pickups = g.pickups.filter((i) => i.life > 0);
  for (const e of g.effects) e.life -= dt;
  g.effects = g.effects.filter((e) => e.life > 0).slice(-35);
  if (g.waveTime >= 60 && g.phase === "playing") {
    g.wave++;
    g.waveTime -= 60;
    g.banner = 3;
    g.score += 1000;
    g.enemies = [];
    g.bullets = [];
    p.hp = Math.min(p.maxHp, p.hp + 20);
    p.invulnerable = 2;
    g.spawnIn = 1;
    g.events.push("wave");
  }
  g.previous = { ...input };
}
