import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  startGame,
  step,
  difficulty,
  spawnEnemy,
  togglePause,
  PLATFORMS,
} from "../src/game.js";
const game = (hero = "spider") => {
  const g = createGame(hero, () => 0.4);
  startGame(g);
  g.spawnIn = 1e6;
  return g;
};
const run = (g, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) step(g, input, 1 / 60);
};
test("60 active seconds advances waves, rewards survival, and scales indefinitely", () => {
  const g = game();
  run(g, 59.9);
  assert.equal(g.wave, 1);
  run(g, 0.2);
  assert.equal(g.wave, 2);
  assert.equal(g.score, 1000);
  assert.ok(g.intermission > 4.8);
  assert.equal(g.waveTime, 0);
  assert.ok(difficulty(10000).damage > difficulty(100).damage);
  assert.ok(difficulty(10000).hp > difficulty(100).hp);
  assert.equal(difficulty(10000).cap, 24);
});
test("five-second breather clears threats, rewards once, freezes powers and pauses safely", () => {
  const g = game("echo");
  g.waveTime = 60 - 1 / 60;
  g.player.hp = 60;
  g.player.power = "drone";
  g.player.powerTime = 7;
  spawnEnemy(g, "robot");
  step(g);
  assert.equal(g.intermission, 5);
  assert.equal(g.player.hp, 80);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.bullets.length, 0);
  const power = g.player.powerTime;
  run(g, 2, { attack: true, jump: true, right: true });
  assert.equal(g.waveTime, 0);
  assert.ok(Math.abs(g.intermission - 3) < 1e-8);
  assert.equal(g.player.powerTime, power);
  assert.equal(g.bullets.length, 0);
  togglePause(g);
  const remaining = g.intermission;
  run(g, 10);
  assert.equal(g.intermission, remaining);
  togglePause(g);
  run(g, 3);
  assert.equal(g.intermission, 0);
  assert.equal(g.waveTime, 0);
  assert.equal(g.player.hp, 80);
  assert.equal(g.score, 1000);
  step(g);
  assert.ok(g.waveTime > 0);
});
test("Spider wall jump keeps its upward launch", () => {
  const g = game();
  g.player.x = 11.5;
  g.player.y = 3;
  g.player.grounded = false;
  step(g, { right: true });
  step(g, { right: true, jump: true });
  assert.ok(g.player.vy > 12);
  assert.ok(g.player.y > 3);
  assert.equal(g.player.wall, false);
});
test("ranged aim follows direction and Steel shock stays horizontal", () => {
  for (const hero of ["spider", "echo"]) {
    for (const aim of ["up", "down"]) {
      const g = game(hero);
      if (hero === "echo") {
        g.player.power = "turret";
        g.player.powerTime = 10;
      }
      step(g, { left: true, attack: true, [aim]: true });
      assert.ok(g.bullets[0].vx < 0);
      assert.ok(aim === "up" ? g.bullets[0].vy > 0 : g.bullets[0].vy < 0);
    }
  }
  const g = game("steel");
  run(g, 0.5, { attack: true, up: true });
  step(g, { up: true });
  assert.equal(g.bullets[0].vy, 0);
});
test("Echo replaces every existing power including turret with a nearby punch", () => {
  for (const power of ["drone", "turret", "robot"]) {
    const g = game("echo");
    g.player.power = power;
    g.player.powerTime = 3;
    const replacement = power === "robot" ? "drone" : "robot";
    const e = spawnEnemy(g, replacement);
    e.x = 1;
    e.y = 0;
    e.telegraph = 0;
    step(g, { attack: true });
    assert.equal(g.player.power, replacement);
    assert.equal(g.player.powerTime, 10);
    assert.equal(g.bullets.length, 0);
  }
});
test("pause freezes the clock and restart resets the complete run", () => {
  const g = game("steel");
  run(g, 4);
  togglePause(g);
  const t = g.time;
  run(g, 5, { attack: true });
  assert.equal(g.time, t);
  togglePause(g);
  step(g);
  assert.ok(g.time > t);
  g.score = 999;
  g.wave = 9;
  const fresh = createGame("steel");
  assert.equal(fresh.wave, 1);
  assert.equal(fresh.score, 0);
  assert.equal(fresh.player.hp, 160);
  assert.deepEqual(fresh.enemies, []);
});
test("platform landing, drop through, and wall bounds", () => {
  const g = game();
  g.player.x = PLATFORMS[0].x;
  g.player.y = 4;
  g.player.vy = -2;
  run(g, 0.4);
  assert.equal(g.player.y, 3);
  assert.equal(g.player.grounded, true);
  run(g, 0.2, { down: true });
  assert.ok(g.player.y < 3);
  run(g, 5, { right: true });
  assert.equal(g.player.x, 11.5);
});
test("normal jump reaches the lower platforms from the floor", () => {
  const g = game();
  g.player.x = -7;
  step(g, { jump: true });
  run(g, 1);
  assert.equal(g.player.y, 3);
  assert.equal(g.player.grounded, true);
});
test("Spider clings, climbs and releases on no directional input", () => {
  const g = game();
  g.player.x = 11.5;
  g.player.y = 3;
  run(g, 0.5, { right: true, up: true });
  assert.ok(g.player.y > 5);
  assert.equal(g.player.wall, true);
  const y = g.player.y;
  run(g, 0.8);
  assert.ok(g.player.y < y);
});
test("web hit damages and slows holograms", () => {
  const g = game();
  const e = spawnEnemy(g, "robot");
  e.x = 2;
  e.telegraph = 0;
  run(g, 0.12, { attack: true });
  assert.ok(e.slow > 0);
  assert.ok(e.hp < 2);
});
test("Steel tap punches and airborne attacks damage nearby enemies", () => {
  for (const air of [false, true]) {
    const g = game("steel");
    g.player.y = air ? 2 : 0;
    g.player.grounded = !air;
    const e = spawnEnemy(g, "robot");
    e.x = 1;
    e.y = g.player.y;
    e.telegraph = 0;
    step(g, { attack: true });
    assert.equal(g.kills, 1);
    assert.ok(g.player.pose > 0);
  }
});
test("Steel releases a forward wave, auto-releases at three seconds only once per hold", () => {
  const g = game("steel");
  g.player.facing = -1;
  run(g, 1, { attack: true });
  step(g, {});
  assert.equal(g.bullets[0].kind, "shock");
  assert.ok(g.bullets[0].vx < 0);
  assert.ok(g.bullets[0].damage > 5);
  const a = game("steel");
  run(a, 3.1, { attack: true });
  assert.equal(a.bullets.filter((b) => b.kind === "shock").length, 1);
  assert.equal(a.player.chargeSpent, true);
  run(a, 3, { attack: true });
  assert.equal(a.bullets.length, 0);
});
test("Echo absorbs each type on successful punch, transforms for ten seconds, and expires", () => {
  for (const type of ["drone", "turret", "robot"]) {
    const g = game("echo");
    const e = spawnEnemy(g, type);
    e.x = 1;
    e.y = 0;
    e.telegraph = 0;
    step(g, { attack: true });
    assert.equal(g.player.power, type);
    assert.equal(g.player.powerTime, 10);
    g.enemies = [];
    run(g, 10.1);
    assert.equal(g.player.power, null);
  }
});
test("Echo drone flight, turret laser, and robot jump are mechanically distinct", () => {
  const drone = game("echo");
  drone.player.power = "drone";
  drone.player.powerTime = 10;
  run(drone, 1, { jump: true });
  assert.ok(drone.player.y > 5);
  const turret = game("echo");
  turret.player.power = "turret";
  turret.player.powerTime = 10;
  step(turret, { attack: true });
  assert.equal(turret.bullets[0].kind, "laser");
  const robot = game("echo");
  robot.player.power = "robot";
  robot.player.powerTime = 10;
  step(robot, { jump: true });
  assert.ok(robot.player.vy > 15);
});
test("health clamps, shield prevents harm, and depletion enters failure", () => {
  const g = game();
  g.player.hp = 90;
  g.pickups.push({ x: 0, y: 0.5, kind: "health", life: 10 });
  step(g);
  assert.equal(g.player.hp, 100);
  g.player.shield = 2;
  g.bullets.push({
    x: 0,
    y: 0.8,
    vx: 0,
    vy: 0,
    damage: 500,
    life: 1,
    friendly: false,
  });
  step(g);
  assert.equal(g.player.hp, 100);
  g.player.shield = 0;
  g.bullets.push({
    x: 0,
    y: 0.8,
    vx: 0,
    vy: 0,
    damage: 500,
    life: 1,
    friendly: false,
  });
  step(g);
  assert.equal(g.phase, "over");
  assert.equal(g.player.hp, 0);
  const t = g.time;
  run(g, 2);
  assert.equal(g.time, t);
});
test("all enemies telegraph, robots pursue, turrets fire, and drones approach reachable height", () => {
  const g = game("steel");
  const robot = spawnEnemy(g, "robot"),
    turret = spawnEnemy(g, "turret"),
    drone = spawnEnemy(g, "drone");
  const x = robot.x;
  run(g, 0.5);
  assert.equal(robot.x, x);
  run(g, 3);
  assert.ok(Math.abs(robot.x) < Math.abs(x));
  assert.ok(g.bullets.some((b) => !b.friendly));
  assert.ok(drone.y < 4);
});
