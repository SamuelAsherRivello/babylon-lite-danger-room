import {
  createEngine,
  createSceneContext,
  createArcRotateCamera,
  createHemisphericLight,
  createPointLight,
  createDirectionalLight,
  createPcfDirectionalShadowGenerator,
  setShadowTaskCasterMeshes,
  registerSceneWithShadowSupport,
  createTexture2DFromPixels,
  createCapsule,
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
    addToScene(scene, createHemisphericLight([0.4, 1, -0.8], 0.8));
    const keyLight = createDirectionalLight([0.35, -1, 0.7], 2.4);
    addToScene(scene, keyLight);
    const shadow = createPcfDirectionalShadowGenerator(engine, keyLight, {
      mapSize: 2048,
      bias: 0.001,
      normalBias: 0.025,
      darkness: 0.35,
    });
    keyLight.shadowGenerator = shadow;
    addToScene(scene, shadow);
    addToScene(scene, createPointLight([-9, 7, -1], 65));
    addToScene(scene, createPointLight([8, 9, -3], 110));
    // Deterministic brushed steel: original pixel data, shared across room materials.
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4;
        const grain = ((x * 13 + y * 71) % 17) + Math.sin(y * 2.3) * 13;
        const edge = x < 3 || y < 3 || x > 124 || y > 124 ? -42 : 0;
        const v = 208 + grain + edge;
        pixels.set([v, v, v, 255], i);
      }
    const brushed = createTexture2DFromPixels(engine, pixels, 128, 128, {
      minFilter: "linear",
      magFilter: "linear",
      srgb: true,
    });
    function mat(rgb, metal = 0.1, glow = 0, roughness = 0.42) {
      const m = createPbrMaterial({
        baseColorFactor: [...rgb, 1],
        metallicFactor: metal,
        roughnessFactor: roughness,
      });
      if (glow)
        setPbrEmissive(
          m,
          rgb.map((v) => v * glow),
        );
      return m;
    }
    const m = {
      wall: mat([0.23, 0.29, 0.34], 0.65),
      dark: mat([0.025, 0.043, 0.06], 0.4),
      rim: mat([0.36, 0.43, 0.48], 0.75),
      floor: mat([0.22, 0.27, 0.3], 0.6),
      cyan: mat([0.04, 0.65, 0.82], 0.2, 1),
      ice: mat([0.28, 0.88, 1], 0.2, 0.8),
      holo: mat([0.025, 0.26, 0.34], 0.4, 0.55),
      orange: mat([1, 0.3, 0.06], 0.2, 0.8),
      red: mat([0.88, 0.12, 0.08], 0.25, 0.25),
      blue: mat([0.025, 0.08, 0.16], 0.25),
      silver: mat([0.68, 0.75, 0.83], 0.8, 0, 0.24),
      white: mat([0.8, 0.93, 1], 0.2, 0.8),
      green: mat([0.57, 0.83, 0.24], 0.25, 0.45),
      purple: mat([0.18, 0.07, 0.23], 0.3),
      skin: mat([0.65, 0.36, 0.24]),
      hair: mat([0.16, 0.08, 0.04]),
      black: mat([0.015, 0.021, 0.027]),
      gold: mat([0.95, 0.63, 0.15], 0.5, 0.25),
    };
    for (const name of ["wall", "rim", "floor", "silver"])
      m[name].baseColorTexture = brushed;
    const casters = [];
    const pos = (n, x, y, z = 0) => {
      n.position.set(x, y, z);
      return n;
    };
    function box(x, y, z, w, h, d, material, parent) {
      const n = createBox(engine, { width: w, height: h, depth: d });
      n.material = material;
      n.receiveShadows = true;
      if (w < 8 && h < 8) casters.push(n);
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      addToScene(scene, n);
      return n;
    }
    function sphere(x, y, z, size, material, parent) {
      const n = createSphere(engine, { diameter: size, segments: 16 });
      n.material = material;
      n.receiveShadows = true;
      casters.push(n);
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      addToScene(scene, n);
      return n;
    }
    function cylinder(x, y, z, diameter, height, material, parent) {
      const n = createCylinder(engine, { diameter, height, tessellation: 16 });
      n.material = material;
      n.receiveShadows = true;
      casters.push(n);
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
    function capsule(x, y, z, radius, height, material, parent) {
      const n = createCapsule(engine, {
        radius,
        height,
        tessellation: 12,
        capSubdivisions: 3,
      });
      n.material = material;
      n.receiveShadows = true;
      casters.push(n);
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      addToScene(scene, n);
      return n;
    }
    function ring(x, y, z, diameter, material, parent, vertical = false) {
      const n = createTorus(engine, {
        diameter,
        thickness: 0.045,
        tessellation: 24,
      });
      n.material = material;
      if (parent) setParent(n, parent);
      pos(n, x, y, z);
      if (vertical) n.rotation.x = Math.PI / 2;
      addToScene(scene, n);
      return n;
    }
    function sign(text, x, y, width, height, color = "#c0d0d2") {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext("2d");
      ctx.translate(0, 128);
      ctx.scale(1, -1);
      ctx.fillStyle = "#18252b";
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = "#53636a";
      ctx.lineWidth = 3;
      ctx.strokeRect(5, 5, 502, 118);
      ctx.fillStyle = color;
      ctx.font = "bold 52px monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, 256, 84);
      const material = mat([0.85, 0.9, 0.95], 0.2);
      material.baseColorTexture = createTexture2DFromPixels(
        engine,
        new Uint8Array(ctx.getImageData(0, 0, 512, 128).data),
        512,
        128,
        { minFilter: "linear", magFilter: "linear", srgb: true },
      );
      box(x, y, 2.39, width, height, 0.025, material);
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
      for (const s of [-1, 1]) {
        const brace = box(
          f.x + s * f.w * 0.32,
          f.y - 0.8,
          1.2,
          0.14,
          1.2,
          0.18,
          m.rim,
        );
        brace.rotation.x = -0.75;
        cylinder(
          f.x + s * f.w * 0.38,
          f.y - 0.22,
          -0.79,
          0.11,
          0.08,
          m.silver,
        ).rotation.x = Math.PI / 2;
      }
    }
    // Recessed service bays, pressure pipes and structural ribs give the room depth.
    for (const s of [-1, 1]) {
      for (const x of [4.3, 9.8]) {
        box(s * x, 5.9, 2.5, 0.23, 11.6, 0.35, m.rim);
        box(s * x, 5.9, 2.25, 0.06, 10.7, 0.08, m.dark);
        for (const y of [1, 4.3, 7, 10.7])
          cylinder(s * x, y, 2.16, 0.12, 0.06, m.silver).rotation.x =
            Math.PI / 2;
      }
      for (const x of [11.4, 11.75]) {
        cylinder(s * x, 6, 2.1, 0.16, 11.2, m.rim);
        for (const y of [1, 3.7, 7.5, 10.5])
          cylinder(s * x, y, 2.1, 0.25, 0.12, m.silver);
      }
      box(s * 7, 8.65, 2.48, 3.7, 2.8, 0.25, m.dark);
      for (let y = 7.45; y < 10; y += 0.23) {
        const slat = box(s * 7, y, 2.22, 3.35, 0.13, 0.26, m.rim);
        slat.rotation.x = 0.35;
      }
      box(s * 7, 10.28, 2.13, 3.7, 0.09, 0.06, m.orange);
      sign(s < 0 ? "SECTOR 01" : "SECTOR 02", s * 7, 6.7, 2.9, 0.52);
      box(s * 10.8, 1.25, 2.42, 1.4, 2.1, 0.25, m.dark);
      ring(s * 10.8, 1.45, 2.2, 0.95, m.rim, null, true);
      for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
        const fan = box(s * 10.8, 1.45, 2.2, 0.73, 0.12, 0.06, m.rim);
        fan.rotation.z = a;
      }
      cylinder(s * 10.8, 1.45, 2.1, 0.24, 0.12, m.cyan).rotation.x =
        Math.PI / 2;
      // Floor projection emitters anchor the holographic training machinery.
      cylinder(s * 10.9, 0.08, 0.3, 1.5, 0.16, m.dark);
      ring(s * 10.9, 0.18, 0.3, 1.2, m.cyan);
    }
    sign("DANGER ROOM", 0, 10.8, 5.9, 0.82, "#f2b363");
    sign("LIVE / TRAINING", 0, 7.12, 3.7, 0.46);
    // Recessed observation window and a physical concentric chamber emblem.
    box(0, 8.8, 2.48, 6.8, 2.6, 0.25, m.rim);
    box(0, 8.8, 2.3, 6.5, 2.3, 0.18, m.black);
    for (const x of [-2.7, -1.35, 0, 1.35, 2.7])
      box(x, 8.8, 2.18, 0.06, 2.3, 0.08, m.rim);
    for (const x of [-2.1, 0, 2.1]) {
      box(x, 8.65, 2.16, 0.82, 0.45, 0.04, m.holo);
      box(x, 8.6, 2.12, 0.55, 0.025, 0.02, m.cyan);
      box(x, 8.4, 2.1, 1, 0.08, 0.28, m.rim);
    }
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
      const body = enemy ? m.holo : steel ? m.silver : echo ? m.purple : m.red;
      const trim = enemy ? m.cyan : steel ? m.purple : echo ? m.green : m.blue;
      const group = (name, parent, x = 0, y = 0, z = 0) => {
        const n = root(name);
        setParent(n, parent);
        pos(n, x, y, z);
        return n;
      };
      const torso = group("torso", r);
      const chest = sphere(0, 1.12, 0, 0.72, body, torso);
      chest.scaling.set(steel ? 1.3 : 0.91, 0.94, 0.64);
      capsule(0, 0.85, 0, steel ? 0.3 : 0.22, 0.47, trim, torso);
      box(0, 0.72, -0.005, steel ? 0.7 : 0.53, 0.11, 0.39, body, torso);
      box(0, 0.74, -0.22, 0.13, 0.1, 0.06, enemy ? m.ice : m.gold, torso);
      cylinder(0, 1.49, 0, 0.2, 0.19, body, torso);
      const head = group("head", r, 0, 1.7);
      const skull = sphere(0, 0, 0, 0.44, echo ? m.skin : body, head);
      skull.scaling.set(0.87, 1.15, 0.92);
      box(0, -0.12, -0.11, 0.25, 0.13, 0.19, echo ? m.skin : body, head);
      for (const side of [-1, 1]) {
        const eye = sphere(
          side * 0.105,
          0.04,
          -0.195,
          0.13,
          enemy ? m.ice : m.white,
          head,
        );
        eye.scaling.set(1, 0.58, 0.23);
        eye.rotation.z = side * 0.25;
      }
      if (steel || echo) {
        sphere(0, -0.025, -0.22, 0.075, echo ? m.skin : m.silver, head);
        box(0, -0.105, -0.213, 0.11, 0.018, 0.016, m.dark, head);
      }
      if (echo) {
        const hair = sphere(0, 0.12, 0.05, 0.46, m.hair, head);
        hair.scaling.set(1.03, 0.75, 1.04);
        capsule(-0.19, -0.04, 0.04, 0.09, 0.5, m.hair, head);
        capsule(0.19, -0.04, 0.04, 0.09, 0.5, m.hair, head);
        const streak = capsule(-0.08, 0.14, -0.15, 0.065, 0.25, m.white, head);
        streak.rotation.z = 0.3;
        box(0, 0.04, -0.199, 0.31, 0.06, 0.022, m.green, head);
      }
      if (kind === "spider") {
        sphere(0, 1.15, -0.255, 0.13, m.black, torso);
        for (const side of [-1, 1])
          for (const y of [1.03, 1.14, 1.25]) {
            const leg = box(
              side * 0.12,
              y,
              -0.25,
              0.21,
              0.023,
              0.02,
              m.black,
              torso,
            );
            leg.rotation.z = side * 0.5;
          }
        for (const y of [-0.06, 0.12]) ring(0, y, 0, 0.415, m.blue, head);
      }
      if (steel)
        for (let y = 0.91; y < 1.38; y += 0.1)
          box(0, y, -0.23, 0.67, 0.016, 0.025, m.dark, torso);
      if (enemy) {
        box(0, 1.14, -0.25, 0.25, 0.29, 0.06, m.cyan, torso);
        for (const y of [0.86, 1.04, 1.3])
          box(0, y, -0.255, 0.57, 0.02, 0.03, m.ice, torso);
      }
      const elbows = [],
        knees = [],
        robotParts = [];
      const arms = [-1, 1].map((side) => {
        const a = group("shoulder", r, side * (steel ? 0.52 : 0.39), 1.32);
        sphere(0, 0, 0, steel ? 0.37 : 0.28, body, a);
        capsule(0, -0.17, 0, steel ? 0.145 : 0.105, 0.39, body, a);
        const fore = group("elbow", a, 0, -0.34);
        sphere(0, 0, 0, 0.19, enemy ? m.ice : trim, fore);
        capsule(0, -0.12, -0.015, steel ? 0.145 : 0.1, 0.31, body, fore);
        cylinder(0, -0.22, -0.015, steel ? 0.32 : 0.23, 0.1, trim, fore);
        const fist = sphere(0, -0.31, -0.035, steel ? 0.3 : 0.21, body, fore);
        fist.scaling.set(1, 1.05, 0.85);
        if (!enemy)
          for (const x of [-0.06, 0, 0.06])
            box(x, -0.31, -0.135, 0.015, 0.09, 0.015, trim, fore);
        elbows.push(fore);
        return a;
      });
      const legs = [-1, 1].map((side) => {
        const a = group("hip", r, side * 0.19, 0.69);
        const thigh = capsule(0, -0.14, 0, steel ? 0.145 : 0.12, 0.36, trim, a);
        const shin = group("knee", a, 0, -0.33);
        sphere(0, 0, -0.03, 0.22, body, shin);
        const calf = capsule(0, -0.12, 0, 0.115, 0.31, trim, shin);
        const boot = box(0, -0.26, -0.07, 0.26, 0.17, 0.4, body, shin);
        box(0, -0.31, -0.075, 0.27, 0.055, 0.42, enemy ? m.cyan : m.dark, shin);
        if (echo) robotParts.push(thigh, calf, boot);
        knees.push(shin);
        return a;
      });
      const drone = group("drone-head", r, 0, 1.68);
      const hull = sphere(0, 0, 0, 0.56, m.holo, drone);
      hull.scaling.set(1.18, 0.75, 0.9);
      sphere(0, 0, -0.27, 0.2, m.ice, drone);
      const rotors = [];
      for (const side of [-1, 1]) {
        box(side * 0.38, 0, 0, 0.4, 0.07, 0.1, m.rim, drone);
        ring(side * 0.61, 0.08, 0, 0.53, m.cyan, drone);
        const blade = box(
          side * 0.61,
          0.09,
          0,
          0.46,
          0.035,
          0.06,
          m.ice,
          drone,
        );
        rotors.push(blade);
        cylinder(side * 0.61, 0.04, 0, 0.12, 0.15, m.holo, drone);
      }
      const turret = group("turret-head", r, 0, 1.64);
      box(0, 0, 0, 0.63, 0.36, 0.49, m.holo, turret);
      box(0, 0.19, 0, 0.5, 0.06, 0.4, m.cyan, turret);
      const barrel = cylinder(0.48, 0, -0.08, 0.17, 0.7, m.rim, turret);
      barrel.rotation.z = Math.PI / 2;
      const muzzle = cylinder(0.83, 0, -0.08, 0.2, 0.06, m.ice, turret);
      muzzle.rotation.z = Math.PI / 2;
      sphere(0.16, 0.07, -0.25, 0.13, m.orange, turret);
      const base = group("turret-base", r);
      cylinder(0, 0.25, 0, 0.27, 0.5, m.holo, base);
      cylinder(0, 0.07, 0, 0.7, 0.13, m.holo, base);
      for (const side of [-1, 1]) {
        const leg = box(side * 0.3, 0.17, 0, 0.14, 0.36, 0.22, m.cyan, base);
        leg.rotation.z = side * 0.6;
      }
      const projection = ring(0, 0.04, 0, 0.9, m.cyan, r);
      return {
        r,
        torso,
        head,
        arms,
        elbows,
        legs,
        knees,
        drone,
        turret,
        base,
        projection,
        rotors,
        robotParts,
        kind,
      };
    }
    const heroes = Object.fromEntries(
      ["spider", "steel", "echo"].map((k) => [k, actor(k)]),
    );
    const enemies = Array.from({ length: 24 }, () => actor("enemy"));
    setShadowTaskCasterMeshes(shadow, [...casters]);
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
      setSubtreeVisible(a.drone, drone);
      setSubtreeVisible(a.turret, turret);
      a.turret.scaling.x = data.facing;
      a.rotors.forEach((rotor) => {
        rotor.rotation.y = g.time * 38;
      });
      setSubtreeVisible(a.base, isEnemy && turret);
      a.projection.visible = isEnemy;
      const run =
        Math.sin(g.time * 13) *
        (Math.abs(data.vx || 0) > 0.1 || type === "robot" ? 0.65 : 0.06);
      a.legs.forEach((l, i) => {
        setSubtreeVisible(l, !isEnemy || (!drone && !turret));
        l.rotation.x = (i ? 1 : -1) * run;
        l.rotation.z = 0;
        l.scaling.y = 1;
        a.knees[i].rotation.x = Math.max(0, -(i ? 1 : -1) * run) * 0.8;
      });
      setSubtreeVisible(a.torso, !isEnemy || (!drone && !turret));
      a.arms.forEach((arm, i) => {
        setSubtreeVisible(arm, !isEnemy || (!drone && !turret));
        arm.rotation.z =
          data.charge > 0.2
            ? (i ? 1 : -1) * 1.45
            : data.pose > 0
              ? (i ? 1 : -1) * 1.3
              : (i ? 1 : -1) * 0.12;
        arm.rotation.x = run * (i ? -1 : 1);
        a.elbows[i].rotation.x =
          data.charge > 0.2
            ? -0.25
            : data.pose > 0
              ? -0.15
              : -0.35 - Math.max(0, run) * 0.4;
        if (data.wall) {
          arm.rotation.z = (i ? 1 : -1) * 2.6;
          a.legs[i].rotation.z = (i ? 1 : -1) * 0.5;
        }
      });
      if (!isEnemy && data.pose > 0 && !data.grounded && a.kind === "steel")
        a.legs[data.facing > 0 ? 1 : 0].rotation.z = -data.facing * 1.2;
      if (drone && isEnemy) a.r.position.y = data.y - 0.7;
      if (turret && isEnemy) {
        a.turret.position.y = 0.65;
      } else {
        a.turret.position.y = 1.64;
      }
      if (data.telegraph > 0)
        a.r.scaling.set(1, Math.max(0.08, 1 - data.telegraph / 0.85), 1);
      else a.r.scaling.set(1, 1, 1);
      if (
        !g.intermission &&
        data.invulnerable > 0 &&
        Math.floor(g.time * 16) % 2 === 0
      )
        setSubtreeVisible(a.r, false);
      for (const part of a.robotParts)
        part.material = data.power === "robot" ? m.silver : m.green;
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
    await registerSceneWithShadowSupport(scene);
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
