# GameBlocks usage

## Selected module

`modules/math/WorldBasis.js` is copied from GameBlocks and reused without changes.

## Purpose and integration

Highway Runner now creates a world basis with `+X` forward, `+Z` right, and `+Y` up. The player lane-switching and lane-indicator code use that basis to derive the car-relative left side. This keeps those directional calculations correct when the player reverses direction.

## Lives and checkpoints

The game state owns three starting lives and records a checkpoint when the player passes a checkpoint gate. A crash consumes one life and rebuilds the player car at that checkpoint while retaining the current score, elapsed time, and difficulty. Nearby traffic is cleared before respawn to prevent an immediate repeat collision. The game-over screen appears only after the final life is lost.

## Collision fire

`modules/world/visual-effects/CrashFire.js` adds a custom engine-bay fire effect. The GameBlocks `JetFlame` and `WeaponEffectsSystem` modules were reviewed, but neither directly supports a sustained vehicle fire.

The effect uses procedural flame and smoke shaders, ember particles, and a flickering point light. Three instanced batches render all particles in 3 draw calls. The GPU animates particles from static buffers; the CPU updates only the clock and light intensity. Desktop uses 36 particles and mobile uses 21.

`WorldBasis` supplies the upward and wind directions. The vehicle rotation places the emitter over the hood.

`index.html` limits crash rendering to 30 frames per second and reuses shadows while traffic and scenery are frozen. Normal gameplay keeps its existing frame rate. Respawn and restart restore shadow updates and dispose of the effect's geometry, materials, and light.

Serve the repository and open `/tests/crash-fire.html` to check shader compilation, draw calls, static buffers, emitter placement, timing, and resource cleanup.
