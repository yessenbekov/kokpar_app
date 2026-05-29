# Kokpar Game

3D browser prototype of kokpar built with React, Vite, and Three.js.

Long-term direction: grow this from one playable match into a horse-based team sports game with a stable/garage, named and upgraded horses, tack and rider customization, multiple kokpar/kok-boru modes, tournaments, and hosted online team play where players join rooms with their own stable horse.

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
- `E`: commit to a short defensive body check with the horse
- `A/D` or left/right while charging: adjust the throw angle
- `R`: restart
- mobile: use the on-screen joystick, action button, and shield button for a body check
- iOS landscape is supported with compact HUD and controls
- speaker icon: mute or enable match audio and supported-device haptics

## Match setup

The pre-match screen now works as the first stable/garage pass. Before a match, choose:

- goal type: ground circle or raised kazan
- horse type: Argymak, Zhuyrik, or Auyr At
- team size: 3v3, 4v4, or 5v5
- match time: 2, 3, or 5 minutes

The first horse-class pass gives the player three handling profiles: balanced, fast, and heavy. The stable view shows the saved player profile, named owned horses, owned horse count, each horse's role, profile tags, visual coat preview, XP, and gameplay ratings. Horse choice and match preferences are saved locally between sessions. Horse choice affects speed, acceleration, turn, stamina drain/recovery, carrying speed, tackle strength, stability, and contest power.

Scoring requires a throw: carry the serke near the selected target, hold `Space` to build power, and release to throw. Riding into the circle or kazan is not enough.
While charging, a throw arc and landing marker preview the approximate path and respond to throw-angle input.
After a successful goal, the camera holds briefly on the target before the next start countdown.
In circle mode, riders can ride over the ground marking. In kazan mode, the raised kazan blocks riders like a physical obstacle.
Goal targets sit inside the field edge so there is playable space behind the circle or kazan for serke battles.
When your rider carries the serke, nearby teammates switch into guard support and try to block opponents pulling at you.
Away from immediate pressure, teammates form an escort lane toward the scoring target and mark opponents who can cut off the run.
Small overhead markers highlight the serke carrier, active contests, and teammate support roles during possession.
Mounted tug-of-war shows a floating pull arrow between riders, colored by the team currently winning the struggle.
When you are part of a mounted tug, holding `Space` or the mobile action button builds pull effort and spends stamina.
Match feedback includes synthesized whistle, possession, contact, throw, out-of-bounds, and goal sounds plus vibration where the browser supports it.
A compact field radar shows both targets, riders, loose serke, active possession, contests, and supporting teammates.
Defenders can attempt a timed body check: a clean high-speed hit can dislodge the serke, while weaker contact pushes the rider or starts a mounted tug contest.

## Project structure

- `src/App.jsx`: React application shell and game lifecycle wiring
- `src/app/matchConfig.js`: match settings and initial HUD state
- `src/app/playerProfile.js`: local player profile, named owned horses, equipment slots, and saved match preferences
- `src/components/*`: stable setup menu, match HUD, field radar, and touch controls
- `src/game/assets.js`: optional GLB/GLTF asset loading pipeline
- `src/game/createKokparGame.js`: Three.js match runtime, controls, AI, and scoring
- `src/game/entities.js`: mesh factories and rider factory
- `src/game/feedback.js`: match audio and supported-device haptics
- `src/game/visualIndicators.js`: contest, support, and mounted tug 3D markers
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

- Continue splitting the match runtime into arena, rules, AI, and camera systems
- Add real horse animation blending and production sound
- Expand the stable/garage with accessories and rider kit
- Add post-match rewards and profile progression
- Add mode selection for kokpar, kok-boru, wild kokpar, training, and tournament
- Add hosted online lobby flow: create room, join with saved horse, choose side, ready up, start match
- Add team selection and richer match settings
- Replace starter low-poly GLB files with production horse/rider/serke assets
- Add tournament mode and persistent scores
