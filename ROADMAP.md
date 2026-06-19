# Kokpar Game Roadmap

Goal: build a kokpar game that can grow from a playable prototype into a high-fidelity horse-based team sports game with modern 3D presentation, long-term progression, multiple modes, and a stable of collectible horses.

## North Star

The target is not just "a browser toy." The long-term target is a horse-based team action/sports game with the strategic structure of a vehicle-combat game: players build a stable, own different horses, customize tack and rider gear, and queue into different kokpar/kok-boru modes.

The match should feel closer to a premium football/horse-riding simulator:

- believable horses, riders, speed, weight, and collisions
- readable kokpar rules and match flow
- cinematic but playable camera
- realistic arena, dust, lighting, crowds, sound, and presentation
- real 3D assets, animations, and eventually a stronger engine if needed

The meta-game should grow toward:

- stable/garage screen where each horse has stats, handling, stamina, strength, and personality
- horse classes and roles: fast runner, heavy defender, balanced all-rounder, endurance horse
- progression through horse upgrades, rider equipment, saddles, bridles, blankets, colors, and accessories
- cosmetic identity: national/team uniforms, horse coats, tack, numbers, badges, and arena banners
- multiple modes: arena kokpar, kok-boru with raised kazans, wild kokpar, training, tournament, and later online team play
- regional authenticity first, monetization second: cultural respect and gameplay clarity must drive the design

Primary gameplay references are tracked in `REFERENCES.md`.

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
- angle and impact based tackle outcomes with stagger feedback
- simple horse gait animation, stronger dust, and visible carried-serke strap
- broadcast-style countdown camera for start line, serke, and center duel resets
- tighter horse turning with sharp-turn braking and grip assist
- first arena pass with rails, flags, stands, crowd silhouettes, and sand tracks
- pre-start movement inside each team's start lane before the whistle
- softer rider collisions with damped camera focus and clearer serke contest markers
- mounted serke tug contest before a held serke can be stolen
- contest camera lock-on plus separate pickup/down-reach and mounted-pull poses
- GLB asset pipeline with manifest-based horse, rider, and serke fallbacks
- generated starter low-poly rider-horse and serke GLB assets wired through the manifest
- pre-match menu for goal type, team size, and match time
- raised kazan goal variant alongside the ground-circle goal variant
- throw-to-score mechanic for both ground-circle and kazan target modes
- hold-and-release throw power meter for player scoring attempts
- throw arc and landing marker preview while charging a throw
- throw-angle adjustment while charging, with a matching rider preparation pose
- short goal celebration hold before resetting to the next start
- mobile touch controls with a virtual joystick and action button
- compact iOS/mobile landscape layout for controls and match setup
- physical rider collision against raised kazans while ground-circle targets remain pass-through
- goal targets moved inside the touchline so both circle and kazan modes leave space behind the target
- teammate guard support when your team carries the serke near opponents
- escort-lane teammate AI for marking opponents ahead of the serke carrier
- overhead possession and support markers for faster match readability
- mounted tug-of-war pull direction and advantage indicator
- player-controlled mounted tug effort with stamina cost
- event audio, mute control, and supported-device haptic feedback
- responsive field radar for serke, possession, support, and target awareness
- first architecture pass separating React UI, match feedback, and 3D indicators into modules
- timed defensive body check with horse contact, cooldown, mobile control, and AI use
- closer third-person gameplay camera inspired by the kok-boru prototype reference
- stadium presentation pass with in-arena scoreboard and Kazakhstan flags
- first action pose pass for ground pickup, mounted pulling, and throw release
- first locomotion pass for idle, trot, gallop, turning, and braking poses
- first horse class pass with selectable Argymak, Zhuyrik, and Auyr At handling profiles
- first stable/garage-style horse selection screen with visual horse previews and stat cards
- local player profile with saved horse selection and match preferences
- owned horse instances with names, XP, bond, equipment slots, and match record placeholders
- stable UI for renaming owned horses plus visible record and equipment slots
- profile persistence boundary with a local `profileStore` adapter, ready for a future server adapter
- Supabase env template, profile database migration, browser client, and async profile store adapter
- first-screen MVP auth with email magic links, guest mode, signed-in profile sync through Supabase, and WhatsApp marked as a later production channel
- mode selection for Kokpar, Kok-boru, Training, and Online Room
- first Supabase Online Room lobby with create/join code, invite link, side selection, ready state, realtime player updates, and synchronized test-match start
- online match records with lobby player snapshots and a first host-written event log for start, out-of-bounds, goals, and match finish

