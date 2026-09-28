## MODIFIED Requirements

### Requirement: Arena and progression
The game SHALL show a fixed detailed industrial 3D metal room with layered metal surfaces, lighting, articulated characters, platforms, pickups, and holographic robots, turrets, and drones. Waves MUST last 60 active seconds and continue indefinitely with increasing difficulty, starting with an approachable opening wave.
#### Scenario: Surviving a wave
- **WHEN** a living player survives 60 active seconds
- **THEN** enemies and projectiles dissolve, score increases by 1000, up to 20 health is restored, and a five-second safe countdown displays `Wave X in Y secs...` for the upcoming wave before its 60-second clock starts.
#### Scenario: Countdown pause
- **WHEN** the player pauses or loses focus during the countdown
- **THEN** countdown time freezes until resumed and enemies cannot spawn or inflict damage.

### Requirement: Three heroes
The game SHALL offer The Spider with wall sticking and web bullets; Steel with defensive strength, melee punches, aerial kicks, and a horizontal shockwave released on attack release or at three seconds; and Echo with punches and temporary enemy-derived transformations. Echo MUST hold only one absorbed power at a time, with each successful absorption replacing the previous one for ten active seconds.
#### Scenario: Absorption
- **WHEN** Echo punches a drone, turret, or robot
- **THEN** her head becomes a drone with hold-jump flight, her head becomes a turret with attack lasers, or her legs become robotic with enhanced jumping, respectively, for ten seconds.
#### Scenario: Replacement
- **WHEN** Echo punches a new enemy while a power is active
- **THEN** the new transformation replaces the former power and refreshes its ten-second duration.
#### Scenario: Steel charge
- **WHEN** Steel holds attack
- **THEN** his arms spread and charge, and release or three seconds produces a forward horizontal shockwave.

## ADDED Requirements

### Requirement: Directional ranged attacks
Web bullets and lasers SHALL fire in the facing direction, diagonally upward or downward when the corresponding direction is held. Steel shockwaves SHALL remain horizontal.
#### Scenario: Aimed shot
- **WHEN** a ranged hero attacks while holding up or down
- **THEN** the shot travels diagonally in that direction without automatic targeting.
