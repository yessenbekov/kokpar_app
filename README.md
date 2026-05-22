# Kokpar Game

3D browser prototype of kokpar built with React, Vite, and Three.js.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

To regenerate the starter low-poly GLB assets:

```bash
npm run generate:models
```

## Controls

- `WASD` or arrow keys: ride
- `Space`: sprint, pick up, steal, or charge/release a throw near the target
- `A/D` or left/right while charging: adjust the throw angle
- `R`: restart
- mobile: use the on-screen joystick and action button
- iOS landscape is supported with compact HUD and controls

## Match setup

Before a match, choose:

- goal type: ground circle or raised kazan
- team size: 3v3, 4v4, or 5v5
- match time: 2, 3, or 5 minutes

Scoring requires a throw: carry the serke near the selected target, hold `Space` to build power, and release to throw. Riding into the circle or kazan is not enough.
While charging, a throw arc and landing marker preview the approximate path and respond to throw-angle input.
After a successful goal, the camera holds briefly on the target before the next start countdown.
In circle mode, riders can ride over the ground marking. In kazan mode, the raised kazan blocks riders like a physical obstacle.
Goal targets sit inside the field edge so there is playable space behind the circle or kazan for serke battles.
When your rider carries the serke, nearby teammates switch into guard support and try to block opponents pulling at you.
Away from immediate pressure, teammates form an escort lane toward the scoring target and mark opponents who can cut off the run.

## Project structure

- `src/App.jsx`: React shell and HUD
- `src/game/assets.js`: optional GLB/GLTF asset loading pipeline
- `src/game/createKokparGame.js`: Three.js scene, game loop, controls, AI, scoring
- `src/game/entities.js`: mesh factories and rider factory
- `src/game/constants.js`: world and tuning constants
- `src/styles/app.css`: layout and HUD styles
- `scripts/generate-model-assets.mjs`: starter GLB asset generator
- `public/models/manifest.json`: model paths and transform settings
- `public/models/*`: folders for horse, rider, and serke GLB assets
- `REFERENCES.md`: gameplay and visual references for future iterations

## Model pipeline

The game supports optional GLB/GLTF models while keeping procedural fallbacks. The repo includes starter low-poly GLB files for the combined rider-horse model and serke dummy.

1. Put models in `public/models/horses`, `public/models/riders`, or `public/models/serke`.
2. Set the matching `path` in `public/models/manifest.json`.
3. Run the game. If a model loads, it replaces the procedural mesh at runtime.
4. If a path is `null` or fails to load, the procedural fallback remains active.

Current model convention: local `+X` faces forward, local `+Y` is up, and the rider-horse origin sits near the horse body center.

## Next ideas

- Add real horse animations and sound
- Add team selection and match settings
- Add mobile touch controls
- Replace starter low-poly GLB files with production horse/rider/serke assets
- Add tournament mode and persistent scores
