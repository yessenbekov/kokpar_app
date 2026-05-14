# Kokpar Game Roadmap

Goal: build a kokpar game that can grow from a playable prototype into a high-fidelity sports simulator with modern 3D presentation.

## North Star

The target is not just "a browser toy." The long-term target is a sports game feeling closer to a premium football/horse-riding simulator:

- believable horses, riders, speed, weight, and collisions
- readable kokpar rules and match flow
- cinematic but playable camera
- realistic arena, dust, lighting, crowds, sound, and presentation
- real 3D assets, animations, and eventually a stronger engine if needed

## Phase 0: Current Prototype

Status: in progress.

Purpose: prove the core kokpar loop quickly.

Already done:

- React + Vite + Three.js project
- GitHub repo and initial commits
- 3D field, riders, teams, kazans, serke dummy
- match timer, score, restart
- AI riders chase and steal
- players start behind a side line
- serke starts on the far side of the field
- field marks center and the initial serke spot
- out-of-bounds resets serke to a center 1v1 pickup
- center pickup protects the circle from non-duel riders
- team colors, basic uniforms, tack, and dust
- team horses use different coats and matching tack
- first pass horse steering, braking, drift, sprint, and speed-aware camera
- first pass AI roles: pickup, support, blocker, tackler, defender
- contested pickup state with visible serke battle indicator

Exit criteria:

- game starts correctly
- player can understand who is who
- player can find and grab the serke
- scoring loop works

## Phase 1: Core Gameplay Feel

Purpose: make the game fun even with simple graphics.

Tasks:

- improve horse movement with acceleration, turning radius, drift, braking, and sprint fatigue
- make AI less chaotic: attackers, defenders, support riders
- add proper possession states: loose, contested, carried, dropped
- add tackle/steal timing with clearer feedback
- add match restart after goal with a short countdown
- add camera smoothing, zoom, and better angle for reading the play
- add touch controls later, but keep keyboard first

Exit criteria:

- a 2-minute match feels playable
- chasing the serke is understandable
- scoring feels intentional, not random
- player can tell why they lost or won possession

## Phase 2: Kokpar Rules And Match Structure

Purpose: make it feel like kokpar, not generic horse football.

Tasks:

- define exact game mode: arena kokpar with kazans
- add start whistle and riders waiting behind the line
- add out-of-bounds handling with center 1v1 pickup
- add foul-like states only if needed for gameplay
- add team size settings: 3v3 prototype, then 5v5
- add round/match settings
- add basic referee messages

Exit criteria:

- match flow matches the chosen kokpar format
- every reset has a clear reason
- rules can be explained in one screen

## Phase 3: Visual Upgrade Inside Three.js

Purpose: push the current prototype as far as reasonable before switching engines.

Tasks:

- replace primitive horses with GLB horse models
- replace primitive riders with GLB rider models
- add separate serke dummy model
- add arena boundary, dustier field material, flags, posts, and crowd silhouettes
- add better lighting, shadows, fog, and color grading
- add particle dust trails
- add UI polish and gamepad-ready controls

Exit criteria:

- screenshots look like an intentional stylized sports game
- riders are recognizable as riders
- serke is visible during play
- performance stays smooth on a laptop browser

## Phase 4: Animation And Physics

Purpose: make movement believable.

Tasks:

- add horse animations: idle, trot, gallop, turn, stop
- blend animations based on speed and turning
- add rider lean while turning and sprinting
- add pickup animation or visual pose for carrying serke
- add collision reactions between riders
- add better ball/serke attachment and dropping
- evaluate physics libraries for browser prototype

Exit criteria:

- horses no longer feel like sliding capsules
- sprinting, turning, and impact have readable motion
- serke pickup and loss are visually obvious

## Phase 5: Engine Decision

Purpose: decide whether the final high-fidelity version stays on web tech or moves to a game engine.

Decision options:

- Continue with Three.js if the goal is a browser-first stylized game.
- Move to Unity if we want faster multiplatform development and easier asset workflows.
- Move to Unreal Engine 5 if the main goal is premium realistic graphics similar to modern sports games.

Recommended path:

- keep React/Three.js for gameplay prototyping
- start Unreal Engine 5 vertical slice once gameplay direction is stable

Exit criteria:

- we have one playable prototype with proven rules
- we know target platform: web, PC, mobile, or console-style PC build
- we know the visual target: stylized, semi-realistic, or realistic

## Phase 6: Unreal Engine 5 Vertical Slice

Purpose: build a small high-fidelity proof of the final game.

Scope:

- one arena
- two teams
- 3v3 or 5v5
- one playable rider
- basic AI
- one full scoring loop

Tasks:

- create UE5 project
- import horse and rider assets
- set up horse locomotion
- set up player controller
- set up serke pickup/drop/carry
- set up kazans and scoring
- set up camera
- set up lighting, dust, field, and crowd placeholder

Exit criteria:

- 60-90 second gameplay slice looks and feels like the future game
- visuals are much closer to the target quality
- we can decide budget and asset pipeline

## Phase 7: Production Pipeline

Purpose: stop hand-building everything and create a repeatable content pipeline.

Tasks:

- choose asset sources: custom Blender models, marketplace assets, or hired artists
- define horse/rider rig requirements
- define animation list
- define naming conventions and folders
- build playable builds regularly
- add issue tracker milestones
- set up CI for web prototype and later engine builds

Exit criteria:

- adding a new horse, uniform, arena, or animation follows a repeatable process
- project can scale beyond one developer session

## Immediate Next Steps

Step 1: improve the current gameplay feel.

Concrete tasks:

- [ ] tune horse movement and turning
- [x] add a 3-second countdown before riders can cross the start line
- [x] keep riders locked behind the line until the whistle
- [ ] make serke pickup feedback clearer
- [ ] improve camera to show the start line and serke at the same time

Step 2: create a first asset target.

Concrete tasks:

- pick or create one low-poly horse GLB
- pick or create one rider GLB
- replace the primitive horse-rider mesh
- preserve team colors through materials

Step 3: prepare for Unreal without abandoning the prototype.

Concrete tasks:

- document core rules from the prototype
- identify exact controls and camera behavior
- list required animations
- collect visual references for horses, riders, kazans, uniforms, and arena

## Definition Of Done For The First Milestone

Milestone name: Playable Kokpar Prototype 0.2

Done when:

- [x] riders start behind the line
- [x] whistle/countdown starts the round
- [ ] player can ride to the serke and pick it up
- [ ] AI contests possession
- [ ] player can score in the kazan
- [x] teams are visually distinct
- [x] serke is visually distinct
- [x] match can be replayed without refreshing the page
- [x] build passes
