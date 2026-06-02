export const DEFAULT_MODE_ID = "kokpar";

export const GAME_MODES = [
  {
    id: "kokpar",
    name: "Кокпар",
    role: "Классика",
    description: "Текущий матч с выбором круга или казана.",
    defaultGoalType: "circle",
    goalLocked: false,
    startLabel: "Начать матч"
  },
  {
    id: "kokboru",
    name: "Кок-бору",
    role: "Казан",
    description: "Режим с высоким казаном как основной целью.",
    defaultGoalType: "kazan",
    goalLocked: true,
    startLabel: "Начать кок-бору"
  },
  {
    id: "training",
    name: "Тренировка",
    role: "Практика",
    description: "Свободный заезд для контроля, подбора серке и бросков.",
    defaultGoalType: "circle",
    goalLocked: false,
    startLabel: "Начать тренировку"
  },
  {
    id: "online_room",
    name: "Онлайн комната",
    role: "Лобби",
    description: "Supabase-лобби: создать комнату, подключиться по коду, выбрать сторону и готовность.",
    defaultGoalType: "kazan",
    goalLocked: false,
    startLabel: "Старт тест-матча"
  }
];

export function gameModeById(id) {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0];
}
