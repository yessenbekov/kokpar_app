# Kokpar Model Assets

Put GLB or GLTF assets in these folders and point `manifest.json` to them.

Recommended first pass:

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

If a path is `null` or fails to load, the game keeps using the procedural fallback mesh.
