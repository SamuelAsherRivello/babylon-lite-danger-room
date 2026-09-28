import {
  createEngine,
  createSceneContext,
  createArcRotateCamera,
  createHemisphericLight,
  createPointLight,
  createBox,
  createSphere,
  createCylinder,
  createTorus,
  createPbrMaterial,
  setPbrEmissive,
  createTransformNode,
  setParent,
  setSubtreeVisible,
  addToScene,
  registerScene,
  startEngine,
  onBeforeRender,
  resizeEngine,
  disposeEngine,
} from "@babylonjs/lite";
import { PLATFORMS } from "./game.js";

export async function buildScene(canvas, update) {
  const engine = await createEngine(canvas);
  try {
    const scene = createSceneContext(engine);
    scene.clearColor = { r: 0.018, g: 0.026, b: 0.038, a: 1 };
    const camera = createArcRotateCamera(-Math.PI / 2, Math.PI / 2 - 0.09, 22, {
      x: 0,
      y: 5.6,
      z: 1,
    });
    camera.fov = 0.66;
    scene.camera = camera;
    addToScene(scene, createHemisphericLight([0.4, 1, -0.8], 2.2));
    addToScene(scene, createPointLight([0, 8, -6], 80));
    function mat(rgb, metal = 0.1, glow = 0) {
      const m = createPbrMaterial({
        baseColorFactor: [...rgb, 1],
        metallicFactor: metal,
        roughnessFactor: 0.58,
      });
      if (glow)
        setPbrEmissive(
          m,
          rgb.map((v) => v * glow),
        );
      return m;
    }
    const m = {
      wall: mat([0.095, 0.125, 0.16], 0.5),
      dark: mat([0.025, 0.043, 0.06], 0.4),
      rim: mat([0.22, 0.28, 0.32], 0.65),
      floor: mat([0.15, 0.19, 0.23], 0.5),
      cyan: mat([0.04, 0.65, 0.82], 0.2, 1),
      ice: mat([0.28, 0.88, 1], 0.2, 0.8),
      holo: mat([0.025, 0.26, 0.34], 0.4, 0.55),
      orange: mat([1, 0.3, 0.06], 0.2, 0.8),
      red: mat([0.88, 0.12, 0.08], 0.25, 0.25),
      blue: mat([0.025, 0.08, 0.16], 0.25),
      silver: mat([0.58, 0.67, 0.78], 0.72),
      white: mat([0.8, 0.93, 1], 0.2, 0.8),
      green: mat([0.57, 0.83, 0.24], 0.25, 0.45),
      purple: mat([0.18, 0.07, 0.23], 0.3),
      skin: mat([0.65, 0.36, 0.24]),
      hair: mat([0.16, 0.08, 0.04]),
      black: mat([0.015, 0.021, 0.027]),
      gold: mat([0.95, 0.63, 0.15], 0.5, 0.25),
    };
    const pos = (n, x, y, z = 0) => {
      n.position.set(x, y, z);
      return n;
    };
    function box(x, y, z, w, h, d, material, parent) {
      const n = createBox(engine, { width: w, height: h, depth: d });
      n.material = material;
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      addToScene(scene, n);
      return n;
    }
    function sphere(x, y, z, size, material, parent) {
      const n = createSphere(engine, { diameter: size, segments: 10 });
      n.material = material;
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      addToScene(scene, n);
      return n;
    }
    function cylinder(x, y, z, diameter, height, material, parent) {
      const n = createCylinder(engine, { diameter, height, tessellation: 16 });
      n.material = material;
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      addToScene(scene, n);
      return n;
    }
    function root(name) {
      const n = createTransformNode(name);
      addToScene(scene, n);
      return n;
    }
    box(0, -0.45, 1, 25.7, 0.9, 6, m.floor);
    box(0, 6.1, 3.2, 25.8, 13, 0.5, m.dark);
    for (let x = -11; x <= 11; x += 2.75)
      for (let y = 1.5; y < 12; y += 3) {
        box(x, y, 2.84, 2.66, 2.88, 0.24, m.wall);
        box(x, y - 1.28, 2.68, 2.3, 0.035, 0.035, m.rim);
        for (const sx of [-1, 1])
          box(x + sx * 1.12, y + 1.16, 2.65, 0.075, 0.075, 0.07, m.rim);
      }
    for (const x of [-12.5, 12.5]) {
      box(x, 5.8, 0.4, 0.8, 12, 5.7, m.rim);
      box(x * 0.975, 5.7, -2, 0.08, 10.8, 0.15, m.cyan);
    }
    box(0, 12.1, 0.8, 25.6, 0.7, 5, m.rim);
    for (const x of [-8, 0, 8]) {
      box(x, 11.7, 0.5, 3.8, 0.12, 1, m.white);
      box(x, 11.75, 2.55, 4, 0.28, 0.2, m.dark);
    }
    for (let x = -12; x <= 12; x += 1.5) {
      box(x, 0.014, 0.3, 0.027, 0.015, 5.5, m.rim);
      box(
        x,
        -0.12,
        -2.03,
        0.62,
        0.17,
        0.025,
        Math.round(x / 1.5) % 2 === 0 ? m.gold : m.black,
      );
    }
    for (const z of [-1, 1, 2]) box(0, 0.02, z, 24, 0.022, 0.025, m.rim);
    box(0, 0, -2, 24.4, 0.07, 0.06, m.cyan);
    for (const f of PLATFORMS) {
      box(f.x, f.y - 0.24, 0.6, f.w, 0.48, 2.6, m.rim);
      box(f.x, f.y - 0.15, -0.73, f.w, 0.09, 0.04, m.cyan);
      box(f.x, f.y - 0.6, 2.5, f.w * 0.7, 0.5, 0.5, m.dark);
      for (let x = f.x - f.w / 2 + 0.3; x < f.x + f.w / 2; x += 0.55)
        box(x, f.y + 0.008, 0.6, 0.035, 0.012, 2.4, m.dark);
    }
    // Recessed observation window and a physical concentric chamber emblem.
    box(0, 8.8, 2.48, 6.8, 2.6, 0.25, m.rim);
    box(0, 8.8, 2.3, 6.5, 2.3, 0.18, m.black);
    for (const x of [-2.7, -1.35, 0, 1.35, 2.7])
      box(x, 8.8, 2.18, 0.06, 2.3, 0.08, m.rim);
    for (const x of [-10.8, 10.8]) {
      box(x, 5.9, 2.5, 1.1, 2.2, 0.3, m.dark);
      for (let y = 5.15; y < 6.7; y += 0.2)
        box(x, y, 2.29, 0.8, 0.045, 0.1, m.cyan);
    }
    const emblem = createTorus(engine, {
      diameter: 2.25,
      thickness: 0.09,
      tessellation: 32,
    });
    emblem.material = m.rim;
    emblem.rotation.x = Math.PI / 2;
    pos(emblem, 0, 3.1, 2.5);
    addToScene(scene, emblem);
    const slash = box(0, 3.1, 2.45, 0.13, 1.4, 0.1, m.orange);
    slash.rotation.z = -0.4;
    // Models face the camera with a readable three-quarter turn toward movement.
    function actor(kind) {
      const r = root(kind),
        steel = kind === "steel",
        echo = kind === "echo",
        enemy = kind === "enemy";
      const body = enemy ? m.holo : steel ? m.silver : echo ? m.purple : m.red,
        trim = enemy ? m.cyan : steel ? m.purple : echo ? m.green : m.blue;
      const torso = box(0, 1.02, 0, steel ? 0.83 : 0.6, 0.68, 0.4, body, r);
      box(0, 0.73, -0.015, steel ? 0.85 : 0.63, 0.12, 0.43, trim, r);
      const head = sphere(
        0,
        1.65,
        0,
        0.48,
        enemy ? m.holo : steel ? m.silver : echo ? m.skin : m.red,
        r,
      );
      const eyes = box(
        0,
        1.7,
        -0.225,
        0.34,
        0.09,
        0.05,
        enemy ? m.ice : steel ? m.white : echo ? m.green : m.white,
        r,
      );
      const hair = echo
        ? [
            box(0, 1.87, 0.03, 0.5, 0.17, 0.4, m.hair, r),
            box(-0.12, 1.89, -0.17, 0.16, 0.14, 0.08, m.white, r),
          ]
        : [];
      if (kind === "spider") {
        box(0, 1.08, -0.23, 0.12, 0.34, 0.045, m.black, r);
        for (const s of [-1, 1])
          for (const y of [0.97, 1.12]) {
            const leg = box(s * 0.13, y, -0.24, 0.23, 0.035, 0.02, m.black, r);
            leg.rotation.z = s * 0.55;
          }
      }
      if (steel)
        for (let y = 0.84; y < 1.32; y += 0.13)
          box(0, y, -0.215, 0.72, 0.025, 0.025, m.rim, r);
      const arms = [-1, 1].map((s) => {
        const a = root("arm");
        setParent(a, r);
        pos(a, s * (steel ? 0.56 : 0.43), 1.25, 0);
        box(0, -0.21, 0, steel ? 0.3 : 0.22, 0.5, 0.27, body, a);
        sphere(0, -0.48, -0.02, steel ? 0.36 : 0.26, trim, a);
        return a;
      });
      const legs = [-1, 1].map((s) => {
        const a = root("leg");
        setParent(a, r);
        pos(a, s * 0.2, 0.7, 0);
        box(0, -0.28, 0, 0.25, 0.56, 0.29, trim, a);
        box(0, -0.58, -0.085, 0.28, 0.18, 0.48, body, a);
        return a;
      });
      const drone = root("drone-head");
      setParent(drone, r);
      pos(drone, 0, 1.65, 0);
      sphere(0, 0, 0, 0.57, m.holo, drone);
      box(0, 0, -0.27, 0.35, 0.12, 0.08, m.ice, drone);
      box(0, 0.13, 0, 1.2, 0.07, 0.18, m.cyan, drone);
      const turret = root("turret-head");
      setParent(turret, r);
      pos(turret, 0, 1.62, 0);
      box(0, 0, 0, 0.61, 0.39, 0.45, m.holo, turret);
      box(0.38, 0, -0.08, 0.57, 0.15, 0.18, m.cyan, turret);
      return { r, torso, head, eyes, arms, legs, drone, turret, kind, hair };
    }
    const heroes = Object.fromEntries(
      ["spider", "steel", "echo"].map((k) => [k, actor(k)]),
    );
    const enemies = Array.from({ length: 24 }, () => actor("enemy"));
    const shadows = Array.from({ length: 25 }, () => {
      const n = sphere(0, 0.025, 0, 1, m.dark);
      n.scaling.set(1, 0.02, 0.55);
      return n;
    });
    const bullets = Array.from({ length: 100 }, () =>
      sphere(0, -10, 0, 0.3, m.white),
    );
    const effects = Array.from({ length: 35 }, () => {
      const n = createTorus(engine, {
        diameter: 1,
        thickness: 0.065,
        tessellation: 16,
      });
      n.material = m.cyan;
      n.rotation.x = Math.PI / 2;
      addToScene(scene, n);
      return n;
    });
    const pickups = Array.from({ length: 3 }, () => {
      const r = root("pickup");
      box(0, 0, 0, 0.52, 0.52, 0.52, m.green, r);
      box(0, 0, -0.28, 0.32, 0.09, 0.04, m.white, r);
      box(0, 0, -0.28, 0.09, 0.32, 0.04, m.white, r);
      return r;
    });
    function drawActor(a, data, g, visible = true) {
      setSubtreeVisible(a.r, visible);
      if (!visible) return;
      const isEnemy = a.kind === "enemy",
        type = isEnemy ? data.type : null;
      pos(a.r, data.x, data.y, 0);
      a.r.rotation.y = data.facing * 0.25;
      const drone = type === "drone" || data.power === "drone",
        turret = type === "turret" || data.power === "turret";
      setSubtreeVisible(a.head, !drone && !turret);
      for (const hair of a.hair) hair.visible = !drone && !turret;
      a.eyes.visible = !drone && !turret;
      setSubtreeVisible(a.drone, drone);
      setSubtreeVisible(a.turret, turret);
      a.turret.scaling.x = data.facing;
      a.drone.rotation.y = g.time * 4;
      const run =
        Math.sin(g.time * 13) *
        (Math.abs(data.vx || 0) > 0.1 || type === "robot" ? 0.65 : 0.06);
      a.legs.forEach((l, i) => {
        setSubtreeVisible(l, !isEnemy || (!drone && !turret));
        l.rotation.x = (i ? 1 : -1) * run;
        l.scaling.y = data.power === "robot" ? 1.25 : 1;
      });
      a.torso.visible = !isEnemy || (!drone && !turret);
      a.arms.forEach((arm, i) => {
        setSubtreeVisible(arm, !isEnemy || (!drone && !turret));
        arm.rotation.z =
          data.charge > 0.2
            ? (i ? 1 : -1) * 1.45
            : data.pose > 0
              ? (i ? 1 : -1) * 1.3
              : (i ? 1 : -1) * 0.12;
        arm.rotation.x = run * (i ? -1 : 1);
      });
      if (!isEnemy && data.pose > 0 && !data.grounded && a.kind === "steel")
        a.legs[data.facing > 0 ? 1 : 0].rotation.z = -data.facing * 1.2;
      if (drone && isEnemy) a.r.position.y = data.y - 0.7;
      if (turret && isEnemy) {
        a.r.position.y = data.y - 0.6;
        setSubtreeVisible(a.legs[0], true);
        setSubtreeVisible(a.legs[1], true);
      }
      if (data.telegraph > 0)
        a.r.scaling.set(1, Math.max(0.08, 1 - data.telegraph / 0.85), 1);
      else a.r.scaling.set(1, 1, 1);
      if (data.invulnerable > 0 && Math.floor(g.time * 16) % 2 === 0)
        setSubtreeVisible(a.r, false);
      if (data.power === "robot")
        for (const l of a.legs)
          for (const part of l.children) part.material = m.silver;
      else if (a.kind === "echo")
        for (const l of a.legs)
          for (const part of l.children) part.material = m.green;
    }
    const observer = new ResizeObserver(() => {
      camera.radius = Math.max(
        22,
        14 /
          (Math.max(0.5, canvas.clientWidth / canvas.clientHeight) *
            Math.tan(camera.fov / 2)),
      );
      resizeEngine(engine);
    });
    observer.observe(canvas);
    let closed = false;
    onBeforeRender(scene, (ms) => {
      if (!closed) update(Math.min(ms / 1000, 0.05));
    });
    const render = (g) => {
      shadows.forEach((n, i) => {
        const a = i === 0 ? g.player : g.enemies[i - 1];
        n.visible = !!a;
        if (!a) return;
        const platform = PLATFORMS.filter(
          (f) => Math.abs(a.x - f.x) < f.w / 2 && a.y >= f.y - 0.1,
        ).sort((a, b) => b.y - a.y)[0];
        const floor = platform?.y ?? 0;
        pos(n, a.x, floor + 0.025, 0);
        const size = Math.max(0.45, 1 - (a.y - floor) * 0.05);
        n.scaling.set(size, 0.02, size * 0.6);
      });
      for (const [k, a] of Object.entries(heroes))
        drawActor(a, g.player, g, k === g.hero);
      enemies.forEach((a, i) => drawActor(a, g.enemies[i], g, !!g.enemies[i]));
      bullets.forEach((n, i) => {
        const b = g.bullets[i];
        n.visible = !!b;
        if (!b) return;
        pos(n, b.x, b.y, -0.15);
        n.material =
          b.kind === "enemy"
            ? m.orange
            : b.kind === "web"
              ? m.white
              : b.kind === "shock"
                ? m.gold
                : m.green;
        const s = b.radius / 0.15;
        n.scaling.set(b.kind === "laser" ? 3 : s, s, s);
      });
      effects.forEach((n, i) => {
        const e = g.effects[i];
        n.visible = !!e;
        if (!e) return;
        pos(n, e.x, e.y, -0.3);
        n.material =
          e.color === "red"
            ? m.red
            : e.color === "green"
              ? m.green
              : e.color === "white"
                ? m.white
                : m.cyan;
        const s = e.size * (1.1 - e.life / e.maxLife);
        n.scaling.set(s, s, s);
      });
      pickups.forEach((n, i) => {
        const item = g.pickups[i];
        setSubtreeVisible(n, !!item);
        if (item) {
          pos(n, item.x, item.y + Math.sin(g.time * 3) * 0.1, 0);
          n.rotation.y = g.time * 1.5;
          n.children[0].material = item.kind === "health" ? m.green : m.cyan;
        }
      });
    };
    await registerScene(scene);
    await startEngine(engine);
    return {
      render,
      dispose() {
        closed = true;
        observer.disconnect();
        disposeEngine(engine);
      },
    };
  } catch (error) {
    disposeEngine(engine);
    throw error;
  }
}
