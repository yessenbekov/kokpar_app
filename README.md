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
- `src/game/createKokparGame.js`: Three.js scene, game loop, controls, AI, scoring
- `src/game/entities.js`: mesh factories and rider factory
- `src/game/constants.js`: world and tuning constants
- `src/styles/app.css`: layout and HUD styles

## Next ideas

- Add real horse animations and sound
- Add team selection and match settings
- Add mobile touch controls
- Replace primitive meshes with GLB models
- Add tournament mode and persistent scores
