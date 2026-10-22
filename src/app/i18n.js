export function makeLangT(lang) {
  return (ru, kz, en) => {
    if (lang === "kz") return kz ?? ru;
    if (lang === "en") return en ?? ru;
    return ru;
  };
}

export function localT(ru, kz, en) {
  let lang = "ru";
  try { lang = localStorage.getItem("kokpar_lang") ?? "ru"; } catch {}
  return makeLangT(lang)(ru, kz, en);
}
