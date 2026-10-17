export const EFIR_NEWS = [
  { ru: "Арғымақ лидирует в рейтинге конюшен сезона 2025",   kz: "Арғымақ 2025 жылғы маусымның жарыс рейтингін басқарып тұр",    en: "Arghymak leads the 2025 stable season rankings" },
  { ru: "Онлайн-турнир: регистрация открыта до 20 октября", kz: "Онлайн турнир: 20 қазанға дейін тіркелу ашық",                  en: "Online tournament: registration open until October 20" },
  { ru: "Новый снаряжение «Тоқым III» теперь в магазине",    kz: "Жаңа «Тоқым III» жабдығы дүкенде пайда болды",                   en: "New equipment 'Toqym III' now available in the shop" },
  { ru: "Казанский формат: правила обновлены в v1.4",        kz: "Қазан форматы: v1.4 нұсқасында ережелер жаңартылды",            en: "Kazan format: rules updated in v1.4" },
  { ru: "Серке — символ доблести и удачи в степи",           kz: "Серке — дала батырлығы мен сәттіліктің символы",                 en: "Serke — symbol of valor and luck on the steppe" },
];

export function newsText(item, lang = "ru") {
  return item[lang] ?? item.ru;
}
