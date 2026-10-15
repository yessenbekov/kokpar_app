# Handoff: Арена v2 — точный перенос

## Главное правило
**Не переписывать дизайн по описанию.** Весь визуал уже написан кодом в `code/arenaV2.js` — это тот же файл, из которого собран прототип `Kokpar Arena v2.html` и все скриншоты. Скопируй его в игру **байт-в-байт** и подключи. Любые «улучшения», пересчёт цветов, свои шейдеры — запрещены.

## Почему в прошлый раз вышло не так
- Небо стало оранжевым: цвета прогнали через `convertSRGBToLinear()` второй раз. three.js уже переводит hex в линейное пространство сам. В `arenaV2.js` этого вызова нет — не добавлять.
- Нет гор, юрт, трибун с навесом, текстуры грунта — описание интерпретировали частично. Теперь всё это внутри одной функции.

## Шаги
1. Скопировать `code/arenaV2.js` → `src/game/arenaV2.js` без правок. `code/constants.js` НЕ копировать — модуль импортирует существующий `src/game/constants.js` (нужны `WORLD`, `COLORS`, `GOAL_RADIUS` — они там есть).
2. В `src/game/createKokparGame.js`:
   - удалить: `LIGHT_PRESETS`, `scene.fog = …`, `scene.background = …`, sky-меш/шейдер, `renderer.toneMappingExposure = …`, `HemisphereLight`, `sun` (DirectionalLight + shadow-настройки), `fillLight`, плоскость земли `PlaneGeometry(WORLD.groundWidth, WORLD.groundHeight…)`, вызовы `createGroundDetails(scene)` и `createArenaEnvironment(scene)`;
   - на их место:
     ```js
     import { createArenaV2, createRingGoalMeshV2, createKazanGoalMeshV2 } from "./arenaV2.js";
     const arena = createArenaV2(scene, renderer, { preset: options.lightPreset === "noon" ? "noon" : "golden", isMobile });
     const arenaPresentation = { scoreboard: arena.scoreboard }; // scoreboard.update({blue, red, timer, status}) — та же сигнатура
     ```
   - если где-то используется `sun` (например, тень следует за игроком) — брать `arena.sun`;
   - `camera.far` оставить 2000;
   - в игровом цикле (там же, где обновляются лошади) добавить `arena.update(dt, elapsedSeconds);`.
3. Ворота, в `createKokparGame.js` при создании `blueGoal` / `redGoal`:
   ```js
   const makeGoal = gameSettings.goalType === "kazan" ? createKazanGoalMeshV2 : createRingGoalMeshV2;
   const blueGoal = makeGoal(COLORS.blue, -1);
   const redGoal  = makeGoal(COLORS.red, 1);
   // позиционирование — как сейчас; после scene.add(blueGoal, redGoal):
   arena.refreshFlags();
   ```
   GLB-тайказан (`blueKazanGlb`/`redKazanGlb`) для визуала больше не используем. Логику попадания (`scoreRadius`, `KAZAN_BLOCK_RADIUS`) не трогать: размеры уже рассчитаны от `GOAL_RADIUS`.
4. `arenaBuilder.js` больше не импортируется для визуала. Удалить его можно позже, после проверки.
5. Больше ничего не менять: HUD, камера, физика, лошади — как есть.

## Проверка (обязательно)
Открыть матч, сравнить с `screenshots/01-game-golden.jpg`:
- небо голубое сверху, тёплое бежевое у горизонта, без оранжевого;
- на горизонте сиреневые горы со снежными шапками, перед ними холмы;
- поле — светлый песок с пятнами, следами и разметкой; вокруг тёмный выгон; за забором зелёно-оливковая степь;
- трибуны ступенчатые, со зрителями и навесом в красно-белую полосу;
- ворота как на `03-goal-circle.jpg` / `04-goal-kazan.jpg`.

Если отличается — искать, где код отклонился от `arenaV2.js`. Подгонять картинку руками нельзя.

## Файлы
- `code/arenaV2.js` — модуль (копировать как есть)
- `code/constants.js` — только для прототипа
- `Kokpar Arena v2.html` — прототип: открыть через локальный сервер (`npx serve .`), кнопки камеры/света/ворот
- `screenshots/00-current-wrong.png` — как получилось сейчас (неправильно)
- `screenshots/01…06` — эталон

## Рекламные щиты
На северной (стартовой) стороне щитов нет — оттуда выезжают всадники. Остаются южная длинная сторона и обе короткие. Щиты стоят вплотную к забору (в 1.2 м внутрь), а не у кромки поля: всадники могут уходить в аут — ~4 м за южной линией и ~13 м за боковыми.

## Производительность
`isMobile: true` сам включает: тени 2048, пыль 300 частиц, 90 зрителей в ряд вместо 132.
