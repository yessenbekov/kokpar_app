# Kokpar Game

3D browser prototype of kokpar built with React, Vite, and Three.js.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Controls

- `WASD` or arrow keys: ride
- `Space`: sprint, pick up, or steal the kokpar
- `R`: restart

## Project structure

- `src/App.jsx`: React shell and HUD
- `src/game/assets.js`: optional GLB/GLTF asset loading pipeline
- `src/game/createKokparGame.js`: Three.js scene, game loop, controls, AI, scoring
- `src/game/entities.js`: mesh factories and rider factory
- `src/game/constants.js`: world and tuning constants
- `src/styles/app.css`: layout and HUD styles
- `public/models/manifest.json`: model paths and transform settings
- `public/models/*`: folders for horse, rider, and serke GLB assets

## Model pipeline

The game now supports optional GLB/GLTF models while keeping procedural fallbacks.

1. Put models in `public/models/horses`, `public/models/riders`, or `public/models/serke`.
2. Set the matching `path` in `public/models/manifest.json`.
3. Run the game. If a model loads, it replaces the procedural mesh at runtime.
4. If a path is `null` or fails to load, the procedural fallback remains active.

Current model convention: local `+X` faces forward, local `+Y` is up, and the rider-horse origin sits near the horse body center.

## Next ideas

- Add real horse animations and sound
- Add team selection and match settings
- Add mobile touch controls
- Add the first real low-poly horse/rider/serke GLB files
- Add tournament mode and persistent scores
