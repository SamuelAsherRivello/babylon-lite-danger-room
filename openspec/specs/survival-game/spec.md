# Survival Game

## Purpose
Provide a replayable superhero training game with a fixed arena and endlessly escalating sixty-second survival waves.

## Requirements

### Requirement: Arena and progression
The game SHALL show a fixed 3D metal room, platforms, pickups, and holographic robots, turrets, and drones. Waves MUST last 60 active seconds and continue indefinitely with increasing difficulty.
#### Scenario: Surviving a wave
- **WHEN** a living player survives 60 active seconds
- **THEN** the next harder wave begins and the score increases.

### Requirement: Three heroes
The game SHALL offer The Spider with wall sticking and web bullets; Steel with defensive strength, melee punches, aerial kicks, and a horizontal shockwave released on attack release or at three seconds; and Echo with punches and temporary enemy-derived transformations.
#### Scenario: Absorption
- **WHEN** Echo punches a drone, turret, or robot
- **THEN** her head becomes a drone with hold-jump flight, her head becomes a turret with attack lasers, or her legs become robotic with enhanced jumping, respectively, for ten seconds.
#### Scenario: Steel charge
- **WHEN** Steel holds attack
- **THEN** his arms spread and charge, and release or three seconds produces a forward horizontal shockwave.

### Requirement: Controls and recovery
The game SHALL support WASD/arrows, C jump, V attack, a four-direction virtual controller with jump and attack, concurrent pointers, pause/resume, and replay after defeat. Losing focus MUST release input and pause active play.
#### Scenario: Restart
- **WHEN** a defeated player restarts
- **THEN** health, wave, timer, score, and enemies reset for the selected hero.
#### Scenario: Pause
- **WHEN** the game is paused
- **THEN** the wave clock and simulation stop until resumed.

### Requirement: Rendering support
The game SHALL keep its whole arena visible on desktop and narrow mobile screens and provide a useful initialization failure message.
#### Scenario: Unsupported device
- **WHEN** WebGPU initialization fails
- **THEN** visible guidance and retry replace a blank game.
