# GameBlocks usage

## Selected module

`modules/math/WorldBasis.js` is copied from GameBlocks and reused without changes.

## Purpose and integration

Highway Runner now creates a world basis with `+X` forward, `+Z` right, and `+Y` up. The player lane-switching and lane-indicator code use that basis to derive the car-relative left side. This keeps those directional calculations correct when the player reverses direction.

## Lives and checkpoints

The game state owns three starting lives and records a checkpoint when the player passes a checkpoint gate. A crash consumes one life and rebuilds the player car at that checkpoint while retaining the current score, elapsed time, and difficulty. Nearby traffic is cleared before respawn to prevent an immediate repeat collision. The game-over screen appears only after the final life is lost.