Exit criteria:

- game starts correctly
- player can understand who is who
- player can find and grab the serke
- scoring loop works through an intentional throw

## Phase 1: Core Gameplay Feel

Purpose: make the game fun even with simple graphics.

Tasks:

- improve horse movement with acceleration, turning radius, drift, braking, and sprint fatigue
- make AI less chaotic: attackers, defenders, support riders
- add proper possession states: loose, contested, carried, dropped
- add tackle/steal timing with clearer feedback
- reduce camera shake and hard jitter during rider collisions
- make serke contests readable with team advantage and participant markers
- require mounted tug-of-war before stealing a held serke
- make teammates shield the holder when opponents are close
- show different poses for ground pickup versus pulling serke from another rider
- add match restart after goal with a short countdown
- add camera smoothing, zoom, and better angle for reading the play
- refine touch controls after phone testing: joystick feel, action button placement, and haptics

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
- allow pre-start movement inside the start lane without crossing the line
- add out-of-bounds handling with center 1v1 pickup
- add foul-like states only if needed for gameplay
- add team size settings: 3v3 prototype, then 5v5
- add round/match settings
- add goal target settings: ground circle or raised kazan
- require a throw into the selected target instead of proximity scoring
- add basic referee messages

Exit criteria:

- match flow matches the chosen kokpar format
- every reset has a clear reason
- rules can be explained in one screen

## Phase 2.5: Profile Backend Foundation

Purpose: move progression from one browser into an account-backed player profile.

Tasks:

- keep all profile reads and writes behind the profile store boundary
- add server-backed accounts and authenticated player profiles (schema, adapter, email auth, and phone OTP started)
- persist owned horses, XP, levels, bond, coins, equipment, and match history
- keep local storage as a guest/offline fallback
- add API-level validation so client-side edits cannot mint progress or items
- evolve Supabase online room lobbies into synchronized hosted matches after lobby testing

Exit criteria:

- a player can log in on another device and see the same stable
- match rewards update through the backend, not direct browser edits
- lobbies know each player's selected horse and team side

## Phase 3: Visual Upgrade Inside Three.js

Purpose: push the current prototype as far as reasonable before switching engines.

Tasks:

- replace primitive horses with GLB horse models (starter combined asset done, production asset pending)
- replace primitive riders with GLB rider models (starter combined asset done, production asset pending)
- add separate serke dummy model (starter asset done, production asset pending)
- add arena boundary, dustier field material, flags, posts, and crowd silhouettes (first pass done)
- add better lighting, shadows, fog, and color grading
- add particle dust trails
- add UI polish and gamepad-ready controls
- keep improving in-arena presentation: scoreboards, national/team flags, banners, and camera framing

Exit criteria:

- screenshots look like an intentional stylized sports game
- riders are recognizable as riders
- serke is visible during play
- performance stays smooth on a laptop browser

## Phase 4: Animation And Physics

Purpose: make movement believable.

Tasks:

- add horse animations: idle, trot, gallop, turn, stop (first procedural pass done)
- blend animations based on speed and turning (first procedural pass done)
- add rider lean while turning and sprinting
- add pickup animation or visual pose for carrying serke (first pose pass done)
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

## Phase 8: Meta-Game And Modes

Purpose: turn the match prototype into a game people can keep playing.

Product direction:

- a player starts with a basic horse and rider kit
- the main menu becomes a stable/garage, not a static setup screen
- horses are persistent owned objects with names, stats, visual identity, progression, and equipment
- equipment and accessories affect either cosmetics only or carefully tuned gameplay stats
- match modes become queues, similar to a battle selection screen

