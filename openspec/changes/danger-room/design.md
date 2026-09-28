# Design

## Context
The repository is generated through GitHub's template flow. The existing React/Vite root is project-name/; keep it as AGENTS.md requires. See proposal.md for scope.

## Goals / Non-Goals
Separate deterministic game rules from rendering. Deliver complete local and public gameplay. Multiplayer and licensed artwork are out of scope.

## Decisions
- Use Babylon Lite's functional WebGPU API and original code-native 3D geometry. A fixed slightly elevated frontal camera exposes the chamber's physical depth while keeping platform collisions in a 2D plane.
- Use a landscape arena rather than the skill's portrait default, to preserve spacious side-view combat requested by the user. Responsive letterboxing keeps the whole arena visible.
- Simulation uses seconds and fixed small steps; rendering pools character parts/projectiles. React handles menus and sampled HUD updates.
- Echo is the original name of the Rogue-inspired hero. All stolen powers last ten seconds, refreshed by a successful punch. Robot power gives a higher jump; drone power permits holding jump to fly; turret power supplies directional lasers.
- Preserve the six template OpenSpec files that differ from the shared library; import all other library files unchanged. Both use 1.13.1.
- Template checklist's older copy/rename instructions conflict with AGENTS.md and the invoked skill: retain project-name/ and the authorized GitHub template flow. Do not rewrite the generated initial commit.

## Risks / Trade-offs
- WebGPU availability → show useful recovery guidance on initialization failure.
- Endless scaling can overload devices → cap simultaneous entities while increasing health/damage with wave number.
- No physical touch device → report emulated input verification separately.

## Migration Plan
Build and test, push main, run existing patch release workflow, dispatch Pages, verify public play, then fast-forward local checkout.
