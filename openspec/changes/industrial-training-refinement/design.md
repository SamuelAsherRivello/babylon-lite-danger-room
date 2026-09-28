# Design

## Context

See proposal.md. Existing simulation, React controls, and procedural Babylon Lite scene are separate. The renderer pools 24 enemies and uses local node transforms; parenting preserves world transforms, so local positions must follow parenting.

## Goals / Non-Goals

Goals: readable detailed industrial art, explicit timing, testable wave transitions, and unchanged six-button controls. Non-goals: scrolling, new hero mechanics, external assets or dependencies.

## Decisions

- Confirmed interview: detailed industrial 3D; approachable opening then relentless escalation; one Echo power for ten seconds; directional ranged aiming; five-second intermission with `Wave X in Y secs...`.
- Keep the phase as playing during a safe intermission, using a separate remaining-time field. Pause naturally freezes it. The upcoming wave number increments on clearance, but its 60-second clock stays zero until the countdown ends. Freeze actions and power timers during this breather to preserve the reward. Clear enemies/projectiles, award 1000 points and restore the existing 20 health once.
- Give wave one a short spawn grace period, lower spawn cap and damage, then smoothly reach and exceed the current pressure. Keep unbounded health/damage scaling and bounded visual pools.
- Use reusable beveled forms, jointed limbs, physical pipes, panel recesses, grills and surface details with PBR materials. Keep fixed camera and silhouettes clear; avoid large external models that add download weight.
- Verify directional shots, replacement/expiry, wall jump, exact countdown and pause with deterministic simulation tests. Use the development browser fixture for timing, controls and visual verification.

## Risks / Trade-offs

- Additional geometry increases render cost → retain fixed pools and share materials; inspect WebGPU runtime and frame timing.
- Small portrait arena reduces detail → verify silhouette and full-room framing at narrow viewport.
- Procedural art remains stylized → use metal shading, layered architecture and articulation for a convincing room without claiming photorealism.

## Migration Plan

Validate locally, commit and push, dispatch the existing patch-release workflow, deploy Pages, verify public version and synchronize local main. If deployment fails, preserve the working release and report the failure.