Candidate modes:

- Kokpar: current arena rule set with selectable goal type
- Kok-boru: raised kazan-focused rule set
- Wild kokpar: more chaotic open-field mode with fewer formal restrictions
- Training: free ride, pickup, throw, and body-check practice
- Tournament: offline bracket/league against AI teams
- Online hosted team mode: player joins created network games with their saved horse

Systems needed:

- horse roster data model (first three selectable classes done in prototype)
- horse stats: speed, acceleration, turn, stamina, strength, recovery, temperament (first gameplay stats done)
- stable/garage UI (first horse selection and stat card done)
- saved player profile (local profile and selected horse persistence done)
- equipment slots: saddle, bridle, blanket, leg wraps, rider uniform, helmet (horse-side starter slots done)
- horse naming and per-horse progression (starter horse instances with XP/bond done)
- unlock/progression model
- mode selection menu (first four modes done)
- network lobby browser
- hosted lobby creation with match size, rules, goal type, and timer settings
- team selection inside a lobby before match start (Supabase lobby done)
- server-side room state, ready checks, and match start synchronization
- balance rules so upgrades create variety without pay-to-win feeling

Exit criteria:

- player can choose at least two horses with different handling
- player can enter at least two modes from a menu
- selected horse and kit appear in the match
- progression direction is documented before any real-money monetization is considered

### Online Hosted Team Mode

Purpose: make a social multiplayer mode where players bring their own stable horse into a hosted kokpar match.

Player flow:

1. Player owns a horse in the stable, gives it a name, equips tack/accessories, and improves it through progression.
2. Host creates an online game room and chooses match rules: mode, goal type, player count, timer, field/arena, and whether upgrades are enabled or normalized.
3. Other players browse or receive the room, connect with their selected stable horse, and wait in the lobby.
4. Connected players choose a side/team. The lobby shows team balance, selected horses, rider names, and ready status.
5. When enough players are connected and ready, the host/server starts the match.
6. The match uses each player's selected horse identity and allowed stats/equipment, then reports results back to the profile/progression system.

Design constraints:

- the saved horse should feel personal: name, look, tack, progression, and match history matter
- matchmaking must support fair play: ranked modes may normalize stats, casual/private rooms can allow full progression
- lobby UI must make teams, player count, and readiness clear before the game starts
- disconnect/reconnect and host migration need a later technical plan before real online testing

Prototype milestones:

- local lobby mock screen with host/join/team selection, no network (done)
- real Supabase private-room lobby with create/join/team/ready state (done)
- online match shell with player snapshot and basic event log (done)
- real private-room networking for small 1v1 or 2v2 match tests
- server-authoritative match state for possession, collisions, scoring, and out-of-bounds
- progression rewards after online match completion

## Immediate Next Steps

Step 1: keep improving the match prototype until one 2-minute kokpar round feels fun and understandable.

Step 2: start separating long-term game concepts from match runtime: horse stats, team selection, mode selection, and stable data.

Step 3: begin the production horse/rider animation and asset pass on the cleaner runtime.

Concrete tasks:

- [x] tune horse movement and turning
- [x] add a 3-second countdown before riders can cross the start line
- [x] keep riders locked behind the line until the whistle
- [x] make serke pickup feedback clearer
- [x] improve camera to show the start line and serke at the same time

Step 2: create a first asset target.

Concrete tasks:

- [x] create one low-poly combined rider-horse GLB
- [x] create one low-poly serke GLB
- [x] replace the primitive horse-rider mesh through the manifest
- [x] preserve team colors through materials
- [ ] replace starter GLBs with production horse, rider, and serke assets

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
- [x] player can ride to the serke and pick it up
- [x] AI contests possession
- [x] player can score in the selected goal target
- [x] teams are visually distinct
- [x] serke is visually distinct
- [x] match can be replayed without refreshing the page
- [x] build passes
