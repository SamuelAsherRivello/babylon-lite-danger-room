# Verification — industrial refinement, 2026-09-28

## Current local and browser evidence

- All 19 automated tests pass, including five-second safe intermission, exact pause/resume timing, one-time recovery, directional aim, Echo replacement from all three powers and Spider wall-jump launch.
- Formatting check and production build pass. Development fixture labels are absent from production assets.
- Real WebGPU browser: detailed metal room, cast shadows, articulated heroes and all enemy silhouettes inspected at 1280 × 720. Fresh run showed no warning/error console entries.
- A Steel bot using normal health and damage survived the full 60 seconds, observed countdown values 5, 4, 3, 2, 1, and entered wave 2 with 3,250 points and about 58 health. This deterministic fixture uses drone spawns; all enemy types were separately inspected and tested.
- Concurrent keyboard move/jump/attack and emulated touch move/attack passed. Pointer cancellation stopped movement; focus loss paused play.
- Echo absorbed drone, turret and robot forms. Drone flight reached 5.70 units at the one-second observation; robot jump reached 5.05. Model head/leg transformations and return to normal were inspected. Robot feet retain ground alignment.
- Production preview at 390 × 844: Echo's longest instructions and start button fit. Whole arena and controls fit during play; document height equals viewport height. This is responsive emulation, not physical mobile hardware.
- Recent frame-rate samples in this in-app browser ranged roughly 26–31 FPS with the upgraded scene. This is environment-specific observation, not a mobile-performance guarantee.
- Current screenshots: screenshot01.png (production gameplay), mobile-menu.png (production selection), wave-countdown.png (development countdown fixture).

## Earlier release evidence (v0.0.3)


## Local checks

- Clean `npm ci`: passed, zero reported vulnerabilities. Stop the development server before reinstalling on Windows because its native bundler module is file-locked while running.
- `npm test`: 15 tests passed. Covers actual jump reachability, platforms/drop-through, wall climbing, web damage/slow, Steel punch/kick/charge/release, all Echo powers/expiry, enemy behavior, wave scaling, pause, pickup effects, failure and reset.
- `npm run format:check`: passed.
- `npm run build`: passed. Production subpath is `/babylon-lite-danger-room/`.
- Development verification controls are absent from production bundles.
- `openspec doctor --json` and strict change validation passed with CLI 1.13.1.

## Browser evidence

Actual WebGPU rendering in the Codex Chromium in-app browser:

- Desktop 1280 × 720: selection, 3D chamber, animated heroes/enemies, HUD and controls inspected.
- Narrow 390 × 844: all three cards and the start button visible; gameplay retains the entire chamber without scrolling. The narrow menu was corrected after visual inspection found a clipped start button.
- Development fixture dispatched keyboard events through the actual input handlers: simultaneous movement/jump/attack passed.
- Concurrent emulated touch movement and attack passed; pointer cancellation released movement; focus loss paused play.
- A live-rendered Steel bot completed 60 active seconds and advanced to wave 2 with normal health/damage, scoring 4,000 by the next-wave observation. The deterministic fixture used drone spawns; all three enemy behaviors are additionally covered by simulation tests and ordinary random gameplay.
- Echo absorbed each enemy type in separate browser scenarios. Drone flight reached height 5.80 after one second; robot jump reached height 5.17 at the observation. Expiration restored the original form.
- An unattended ordinary Spider session reached defeat; restart and hero selection are available.
- Production preview was opened separately after clean install, with successful scene initialization and start.

Screenshots: `hero-selection.png`, `mobile-menu.png`, and `screenshot01.png` are captures of the actual application.

## Limits

Physical touch hardware, mobile GPU performance, and other browser engines have not been tested. Multi-pointer verification is event emulation, including a fixture-only pointer-capture shim. The fixture is development-only. A full browser refresh is recommended after dependency reinstall or extensive hot module replacement; final verification uses the production bundle.

## Public delivery

Release v0.0.3 succeeded in GitHub Actions run 36424885904. Tag and release commit: 4ea44db873653768965d48f1f455819dd18b8133. Pages deployment run 36424941945 succeeded for that revision. The public HTTPS game initialized WebGPU, displayed v0.0.3, started gameplay, accepted keyboard input, reached defeat, restarted with restored health/time, paused, and returned to hero selection. No warning/error console entries were observed in the fresh public browser tab. Public capture: live-game.png.

Final visual QA found and corrected model part offsets: parenting preserves world position in Babylon Lite, so local positions are now assigned after parenting. GPU initialization is serialized to avoid overlapping setup during hot reload.
