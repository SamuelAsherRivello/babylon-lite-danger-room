import { useEffect, useRef, useState } from "react";
import versionText from "../../version.txt?raw";
import { createGame, startGame, togglePause, step, HEROES } from "./game.js";
import { buildScene } from "./scene.js";

const repo = "https://github.com/SamuelAsherRivello/babylon-lite-danger-room";
const keyMap = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyC: "jump",
  Space: "jump",
  KeyV: "attack",
};
function HeroArt({ hero }) {
  const steel = hero === "steel",
    echo = hero === "echo";
  return (
    <svg className="hero-art" viewBox="0 0 180 180" aria-hidden="true">
      <defs>
        <linearGradient id={`suit-${hero}`} x2="1" y2="1">
          <stop stopColor={steel ? "#e3edf9" : echo ? "#c6ec89" : "#fa765e"} />
          <stop
            offset="1"
            stopColor={steel ? "#647990" : echo ? "#618940" : "#9b302e"}
          />
        </linearGradient>
      </defs>
      <circle
        cx="90"
        cy="85"
        r="64"
        fill="none"
        stroke="currentColor"
        opacity=".1"
      />
      <path d="M20 137H160M90 10V164" stroke="currentColor" opacity=".08" />
      <ellipse cx="90" cy="164" rx="42" ry="5" fill="#000" opacity=".4" />
      <g
        fill={`url(#suit-${hero})`}
        stroke="#111c26"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        <path
          d={
            steel
              ? "M64 55L44 64 34 106 48 115 66 81 69 114 112 114 116 81 132 115 147 104 133 65 115 55Z"
              : "M72 57L51 69 39 105 52 113 69 84 70 115 109 115 112 83 127 108 140 101 126 66 108 57Z"
          }
        />
        <path
          d="M70 110L67 153 58 163H84L90 124 97 162H124L112 151 110 110Z"
          fill={echo ? "#252f37" : steel ? "#5a3b63" : "#233951"}
        />
        <path
          d="M74 17Q91 5 107 21L110 41 101 59 79 59 69 40Z"
          fill={echo ? "#d3a081" : `url(#suit-${hero})`}
        />
      </g>
      {echo ? (
        <>
          <path
            d="M69 42L65 26 77 12 103 11 115 24 114 62 104 52 105 24 89 27 77 25 75 47Z"
            fill="#74452f"
          />
          <path d="M78 13L89 12 88 28 78 30Z" fill="#fff8db" />
          <path d="M71 67L92 83 111 62 111 75 92 95 68 80Z" fill="#687b52" />
          <path d="M79 37H87M96 37H104" stroke="#d6fc89" strokeWidth="3" />
        </>
      ) : steel ? (
        <>
          <path d="M74 32H85M96 32H107" stroke="#fff" strokeWidth="4" />
          <path
            d="M62 72H119M65 82H116M68 92H114M70 102H112M75 44H105"
            stroke="#475b71"
            strokeWidth="2"
          />
          <path d="M72 15L84 9 104 14 110 26 99 21 75 25Z" fill="#323c4a" />
        </>
      ) : (
        <>
          <path
            d="M73 29L87 35 84 41 75 37ZM107 29L94 35 97 41 105 37Z"
            fill="#fff2dd"
          />
          <path
            d="M90 73V98M77 77L103 92M103 77L77 92M77 71L104 99M104 71L77 99"
            stroke="#202e3c"
            strokeWidth="3"
          />
          <path
            d="M90 18V58M72 44L109 25M72 25L109 44"
            stroke="#722d30"
            fill="none"
            opacity=".6"
          />
        </>
      )}
    </svg>
  );
}
function soundSystem() {
  let ctx;
  return {
    unlock() {
      try {
        ctx ??= new AudioContext();
        void ctx.resume();
      } catch {}
    },
    play(type) {
      if (!ctx || ctx.state !== "running") return;
      const o = ctx.createOscillator(),
        gain = ctx.createGain();
      o.type = type === "hurt" ? "sawtooth" : "triangle";
      const f =
        {
          web: 550,
          laser: 780,
          shock: 90,
          punch: 150,
          hit: 280,
          destroy: 110,
          jump: 330,
          pickup: 880,
          absorb: 660,
          wave: 440,
          over: 65,
        }[type] || 200;
      o.frequency.setValueAtTime(f, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        type === "pickup" ? 1300 : Math.max(40, f * 0.4),
        ctx.currentTime + 0.16,
      );
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(gain);
      gain.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    },
    dispose() {
      void ctx?.close();
    },
  };
}
export function App() {
  const canvas = useRef(null),
    game = useRef(createGame()),
    keys = useRef(new Set()),
    pointers = useRef(new Map()),
    audio = useRef(null);
  const [selected, setSelected] = useState("spider"),
    [screen, setScreen] = useState("select"),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [hud, setHud] = useState({
      wave: 1,
      time: 60,
      hp: 100,
      maxHp: 100,
      score: 0,
      kills: 0,
      power: null,
      powerTime: 0,
      charge: 0,
      banner: 0,
      intermission: 0,
      shield: 0,
    }),
    [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false),
    [active, setActive] = useState({}),
    [best, setBest] = useState(() => {
      try {
        return Number(localStorage.getItem("danger-room-best") || 0);
      } catch {
        return 0;
      }
    });
  const mutedRef = useRef(false),
    bestRef = useRef(best),
    sceneLifecycle = useRef(Promise.resolve());
  function clearInput() {
    keys.current.clear();
    pointers.current.clear();
    setActive({});
    game.current.previous = {};
    game.current.player.charge = 0;
  }
  function pause() {
    togglePause(game.current);
    clearInput();
    setScreen(game.current.phase);
  }
  function begin() {
    clearInput();
    audio.current?.unlock();
    game.current = createGame(selected);
    startGame(game.current);
    setScreen("playing");
    setHelp(false);
    canvas.current?.focus();
  }
  function choose(id) {
    setSelected(id);
    if (screen === "select") game.current = createGame(id);
  }
  function home() {
    clearInput();
    game.current = createGame(selected);
    setScreen("select");
  }
  useEffect(() => {
    let renderer,
      cancelled = false,
      lastHud = 0,
      fixture;
    audio.current = soundSystem();
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("verify")
    )
      import("./verification.js").then(({ verification }) => {
        if (!cancelled)
          fixture = verification({
            getGame: () => game.current,
            replace: (g) => {
              clearInput();
              game.current = g;
              setSelected(g.hero);
              setScreen(g.phase);
            },
            canvas: canvas.current,
          });
      });
    const input = () => {
      const v = {};
      for (const k of keys.current) v[k] = true;
      for (const k of pointers.current.values()) v[k] = true;
      return v;
    };
    const tick = (dt) => {
      if (cancelled) return;
      fixture?.before();
      const g = game.current;
      const count = Math.max(1, Math.ceil(dt / (1 / 60)));
      for (let i = 0; i < count; i++) {
        step(g, input(), dt / count);
        if (g.phase === "playing" && !mutedRef.current)
          for (const e of g.events) audio.current?.play(e);
      }
      renderer?.render(g);
      if (g.phase === "over") {
        setScreen("over");
        if (g.score > bestRef.current) {
          bestRef.current = g.score;
          setBest(g.score);
          try {
            localStorage.setItem("danger-room-best", String(g.score));
          } catch {}
        }
      }
      lastHud += dt;
      if (lastHud > 0.06) {
        lastHud = 0;
        const p = g.player;
        setHud({
          wave: g.wave,
          time: Math.ceil(60 - g.waveTime),
          hp: Math.ceil(p.hp),
          maxHp: p.maxHp,
          score: g.score,
          kills: g.kills,
          power: p.power,
          powerTime: p.powerTime,
          charge: p.charge,
          banner: g.banner,
          intermission: Math.ceil(g.intermission),
          shield: p.shield,
        });
      }
    };
    // Serialize GPU setup so a cancelled initialization cannot unconfigure a newer canvas.
    sceneLifecycle.current = sceneLifecycle.current
      .catch(() => {})
      .then(() => (cancelled ? null : buildScene(canvas.current, tick)))
      .then((r) => {
        if (!r) return;
        if (cancelled) {
          r.dispose();
          return;
        }
        renderer = r;
        renderer.render(game.current);
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setError(e.message || "Could not initialize graphics.");
        }
      });
    const down = (e) => {
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLAnchorElement
      )
        return;
      if (keyMap[e.code]) {
        e.preventDefault();
        keys.current.add(keyMap[e.code]);
      }
      if (!e.repeat && (e.code === "Escape" || e.code === "KeyP")) {
        if (["playing", "paused"].includes(game.current.phase)) {
          togglePause(game.current);
          clearInput();
          setScreen(game.current.phase);
        }
      }
    };
    const up = (e) => {
      if (keyMap[e.code]) {
        e.preventDefault();
        keys.current.delete(keyMap[e.code]);
      }
    };
    const blur = () => {
      clearInput();
      if (game.current.phase === "playing") {
        game.current.phase = "paused";
        setScreen("paused");
      }
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      fixture?.dispose();
      renderer?.dispose();
      audio.current?.dispose();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  function release(e) {
    pointers.current.delete(e.pointerId);
    setActive(
      Object.fromEntries([...pointers.current.values()].map((k) => [k, true])),
    );
  }
  function pointer(action) {
    return {
      onPointerDown: (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, action);
        audio.current?.unlock();
        setActive(
          Object.fromEntries(
            [...pointers.current.values()].map((k) => [k, true]),
          ),
        );
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
    };
  }
  const playing = screen === "playing",
    hero = HEROES[selected];
  return (
    <div className="app-shell">
      <header>
        <div className="corner corner_top_left brand">
          <span className="brand-mark">
            Ⅾ<span>∕</span>
          </span>
          <div>
            <h1>
              DANGER ROOM<span className="title-dot">®</span>
            </h1>
            <p>SUPERHUMAN TRAINING FACILITY</p>
          </div>
        </div>
        <div className="corner corner_top_right header-links">
          <span className="system-status">
            <i /> SYSTEM ONLINE
          </span>
          <a
            href={repo}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
          >
            SOURCE ↗
          </a>
        </div>
      </header>
      <main>
        <div className="facility-line">
          <span>
            <i /> CHAMBER 01 <b>/</b> COMBAT SIMULATION
          </span>
          <span>
            ENDLESS PROTOCOL <b>∞</b>
          </span>
        </div>
        <section className="arena" aria-label="Danger Room game">
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="3D arena. Move with WASD or arrows. C jumps, V attacks."
          />
          <div className="arena-vignette" />
          {screen !== "select" && (
            <div className="hud">
              <div className="vitals">
                <span className="eyebrow">
                  {hero.name.toUpperCase()}{" "}
                  <small>
                    {hud.hp} / {hud.maxHp}
                  </small>
                </span>
                <div className="health-track">
                  <div
                    style={{
                      width: `${(hud.hp / hud.maxHp) * 100}%`,
                      background: hero.color,
                    }}
                  />
                </div>
                <span className="ability-status">
                  {hud.power
                    ? `${hud.power.toUpperCase()} ABSORBED · ${hud.powerTime.toFixed(1)}s`
                    : hud.shield > 0
                      ? `SHIELD · ${hud.shield.toFixed(1)}s`
                      : hero.role}
                </span>
              </div>
              <div className="wave-clock">
                <span>WAVE {String(hud.wave).padStart(2, "0")}</span>
                <strong>
                  {String(hud.time).padStart(2, "0")}
                  <small>s</small>
                </strong>
              </div>
              <div className="score">
                <span>SCORE</span>
                <strong>{String(hud.score).padStart(6, "0")}</strong>
                <button
                  onClick={pause}
                  aria-label="Pause game"
                  disabled={!playing}
                >
                  Ⅱ
                </button>
              </div>
            </div>
          )}
          {playing && hud.charge > 0.2 && (
            <div className="charge">
              <span>SHOCKWAVE / {Math.round((hud.charge / 3) * 100)}%</span>
              <div style={{ width: `${(hud.charge / 3) * 100}%` }} />
            </div>
          )}
          {playing && hud.intermission > 0 && (
            <div className="wave-countdown" role="status" aria-live="polite">
              <span className="eyebrow">
                WAVE CLEARED · +1,000 POINTS · +20 HEALTH
              </span>
              <strong>
                Wave {hud.wave} in {hud.intermission} secs...
              </strong>
              <span>Catch your breath. The room is recalibrating.</span>
              <div className="countdown-track">
                <i style={{ width: `${(hud.intermission / 5) * 100}%` }} />
              </div>
            </div>
          )}
          {playing && hud.intermission === 0 && hud.banner > 0 && (
            <div className="wave-banner">
              <span>PROTOCOL ENGAGED</span>
              <strong>WAVE {String(hud.wave).padStart(2, "0")}</strong>
              <p>Survive 60 seconds.</p>
            </div>
          )}
          {screen === "select" && !error && (
            <div className="selection overlay">
              <div className="selection-heading">
                <span className="eyebrow orange">// SELECT YOUR OPERATIVE</span>
                <h2>
                  Built to test.
                  <br />
                  <em>Born to survive.</em>
                </h2>
                <p>One room. Sixty seconds. No final wave.</p>
              </div>
              <div className="hero-grid">
                {Object.entries(HEROES).map(([id, h], i) => (
                  <button
                    key={id}
                    className={`hero-card ${selected === id ? "selected" : ""}`}
                    onClick={() => choose(id)}
                    aria-pressed={selected === id}
                    style={{ "--hero": h.color }}
                  >
                    <div className="card-top">
                      <span>0{i + 1}</span>
                      <span>{selected === id ? "● SELECTED" : "○"}</span>
                    </div>
                    <HeroArt hero={id} />
                    <h3>{h.name}</h3>
                    <span className="hero-role">{h.role}</span>
                    <p>{h.description}</p>
                  </button>
                ))}
              </div>
              <div className="deploy-row">
                <p>{hero.tip}</p>
                <button className="primary" onClick={begin} disabled={!ready}>
                  {ready ? "ENTER THE ROOM" : "INITIALIZING"} <span>→</span>
                </button>
              </div>
            </div>
          )}
          {screen === "paused" && (
            <div className="overlay centered">
              <span className="eyebrow orange">SIMULATION SUSPENDED</span>
              <h2>Take a breath.</h2>
              <p>The room will wait.</p>
              <button className="primary" onClick={pause}>
                RESUME TRAINING →
              </button>
              <button className="text-button" onClick={home}>
                Change operative
              </button>
            </div>
          )}
          {screen === "over" && (
            <div className="overlay centered">
              <span className="eyebrow orange">SESSION COMPLETE</span>
              <h2>
                Limits are
                <br />
                <em>made to break.</em>
              </h2>
              <div className="result-row">
                <div>
                  <span>SCORE</span>
                  <strong>{hud.score.toLocaleString()}</strong>
                </div>
                <div>
                  <span>WAVE</span>
                  <strong>{hud.wave}</strong>
                </div>
                <div>
                  <span>ELIMINATED</span>
                  <strong>{hud.kills}</strong>
                </div>
              </div>
              <button className="primary" onClick={begin}>
                RUN IT BACK →
              </button>
              <button className="text-button" onClick={home}>
                Change operative
              </button>
            </div>
          )}
          {error && (
            <div className="overlay centered">
              <span className="eyebrow orange">GRAPHICS UNAVAILABLE</span>
              <h2>A little more power.</h2>
              <p>
                This room needs WebGPU. Use a current Chrome or Edge browser
                with hardware acceleration enabled.
              </p>
              <details>
                <summary>Technical details</summary>
                {error}
              </details>
              <button className="primary" onClick={() => location.reload()}>
                TRY AGAIN →
              </button>
            </div>
          )}
          <div className="arena-label">
            <span>DR—01</span>
            <span>HOLOGRAPHIC THREAT SYSTEM</span>
            <span>LIVE SIMULATION</span>
          </div>
        </section>
        <div className="control-deck">
          <div className="virtual-controls">
            <div className="dpad">
              {[
                ["up", "↑"],
                ["left", "←"],
                ["down", "↓"],
                ["right", "→"],
              ].map(([a, s]) => (
                <button
                  key={a}
                  className={`${a} ${active[a] ? "held" : ""}`}
                  {...pointer(a)}
                  aria-label={`Move ${a}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="control-caption">
              MOVE <kbd>WASD</kbd> / <kbd>↑↓←→</kbd>
            </span>
          </div>
          <div className="training-note">
            <span className="orange">THE RULE IS SIMPLE</span>
            <p>Stay moving. Stay alive.</p>
            <small>
              {best
                ? `PERSONAL BEST ${best.toLocaleString()}`
                : "EVERY WAVE HITS HARDER."}
            </small>
          </div>
          <div className="action-controls">
            <div>
              <button
                className={`action jump ${active.jump ? "held" : ""}`}
                {...pointer("jump")}
                aria-label="Jump"
              >
                ↟
              </button>
              <span>
                JUMP <kbd>C</kbd>
              </span>
            </div>
            <div>
              <button
                className={`action attack ${active.attack ? "held" : ""}`}
                {...pointer("attack")}
                aria-label="Attack"
              >
                ✦
              </button>
              <span>
                ATTACK <kbd>V</kbd>
              </span>
            </div>
          </div>
        </div>
      </main>
      <footer>
        <div className="corner corner_bottom_left settings">
          <button
            onClick={() => {
              setMuted(!muted);
              mutedRef.current = !muted;
              audio.current?.unlock();
            }}
            aria-label={muted ? "Enable sound" : "Mute sound"}
          >
            SOUND {muted ? "OFF" : "ON"}
          </button>
          <span>/</span>
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void document.documentElement
                  .requestFullscreen?.()
                  .catch(() => {});
            }}
          >
            FULLSCREEN ↗
          </button>
          <span>/</span>
          <button
            onClick={() => {
              if (playing) pause();
              setHelp(!help);
            }}
          >
            HOW TO PLAY
          </button>
        </div>
        <div className="corner corner_bottom_right">
          <span>BABYLON LITE</span>
          <span id="version">
            v{versionText.trim().replace(/^version=/, "")}
          </span>
        </div>
      </footer>
      {help && (
        <div className="help-backdrop">
          <section className="help">
            <button
              className="close"
              onClick={() => setHelp(false)}
              aria-label="Close instructions"
            >
              ×
            </button>
            <span className="eyebrow orange">FIELD MANUAL</span>
            <h2>Know your power.</h2>
            <p>
              Survive each 60-second wave. Eliminate holograms for points.
              Collect green health cubes or shields on platforms. Each cleared
              wave restores up to 20 health, then gives you a five-second
              breather.
            </p>
            {Object.entries(HEROES).map(([id, h]) => (
              <p key={id}>
                <strong style={{ color: h.color }}>{h.name} — </strong>
                {h.tip}
              </p>
            ))}
            <p>
              <strong>Move:</strong> WASD / arrows · <strong>Jump:</strong> C ·{" "}
              <strong>Attack:</strong> V · <strong>Pause:</strong> P / Esc. Down
              drops through platforms. Up/down aim ranged attacks. Touch
              controls support movement and actions together.
            </p>
            <button className="primary" onClick={() => setHelp(false)}>
              GOT IT →
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
