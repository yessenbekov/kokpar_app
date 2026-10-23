export function makeLangT(lang) {
  return (ru, kz, en, ky) => {
    if (lang === "ky") return ky ?? kz ?? ru;
    if (lang === "kz") return kz ?? ru;
    if (lang === "en") return en ?? ru;
    return ru;
  };
}

export function localT(ru, kz, en, ky) {
  let lang = "ru";
  try { lang = localStorage.getItem("kokpar_lang") ?? "ru"; } catch {}
  return makeLangT(lang)(ru, kz, en, ky);
}
