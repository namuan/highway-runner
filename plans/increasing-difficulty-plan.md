# Plan: Time-Based Difficulty Progression for `index.html`

## Goal

Make Scenic Route become steadily harder the longer the player survives, while keeping the difficulty readable, fair, and performant on both desktop and mobile.

## Current State

`index.html` already has a basic time-based difficulty ramp:

- `gameTime` increases in the animation loop.
- AI traffic spawn interval decreases over the first 120 seconds.
- Maximum car count increases from about 40 to 120.
- Spawn batch size increases from 3 to 6.
- AI target speed gets a small bonus as `gameTime` rises.

However, this logic is scattered and capped early, so the game may feel like it reaches a plateau instead of continuing to become harder.

## Proposed Changes

### 1. Centralize difficulty configuration

Add a dedicated `difficulty` section to `CONFIG`, for example:

- `rampDuration`: how long it takes to reach full difficulty.
- `maxLevel`: maximum displayed difficulty level.
- `trafficStartMaxCars` / `trafficEndMaxCars`.
- `spawnStartInterval` / `spawnEndInterval`.
- `aiSpeedBonusMax`.
- `slowdownChanceMax`.
- `laneChangeChanceMultiplierMax`.

This keeps all balancing values in one place instead of hardcoding numbers inside `spawnCar()`, `spawnInitialCars()`, and `animate()`.

### 2. Add a reusable difficulty calculation helper

Create a function such as `getDifficultyState()` that returns:

- `progress`: normalized value from `0` to `1`.
- `level`: player-facing difficulty level.
- `spawnInterval`.
- `maxCars`.
- `spawnAttempts` or batch size.
- `aiSpeedBonus`.
- `slowdownChance`.
- `laneChangeMultiplier`.

Use a smooth curve rather than a purely linear one, e.g. ease-in progression, so early gameplay remains approachable and later gameplay becomes meaningfully intense.

### 3. Apply difficulty consistently to AI traffic

Update AI systems to consume `getDifficultyState()`:

- `spawnCar()` should use `aiSpeedBonus` when assigning target speed.
- `spawnInitialCars()` should remain mostly low-pressure on restart/startup.
- `animate()` should use difficulty-derived spawn interval, max cars, and spawn attempts.
- `updateCars()` should use difficulty-derived slowdown chance instead of the fixed `CONFIG.slowdownChance`.
- AI lane changes can become slightly more frequent at higher difficulty, especially when blocked.

### 4. Avoid unfair spikes

Add guardrails so difficulty increases feel challenging but not random/unfair:

- Keep spawn position clearance checks.
- Cap maximum traffic density based on mobile/desktop performance tier.
- Prevent slowdown shockwaves from becoming too frequent.
- Keep AI target speeds within a safe range so traffic remains playable.
- Do not instantly add huge traffic when difficulty changes; let spawning naturally fill the road.

### 5. Add UI feedback

Add a difficulty indicator to the top bar, for example:

```html
<span class="stat">🔥 <span class="value" id="difficulty-level">1</span></span>
```

Update it each frame from `getDifficultyState().level` so the player understands why traffic is becoming denser and faster.

Optional polish:

- Pulse or color-shift the difficulty value at higher levels.
- Show short text labels such as `Cruise`, `Busy`, `Rush`, `Chaos`.

### 6. Tune progression targets

Initial suggested tuning:

- Difficulty ramp duration: 180 seconds.
- Difficulty levels: 1 to 10.
- Spawn interval: 1.3s down to 0.35s.
- Desktop max cars: 45 up to 130.
- Mobile max cars: lower cap, e.g. 35 up to 85.
- Spawn attempts per interval: 2 up to 6.
- AI speed bonus: 0 up to 14 m/s.
- Slowdown chance: current baseline up to roughly 2.5x baseline.
- Lane-change chance multiplier: 1x up to 2x.

These should be tested and adjusted by feel.

### 7. Reset behavior

Ensure `restartGame()` resets all progression-related state:

- `gameTime = 0`.
- `spawnTimer = 0`.
- difficulty UI back to level 1.
- initial traffic remains manageable.

### 8. Verification checklist

After implementation:

- Open `index.html` in a browser.
- Confirm difficulty level starts at 1.
- Drive for several minutes and confirm level increases over time.
- Confirm traffic density increases gradually.
- Confirm AI speeds increase but remain controllable.
- Confirm restart resets difficulty.
- Test mobile viewport or device emulation for acceptable performance.
- Confirm no console errors.

## Implementation Order

1. Add `CONFIG.difficulty` values.
2. Add `getDifficultyState()` helper.
3. Add difficulty UI element and styling if needed.
4. Replace existing hardcoded difficulty calculations in spawning and AI updates.
5. Add mobile-aware caps.
6. Test and tune balancing values.
