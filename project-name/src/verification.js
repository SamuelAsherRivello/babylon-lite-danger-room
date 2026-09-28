// Development-only browser fixture. Never imported by a production build.
import { createGame, spawnEnemy, startGame } from "./game.js";
export function verification({ getGame, replace, canvas }) {
  const panel = document.createElement("aside");
  panel.style.cssText =
    "position:fixed;z-index:50;right:8px;bottom:8px;background:#11232f;border:1px solid #72d4e9;padding:10px;max-width:480px;font:11px monospace;color:white";
  const out = document.createElement("output");
  out.style.cssText = "display:block;white-space:pre-wrap";
  let mode = "",
    sent = new Set(),
    initial = 0,
    checks = [],
    scenario = "";
  const keyCodes = {
    left: "KeyA",
    right: "KeyD",
    jump: "KeyC",
    attack: "KeyV",
    up: "KeyW",
    down: "KeyS",
  };
  const inject = (values) => {
    canvas.focus();
    for (const [action, code] of Object.entries(keyCodes)) {
      const on = !!values[action];
      if (on !== sent.has(action)) {
        window.dispatchEvent(
          new KeyboardEvent(on ? "keydown" : "keyup", { code, bubbles: true }),
        );
        if (on) sent.add(action);
        else sent.delete(action);
      }
    }
  };
  const button = (name, fn) => {
    const b = document.createElement("button");
    b.textContent = name;
    b.style.cssText =
      "margin:3px;background:#244250;border:1px solid #65878e;padding:5px";
    b.onclick = fn;
    panel.append(b);
  };
  button("Verify full wave", () => {
    inject({});
    const g = createGame("steel", () => 0.6);
    startGame(g);
    replace(g);
    mode = "bot";
    checks = [];
  });
  button("Verify keyboard + pointer", () => {
    inject({});
    const g = createGame("spider", () => 0.6);
    g.spawnIn = 999;
    startGame(g);
    replace(g);
    mode = "input";
    initial = 0;
    checks = [];
  });
  for (const type of ["drone", "turret", "robot"])
    button(`Echo ${type}`, () => {
      inject({});
      const g = createGame("echo");
      g.spawnIn = 999;
      const e = spawnEnemy(g, type);
      e.x = 1;
      e.y = 0;
      e.telegraph = 0;
      startGame(g);
      replace(g);
      mode = "absorb";
      scenario = type;
      initial = 0;
      checks = [];
    });
  button("Stop fixture", () => {
    mode = "";
    inject({});
  });
  panel.append(out);
  document.body.append(panel);
  function before() {
    const g = getGame();
    initial++;
    if (mode === "bot") {
      const target = g.enemies
        .filter((e) => e.telegraph <= 0)
        .sort(
          (a, b) => Math.abs(a.x - g.player.x) - Math.abs(b.x - g.player.x),
        )[0];
      const dx = target ? target.x - g.player.x : 0;
      inject({
        left: dx < -0.8,
        right: dx > 0.8,
        attack: g.time % 3.2 < 3.05,
        jump: !!target && target.y > g.player.y + 1.5 && g.time % 1.2 < 0.5,
      });
      if (g.wave >= 2) {
        checks.push(
          "PASS: survived a complete 60-second wave with unmodified health and damage",
        );
        mode = "";
        inject({});
      }
      if (g.phase === "over") {
        checks.push("Bot defeated; full-wave test incomplete");
        mode = "";
        inject({});
      }
    }
    if (mode === "input") {
      if (initial === 1) inject({ right: true, jump: true, attack: true });
      if (g.time > 1 && checks.length === 0) {
        checks.push(
          g.player.x > 4 && g.bullets.length > 0
            ? "PASS: concurrent keyboard movement / jump / attack"
            : "FAIL keyboard",
        );
        inject({});
        const move = document.querySelector('[aria-label="Move left"]'),
          attack = document.querySelector('[aria-label="Attack"]');
        // setPointerCapture requires real active pointers; override only inside this fixture.
        for (const [el, id] of [
          [move, 101],
          [attack, 102],
        ]) {
          el.setPointerCapture = () => {};
          el.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              pointerId: id,
              pointerType: "touch",
            }),
          );
        }
      }
      if (g.time > 2 && checks.length === 1) {
        checks.push(
          g.player.x < 2 && g.bullets.length > 0
            ? "PASS: concurrent emulated touch movement / attack"
            : "FAIL touch",
        );
        document.querySelector('[aria-label="Move left"]').dispatchEvent(
          new PointerEvent("pointercancel", {
            bubbles: true,
            pointerId: 101,
          }),
        );
        document
          .querySelector('[aria-label="Attack"]')
          .dispatchEvent(
            new PointerEvent("pointerup", { bubbles: true, pointerId: 102 }),
          );
        initial = g.player.x;
      }
      if (g.time > 2.5 && checks.length === 2) {
        checks.push(
          Math.abs(g.player.vx) < 0.01
            ? "PASS: pointer cancellation releases movement"
            : "FAIL cancel",
        );
        window.dispatchEvent(new Event("blur"));
        checks.push(
          g.phase === "paused" ? "PASS: focus loss pauses" : "FAIL blur",
        );
        mode = "";
      }
    }
    if (mode === "absorb") {
      inject({ attack: initial === 1, jump: initial > 2 });
      if (g.player.power === scenario && checks.length === 0)
        checks.push(`PASS: absorbed ${scenario}`);
      if (g.time > 1) {
        checks.push(`power=${g.player.power}, height=${g.player.y.toFixed(2)}`);
        inject({});
        mode = "";
      }
    }
    const p = g.player;
    out.textContent = `DEV VERIFICATION ${mode}\n${checks.join("\n")}\n${g.phase} / wave ${g.wave} / ${g.waveTime.toFixed(1)}s / HP ${p.hp.toFixed(0)} / score ${g.score}\nx=${p.x.toFixed(1)} y=${p.y.toFixed(1)} power=${p.power ?? "none"}`;
  }
  return {
    before,
    dispose() {
      inject({});
      panel.remove();
    },
  };
}
