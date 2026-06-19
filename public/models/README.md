# Kokpar Model Assets

Put GLB or GLTF assets in these folders and point `manifest.json` to them.

The repo includes generated starter assets:

- `horses/kokpar-rider-horse.glb`: combined horse plus rider model
- `serke/serke.glb`: serke dummy model

Regenerate them with:

```bash
npm run generate:models
```

Recommended replacement assets:

- `horses/rider-horse.glb`: one combined horse plus rider model
- `horses/horse.glb`: horse-only model
- `riders/rider.glb`: rider-only model
- `serke/serke.glb`: serke dummy model

Model convention for the current prototype:

- forward direction: local `+X`
- up direction: local `+Y`
- root origin: near the horse body center for rider/horse, near object center for serke
- team-colorable materials should include names like `uniform`, `jersey`, `team`, `saddleBlanket`
- horse coat materials should include names like `horse`, `coat`, `body`, `mane`, `tail`
- optional simple animation hooks can use names like `gait_leg_fl`, `gait_leg_fr`, `gait_leg_bl`, `gait_leg_br`, `gait_tail`, `pose_arm_left`, and `pose_torso`

If a path is `null` or fails to load, the game keeps using the procedural fallback mesh.
