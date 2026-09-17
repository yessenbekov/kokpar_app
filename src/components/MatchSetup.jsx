import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, CircleDot, Clock3, Cloud, Flag, Gavel, HardDrive, History, LoaderCircle, LogIn, LogOut, Mail, Pencil, Play, Trophy, User, Users, X, Zap } from "lucide-react";
import { GAME_MODES, gameModeById } from "../app/gameModes.js";
import { HorseStable } from "./HorseStable.jsx";
import { Marketplace } from "./Marketplace.jsx";
import { MatchHistory } from "./MatchHistory.jsx";
import { OnlineRoomLobby } from "./OnlineRoomLobby.jsx";
import { Shop } from "./Shop.jsx";

const _coinFmt = new Intl.NumberFormat("ru-RU");
function formatCoins(value) {
  return _coinFmt.format(value);
}

function accountView(auth) {
  if (auth.status === "signed-in") {
    if (auth.syncStatus === "syncing") {
      return { mode: "syncing", label: "Синхронизация", title: auth.email || "Аккаунт", detail: "Обновляем облачный профиль", icon: LoaderCircle };
    }
    if (auth.syncStatus === "error") {
      return { mode: "error", label: "Ошибка", title: auth.email || "Аккаунт", detail: auth.error || "Пока сохраняем локально", icon: AlertTriangle };
    }
    return { mode: "cloud", label: "Облако", title: auth.email || "Аккаунт", detail: auth.message || "Профиль сохранён в облаке", icon: Cloud };
  }
  if (auth.syncStatus === "sent") {
    return { mode: "pending", label: "Письмо", title: auth.email || "Magic link отправлен", detail: "Открой ссылку из email, затем вернись в игру", icon: Mail };
  }
  if (auth.status === "unconfigured") {
    return { mode: "local", label: "Локально", title: "Гостевой профиль", detail: "Supabase не настроен", icon: HardDrive };
  }
  if (auth.error) {
    return { mode: "error", label: "Ошибка", title: "Гостевой профиль", detail: auth.error, icon: AlertTriangle };
  }
  return { mode: "local", label: "Локально", title: auth.message || "Гостевой профиль", detail: "Вход через email сохранит конюшню в облаке", icon: HardDrive };
}

function AccountPanel({ auth, onBackToLogin, onSignOut }) {
  const signedIn = auth.status === "signed-in";
  const view = accountView(auth);
  const AccountIcon = view.icon;

  return (
    <div className={`auth-panel ${view.mode}${signedIn ? " signed-in" : ""}`} aria-label="Аккаунт">
      <div className="auth-copy">
        <span className="auth-provider">
          <AccountIcon size={14} strokeWidth={2.6} />
          <span>{view.label}</span>
        </span>
        <strong>{view.title}</strong>
        <small>{view.detail}</small>
      </div>
      <div className="auth-actions">
        <span className={`sync-pill ${view.mode}`}>
          {view.mode === "cloud" && <CheckCircle2 size={13} strokeWidth={2.7} />}
          {view.mode === "syncing" && <LoaderCircle size={13} strokeWidth={2.7} />}
          {view.mode === "pending" && <Mail size={13} strokeWidth={2.7} />}
          {view.mode === "error" && <AlertTriangle size={13} strokeWidth={2.7} />}
          {view.mode === "local" && <HardDrive size={13} strokeWidth={2.7} />}
          <span>{view.label}</span>
        </span>
        {signedIn ? (
          <button className="auth-action" type="button" onClick={onSignOut}>
            <LogOut size={15} strokeWidth={2.5} />
            <span>Выйти</span>
          </button>
        ) : (
          <button className="auth-action" type="button" onClick={onBackToLogin}>
            <LogIn size={15} strokeWidth={2.5} />
            <span>{auth.syncStatus === "sent" ? "Другой email" : "Вход"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

const COIN_PACKAGES = [
  { coins: 500,  price: "99 ₸",  bonus: null },
  { coins: 1200, price: "199 ₸", bonus: 20 },
  { coins: 3000, price: "399 ₸", bonus: 50 },
  { coins: 7000, price: "799 ₸", bonus: 75 },
];

const EMPTY_ONLINE_STATE = {
  allReady: false, canStart: false, hasRoom: false, isHost: false,
  playerReady: false, playersCount: 0, readyCount: 0,
  onlineMatchId: "", roomCode: "", status: "idle"
};

function sameOnlineState(left, right) {
  return Object.keys(EMPTY_ONLINE_STATE).every((key) => left[key] === right[key]);
}

function onlineStartLabel(lobbyState) {
  if (!lobbyState.hasRoom) return "Создай или войди в комнату";
  if (lobbyState.status === "starting") return "Стартуем";
  if (!lobbyState.isHost) return "Ждем хоста";
  if (!lobbyState.allReady) return "Все должны быть готовы";
  return "Запустить комнату";
}

export function MatchSetup({ profile, settings, auth, onBackToLogin, onSignOut, onHorseRename, onHorseCreate, onHorseDelete, onSettingChange, onStart, onRiderRename, onBuyItem, onBuyHorse, onExpandStable, stableSlotCost, onEquipItem, onListItem, onCancelListing, onPurchase, onEquipFromInventory }) {
  const ownedCount = profile.ownedHorses.length;
  const selectedHorse = profile.ownedHorses.find((horse) => horse.id === settings.horseId) ?? profile.ownedHorses[0];
  const selectedMode = gameModeById(settings.modeId);
  const onlineMode = selectedMode.id === "online_room";
  const [navTab, setNavTab] = useState("game");
  const [onlineReady, setOnlineReady] = useState(false);
  const [onlineStartRequest, setOnlineStartRequest] = useState(0);
  const [onlineLobbyState, setOnlineLobbyState] = useState(EMPTY_ONLINE_STATE);
  const [editingRider, setEditingRider] = useState(false);
  const [draftRiderName, setDraftRiderName] = useState(profile.riderName);
  const [stableTab, setStableTab] = useState("stable");
  const [listingDraft, setListingDraft] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [homeScreen, setHomeScreen] = useState(true);
  const [stableCardOpen, setStableCardOpen] = useState(false);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [showCoinScreen, setShowCoinScreen] = useState(false);
  function lsGet(key, def) { try { const v = localStorage.getItem(key); return v !== null ? v : def; } catch { return def; } }
  const [lang, setLangState] = useState(() => settings.lang ?? lsGet("kokpar_lang", "ru"));
  const [sfxVol, setSfxVol] = useState(() => settings.sfxVol ?? Number(lsGet("kokpar_sfx", "78")));
  const [musicVol, setMusicVol] = useState(() => settings.musicVol ?? Number(lsGet("kokpar_music", "42")));
  const [vibration, setVibration] = useState(() => settings.vibration !== null ? settings.vibration : lsGet("kokpar_vibration", "true") !== "false");
  const [cameraMode, setCameraMode] = useState(() => settings.cameraMode ?? lsGet("kokpar_camera", "back"));
  const [leftHand, setLeftHand] = useState(() => settings.leftHand !== null ? settings.leftHand : lsGet("kokpar_lefthand", "false") === "true");
  const [hints, setHints] = useState(() => settings.hints !== null ? settings.hints : lsGet("kokpar_hints", "true") !== "false");
  const [joystickSensitivity, setJoystickSensitivity] = useState(() => settings.joystickSensitivity ?? 50);

  // Sync UI settings when Supabase profile loads (settings prop updates)
  useEffect(() => { if (settings.lang !== null && settings.lang !== undefined) setLangState(settings.lang); }, [settings.lang]);
  useEffect(() => { if (settings.sfxVol !== null && settings.sfxVol !== undefined) setSfxVol(settings.sfxVol); }, [settings.sfxVol]);
  useEffect(() => { if (settings.musicVol !== null && settings.musicVol !== undefined) setMusicVol(settings.musicVol); }, [settings.musicVol]);
  useEffect(() => { if (settings.vibration !== null && settings.vibration !== undefined) setVibration(settings.vibration); }, [settings.vibration]);
  useEffect(() => { if (settings.cameraMode !== null && settings.cameraMode !== undefined) setCameraMode(settings.cameraMode); }, [settings.cameraMode]);
  useEffect(() => { if (settings.leftHand !== null && settings.leftHand !== undefined) setLeftHand(settings.leftHand); }, [settings.leftHand]);
  useEffect(() => { if (settings.hints !== null && settings.hints !== undefined) setHints(settings.hints); }, [settings.hints]);
  useEffect(() => { if (settings.joystickSensitivity !== null && settings.joystickSensitivity !== undefined) setJoystickSensitivity(settings.joystickSensitivity); }, [settings.joystickSensitivity]);

  function saveSetting(key, value, lsKey) {
    try { localStorage.setItem(lsKey, String(value)); } catch {}
    onSettingChange?.(key, value);
  }
  function toggleLang(l) { setLangState(l); saveSetting("lang", l, "kokpar_lang"); }
  const kz = lang === "kz";
  const en = lang === "en";
  function t(ru, kz_text, en_text) {
    if (lang === "kz") return kz_text ?? ru;
    if (lang === "en") return en_text ?? ru;
    return ru;
  }

  const canStart = !onlineMode || onlineLobbyState.canStart;

  function goHome() {
    setHomeScreen(true);
    setNavTab("game");
    setWizardStep(0);
  }
  const startLabel = onlineMode ? onlineStartLabel(onlineLobbyState) : selectedMode.startLabel;

  const handleOnlineLobbyStateChange = useCallback((nextState) => {
    setOnlineLobbyState((currentState) => (sameOnlineState(currentState, nextState) ? currentState : nextState));
  }, []);

  useEffect(() => {
    setOnlineReady(false);
    setOnlineLobbyState(EMPTY_ONLINE_STATE);
  }, [settings.modeId, settings.teamSide, settings.horseId]);

  useEffect(() => {
    setWizardStep(0);
  }, [navTab]);

  function handleStart() {
    if (onlineMode) {
      setOnlineStartRequest((r) => r + 1);
      return;
    }
    onStart();
  }

  function submitRiderName(e) {
    e.preventDefault();
    onRiderRename?.(draftRiderName);
    setEditingRider(false);
  }

  function handleListEquipment(horseId, slotKey, itemId) {
    setListingDraft({ itemType: "equipment", itemId, slotKey, horseId, defaultPrice: 200 });
    setStableTab("market");
  }

  function handleListHorse(horseId) {
    const horse = profile.ownedHorses.find((h) => h.id === horseId);
    setListingDraft({ itemType: "horse", horseId, horseName: horse?.name, defaultPrice: 800 });
    setStableTab("market");
  }

  const MODE_INITIAL = { kokpar: "К", training: "Т", online_room: "О", kokbori: "К" };
  const MODE_ICON_COLOR = { kokpar: "gold", training: "gold", online_room: "blue", kokbori: "muted" };
  const MODE_IMG = {
    kokpar: "/images/modes/mode-kokpar.webp",
    training: "/images/modes/mode-training.webp",
    online_room: "/images/modes/mode-online.webp",
  };
  const isTraining = selectedMode.id === "training";

  async function handleListItem(itemType, itemId, slotKey, horseId, price) {
    await onListItem?.(itemType, itemId, slotKey, horseId, price);
    setListingDraft(null);
  }

  return (
    <section className="setup" aria-label="Кокпар 3D">
      <div className="setup-panel stable-panel">
        <div className="status-bar-spacer" />

        {/* HOME SCREEN */}
        {homeScreen && (
          <>
            <div className="home-profile-row">
              <div className="home-avatar">{profile.riderName.slice(0, 1)}</div>
              <div className="home-profile-info">
                <span className="home-role">Шабандоз</span>
                <span className="home-name">{profile.riderName || "Ерлан"}</span>
              </div>
              <span className="home-level-chip">Ур. {profile.level}</span>
              <button className="home-coins-chip" type="button" onClick={() => setShowCoinShop(true)}>
                {formatCoins(profile.coins)} ⌾<span className="coins-chip-plus">+</span>
              </button>
            </div>

            <div className="home-scene-card">
              <img src="/images/modes/home-bg.webp" alt="" className="home-scene-bg" />
              <div className="home-scene-inner">
                <div className="home-emblem"><span className="home-emblem-letter">Қ</span></div>
                <div className="home-logo">КӨКПАР</div>
                <div className="home-logo-3d">3 D</div>
              </div>
            </div>

            <div className="home-actions">
              <button
                className="start-button home-play-btn"
                type="button"
                onClick={() => { setHomeScreen(false); setNavTab("game"); setWizardStep(0); }}
              >
                {t("Ойнау · Играть", "Ойнау", "Play")}
              </button>
              <div className="home-sub-btns">
                <button type="button" className="home-sub-btn" onClick={() => { setHomeScreen(false); setNavTab("stable"); }}>
                  {t("Конюшня", "Қора", "Stable")}
                </button>
                <button type="button" className="home-sub-btn" onClick={() => setShowCoinScreen(true)}>
                  {t("Магазин", "Дүкен", "Shop")}
                </button>
                <button type="button" className="home-sub-btn" onClick={() => { setHomeScreen(false); setNavTab("profile"); }}>
                  {t("Настройки", "Баптаулар", "Settings")}
                </button>
              </div>

              {auth.status !== "signed-in" && (
                <div className="home-guest-strip">
                  <span className="home-guest-dot" />
                  <span className="home-guest-text">{t("Гостевой профиль · сохраняется локально", "Қонақ профилі · жергілікті сақталады", "Guest profile · saved locally")}</span>
                  <button type="button" className="home-guest-login" onClick={onBackToLogin}>{t("Войти", "Кіру", "Sign in")}</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Top bar (hidden on game step 0 and on settings — those screens have their own header) */}
        {!homeScreen && !(navTab === "game" && wizardStep === 0) && navTab !== "profile" && (
          <div className="setup-topbar">
            <span className="setup-topbar-title">Кокпар 3D</span>
            <button className="setup-topbar-coins" type="button" onClick={() => setShowCoinShop(true)}>
              {formatCoins(profile.coins)} ⌾<span className="coins-chip-plus">+</span>
            </button>
          </div>
        )}

        {/* Scrollable content */}
        {!homeScreen && (
        <div className="setup-content">

          {/* TAB: ИГРА */}
          {navTab === "game" && (
            <div className="tab-pane">

              {/* Step 0 — mode selection */}
              {wizardStep === 0 && (
                <div className="wizard-section">
                  {/* Header with back + title (replaces topbar on this screen) */}
                  <div className="wizard-step-header" style={{ padding: "8px 0 18px" }}>
                    <button type="button" className="wizard-back-btn" onClick={goHome}>‹</button>
                    <span className="wizard-step-title">{t("Режим", "Режим", "Mode")}</span>
                  </div>
                  <div className="wizard-mode-grid">
                    {GAME_MODES.map((mode) => {
                      const isActive = settings.modeId === mode.id;
                      const MODE_PREVIEW_TEXT = {
                        kokpar: "арт режима: борьба за серке",
                        training: "арт режима: вольный заезд",
                        online_room: "арт режима: онлайн-лобби"
                      };
                      const MODE_BADGE = {
                        kokpar: t("Классика", "Классика", "Classic"),
                        training: t("Практика", "Практика", "Practice"),
                        online_room: t("Онлайн", "Онлайн", "Online")
                      };
                      const MODE_SHORT_DESC = {
                        kokpar: t("Матч с выбором круга или казана.", "Матч — шеңбер немесе қазан.", "Match with circle or kazan goal."),
                        training: t("Свободный заезд: контроль, подбор серке, броски.", "Бос жүріс: бақылау, серке, лақтыру.", "Free ride: control, grab serke, throw."),
                        online_room: t("Создать комнату или войти по коду.", "Бөлме жасау немесе код бойынша кіру.", "Create room or join by code.")
                      };
                      if (isActive) {
                        return (
                          <div key={mode.id} className="wizard-mode-big-card">
                            <div className="wizard-mode-big-preview">
                            {MODE_IMG[mode.id]
                              ? <img src={MODE_IMG[mode.id]} alt={mode.name} className="wizard-mode-big-img" />
                              : (MODE_PREVIEW_TEXT[mode.id] ?? "арт режима")}
                          </div>
                            <div className="wizard-mode-big-body">
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <span className="wizard-mode-big-title">{mode.name}</span>
                                {MODE_BADGE[mode.id] && <span className="wizard-classic-badge">{MODE_BADGE[mode.id]}</span>}
                              </div>
                              <p className="wizard-mode-big-desc">{MODE_SHORT_DESC[mode.id] ?? mode.description}</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          className={`wizard-mode-card${mode.soon ? " disabled" : ""}`}
                          style={mode.soon ? { opacity: 0.6, borderStyle: "dashed" } : {}}
                          disabled={mode.soon}
                          onClick={() => onSettingChange("modeId", mode.id)}
                        >
                          <div className={`wizard-mode-img-box mode-img-${MODE_ICON_COLOR[mode.id] ?? "gold"}`}>
                            {MODE_IMG[mode.id] && <img src={MODE_IMG[mode.id]} alt={mode.name} className="wizard-mode-thumb-img" />}
                          </div>
                          <span className="wizard-mode-body">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <strong>{mode.name}</strong>
                              {mode.soon && <span className="wizard-mode-soon-badge">скоро</span>}
                            </div>
                            <span className="wizard-mode-short-desc">{MODE_SHORT_DESC[mode.id] ?? mode.role}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="tab-footer">
                    <button
                      className="start-button"
                      type="button"
                      style={{ width: "100%" }}
                      disabled={selectedMode.soon}
                      onClick={() => setWizardStep(1)}
                    >
                        {t("Далее · Настройки матча", "Әрі қарай · Матч баптаулары", "Next · Match settings")}
                      </button>
                  </div>
                </div>
              )}

              {/* Step 1 — online lobby */}
              {wizardStep >= 1 && onlineMode && (
                <div className="wizard-section">
                  <div className="wizard-step-header">
                    <button type="button" className="wizard-back-btn" onClick={() => setWizardStep(0)}>‹</button>
                    <span className="wizard-step-title">Комната</span>
                  </div>
                  <OnlineRoomLobby
                    auth={auth}
                    profile={profile}
                    selectedHorse={selectedHorse}
                    settings={settings}
                    ready={onlineReady}
                    startRequest={onlineStartRequest}
                    onReadyChange={setOnlineReady}
                    onTeamChange={(teamSide) => onSettingChange("teamSide", teamSide)}
                    onBackToLogin={onBackToLogin}
                    onLobbyStateChange={handleOnlineLobbyStateChange}
                    onRoomStart={onStart}
                  />
                  <div className="tab-footer wizard-footer">
                    <button className="start-button" type="button" onClick={handleStart} disabled={!canStart}>
                      <Play size={19} fill="currentColor" strokeWidth={2.4} />
                      <span>{startLabel}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1 — match settings (kokpar / training) */}
              {wizardStep === 1 && !onlineMode && (
                <div className="wizard-section">
                  <div className="wizard-step-header">
                    <button type="button" className="wizard-back-btn" onClick={() => setWizardStep(0)}>‹</button>
                    <span className="wizard-step-title">{isTraining ? t("Тренировка", "Тренировка", "Training") : t("Матч", "Матч", "Match")}</span>
                    {!isTraining && <span className="wizard-mode-pill">{selectedMode.name}</span>}
                  </div>

                  {!isTraining && (
                    <>
                      <p className="wizard-label">{t("Цель", "Мақсат", "Goal")}</p>
                      <div className="wizard-side-grid">
                        <button type="button"
                          className={`wizard-option-card${settings.goalType === "circle" ? " active" : ""}${selectedMode.goalLocked ? " disabled" : ""}`}
                          style={{ flexDirection: "column", height: "auto", padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 4 }}
                          disabled={selectedMode.goalLocked}
                          onClick={() => onSettingChange("goalType", "circle")}>
                          <strong style={{ fontFamily: "Oswald, sans-serif", fontSize: 17, fontWeight: 600 }}>{t("Круг", "Шеңбер", "Circle")}</strong>
                          <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, color: "rgba(214,178,110,.75)" }}>{t("Разметка на земле", "Жерде белгілеу", "Ground marking")}</span>
                        </button>
                        <button type="button"
                          className={`wizard-option-card${settings.goalType === "kazan" ? " active" : ""}${selectedMode.goalLocked ? " disabled" : ""}`}
                          style={{ flexDirection: "column", height: "auto", padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 4 }}
                          disabled={selectedMode.goalLocked}
                          onClick={() => onSettingChange("goalType", "kazan")}>
                          <strong style={{ fontFamily: "Oswald, sans-serif", fontSize: 17, fontWeight: 600 }}>{t("Казан", "Қазан", "Kazan")}</strong>
                          <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, color: "rgba(214,178,110,.75)" }}>{t("Препятствие", "Кедергі", "Obstacle")}</span>
                        </button>
                      </div>

                      <p className="wizard-label">{t("Состав", "Құрам", "Teams")}</p>
                      <div className="wizard-three-grid">
                        {[3, 4, 5].map((size) => (
                          <button key={size} type="button"
                            className={`wizard-option-card${settings.teamSize === size ? " active" : ""}`}
                            onClick={() => onSettingChange("teamSize", size)}>
                            {size} × {size}
                          </button>
                        ))}
                      </div>

                      <p className="wizard-label">{t("Время", "Уақыт", "Time")}</p>
                      <div className="wizard-three-grid">
                        {[
                          { minutes: 2, label: "2 мин" },
                          { minutes: 3, label: "3 мин" },
                          { minutes: 5, label: "5 мин" }
                        ].map(({ minutes, label }) => (
                          <button key={minutes} type="button"
                            className={`wizard-option-card${settings.matchMinutes === minutes ? " active" : ""}`}
                            onClick={() => onSettingChange("matchMinutes", minutes)}>
                            {label}
                          </button>
                        ))}
                      </div>

                      <p className="wizard-label">{t("Сторона", "Жақ", "Side")}</p>
                      <div className="wizard-side-grid">
                        <button type="button" className={`wizard-side-card blue${settings.teamSide !== "red" ? " active" : ""}`}
                          onClick={() => onSettingChange("teamSide", "blue")}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#2590d0", display: "inline-block", flexShrink: 0 }} />
                          <strong>Көк</strong>
                        </button>
                        <button type="button" className={`wizard-side-card red${settings.teamSide === "red" ? " active" : ""}`}
                          onClick={() => onSettingChange("teamSide", "red")}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#e04535", display: "inline-block", flexShrink: 0 }} />
                          <strong>Қызыл</strong>
                        </button>
                      </div>
                    </>
                  )}

                  <p className="wizard-label">{t("Сложность", "Қиындық", "Difficulty")}</p>
                  <div className="wizard-diff-seg">
                    {[
                      { id: "easy",   label: t("Лёгкая", "Жеңіл", "Easy")  },
                      { id: "normal", label: t("Средняя", "Орташа", "Normal") },
                      { id: "hard",   label: t("Сложная", "Қиын", "Hard") }
                    ].map(({ id, label }) => (
                      <button key={id} type="button"
                        className={`wizard-diff-seg-btn${(settings.difficulty ?? "normal") === id ? " active" : ""}`}
                        onClick={() => onSettingChange("difficulty", id)}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="tab-footer wizard-footer">
                    <button
                      type="button"
                      className="horse-strip"
                      onClick={() => setNavTab("stable")}
                      aria-label="Сменить лошадь"
                    >
                      <span className="horse-strip-avatar">{selectedHorse.name.slice(0, 1)}</span>
                      <span className="horse-strip-info">
                        <strong>{selectedHorse.name}</strong>
                        <span>Арғымақ · {t("Баланс", "Баланс", "Balance")} · {t("Ур.", "Дең.", "Lv.")} {selectedHorse.level}</span>
                      </span>
                      <span style={{ font: "700 12px Manrope, sans-serif", color: "#3aabee" }}>{t("Сменить", "Ауыстыру", "Change")}</span>
                    </button>
                    <button className="start-button" type="button" onClick={handleStart} disabled={!canStart}>
                      <Play size={19} fill="currentColor" strokeWidth={2.4} />
                      <span>{startLabel}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: КОНЮШНЯ */}
          {navTab === "stable" && (
            <div className="tab-pane">
              {!stableCardOpen && (
                <div className="wizard-step-header">
                  <button type="button" className="wizard-back-btn" onClick={goHome}>‹</button>
                  <span className="wizard-step-title">Қора · Конюшня</span>
                  <span style={{ font: "700 12px Manrope, sans-serif", color: "rgba(214,178,110,.7)" }}>
                    {profile.ownedHorses.length} / {profile.stableCapacity}
                  </span>
                </div>
              )}
              {!stableCardOpen && stableTab !== "stable" && (
                <div className="stable-tabs">
                  <button type="button" className={stableTab === "stable" ? "stable-tab-btn active" : "stable-tab-btn"} onClick={() => setStableTab("stable")}>
                    {t("Конюшня", "Қора", "Stable")}
                  </button>
                  <button type="button" className={stableTab === "shop" ? "stable-tab-btn active" : "stable-tab-btn"} onClick={() => setStableTab("shop")}>
                    {t("Магазин", "Дүкен", "Shop")}
                  </button>
                  <button type="button" className={stableTab === "market" ? "stable-tab-btn active" : "stable-tab-btn"} onClick={() => setStableTab("market")}>
                    <Gavel size={13} strokeWidth={2.4} />
                    {t("Торги", "Аукцион", "Auction")}
                  </button>
                </div>
              )}

              {stableTab === "stable" && (
                <HorseStable
                  ownedHorses={profile.ownedHorses}
                  stableCapacity={profile.stableCapacity}
                  horseId={settings.horseId}
                  profile={profile}
                  onHorseChange={(horseId) => onSettingChange("horseId", horseId)}
                  onHorseRename={onHorseRename}
                  onHorseCreate={onHorseCreate}
                  onHorseDelete={onHorseDelete}
                  onEquipItem={onEquipItem}
                  onListEquipment={handleListEquipment}
                  onListHorse={handleListHorse}
                  onEquipFromInventory={onEquipFromInventory}
                  onExpandStable={onExpandStable}
                  stableSlotCost={stableSlotCost}
                  onGoToShop={() => setStableTab("shop")}
                  onGoToMatch={() => { setNavTab("game"); setWizardStep(0); }}
                  onCardOpenChange={setStableCardOpen}
                />
              )}
              {stableTab === "shop" && (
                <>
                  <div className="stable-tabs">
                    <button type="button" className="stable-tab-btn" onClick={() => setStableTab("stable")}>Конюшня</button>
                    <button type="button" className="stable-tab-btn active" onClick={() => setStableTab("shop")}>Магазин</button>
                    <button type="button" className="stable-tab-btn" onClick={() => setStableTab("market")}><Gavel size={13} strokeWidth={2.4} />Торги</button>
                  </div>
                  <Shop profile={profile} onBuyHorse={onBuyHorse} />
                </>
              )}
              {stableTab === "market" && (
                <>
                  <div className="stable-tabs">
                    <button type="button" className="stable-tab-btn" onClick={() => setStableTab("stable")}>Конюшня</button>
                    <button type="button" className="stable-tab-btn" onClick={() => setStableTab("shop")}>Магазин</button>
                    <button type="button" className="stable-tab-btn active" onClick={() => setStableTab("market")}><Gavel size={13} strokeWidth={2.4} />Торги</button>
                  </div>
                  <Marketplace
                    profile={profile}
                    listingDraft={listingDraft}
                    onListItem={handleListItem}
                    onCancelListing={onCancelListing}
                    onPurchase={onPurchase}
                  />
                </>
              )}
            </div>
          )}

          {/* TAB: ИСТОРИЯ */}
          {navTab === "history" && (
            <div className="tab-pane">
              <div className="wizard-step-header">
                <button type="button" className="wizard-back-btn" onClick={goHome}>‹</button>
                <span className="wizard-step-title">История</span>
              </div>
              <MatchHistory />
            </div>
          )}

          {/* TAB: БАПТАУЛАР / НАСТРОЙКИ */}
          {navTab === "profile" && (
            <div className="tab-pane">
              <div className="wizard-step-header">
                <button type="button" className="wizard-back-btn" onClick={goHome}>‹</button>
                <span className="wizard-step-title">{t("Настройки", "Баптаулар", "Settings")}</span>
              </div>
              <div className="settings-page">

                {/* Language */}
                <div className="settings-section-label">{t("Язык", "Тіл", "Language")}</div>
                <div className="settings-seg">
                  <button type="button" className={`settings-seg-btn${kz ? " active" : ""}`} onClick={() => toggleLang("kz")}>Қазақша</button>
                  <button type="button" className={`settings-seg-btn${!kz && !en ? " active" : ""}`} onClick={() => toggleLang("ru")}>Русский</button>
                  <button type="button" className={`settings-seg-btn${en ? " active" : ""}`} onClick={() => toggleLang("en")}>English</button>
                </div>

                {/* Sound */}
                <div className="settings-section-label">{t("Звук", "Дыбыс", "Sound")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Эффекты", "Эффекттер", "Effects")}</span>
                    <input type="range" className="settings-slider" min={0} max={100} value={sfxVol}
                      style={{"--fill": sfxVol + "%"}}
                      onChange={(e) => { const v = Number(e.target.value); e.target.style.setProperty("--fill", v + "%"); setSfxVol(v); saveSetting("sfxVol", v, "kokpar_sfx"); }} />
                    <span className="settings-row-val">{sfxVol}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Музыка", "Музыка", "Music")}</span>
                    <input type="range" className="settings-slider" min={0} max={100} value={musicVol}
                      style={{"--fill": musicVol + "%"}}
                      onChange={(e) => { const v = Number(e.target.value); e.target.style.setProperty("--fill", v + "%"); setMusicVol(v); saveSetting("musicVol", v, "kokpar_music"); }} />
                    <span className="settings-row-val">{musicVol}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Вибрация", "Діріл", "Vibration")}</span>
                    <button type="button" className={`settings-toggle${vibration ? " on" : ""}`}
                      onClick={() => { const v = !vibration; setVibration(v); saveSetting("vibration", v, "kokpar_vibration"); }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                </div>

                {/* Camera / Controls */}
                <div className="settings-section-label">{t("Управление", "Басқару", "Controls")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Камера", "Камера", "Camera")}</span>
                    <div className="settings-seg-sm">
                      <button type="button" className={`settings-seg-btn-sm${cameraMode === "tv" ? " active" : ""}`}
                        onClick={() => { setCameraMode("tv"); saveSetting("cameraMode", "tv", "kokpar_camera"); }}>TV</button>
                      <button type="button" className={`settings-seg-btn-sm${cameraMode === "back" ? " active" : ""}`}
                        onClick={() => { setCameraMode("back"); saveSetting("cameraMode", "back", "kokpar_camera"); }}>{t("За спиной", "Артта", "Behind")}</button>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Джойстик", "Джойстик", "Joystick")}</span>
                    <input type="range" className="settings-slider" min={10} max={100} value={joystickSensitivity}
                      style={{"--fill": joystickSensitivity + "%"}}
                      onChange={(e) => { const v = Number(e.target.value); e.target.style.setProperty("--fill", v + "%"); setJoystickSensitivity(v); saveSetting("joystickSensitivity", v, "kokpar_joystick"); }} />
                    <span className="settings-row-val">{joystickSensitivity}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Левша", "Сол қол", "Left-handed")}</span>
                    <button type="button" className={`settings-toggle${leftHand ? " on" : ""}`}
                      onClick={() => { const v = !leftHand; setLeftHand(v); saveSetting("leftHand", v, "kokpar_lefthand"); }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{t("Подсказки", "Кеңестер", "Hints")}</span>
                    <button type="button" className={`settings-toggle${hints ? " on" : ""}`}
                      onClick={() => { const v = !hints; setHints(v); saveSetting("hints", v, "kokpar_hints"); }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                </div>

                {/* Account row — at bottom per design */}
                <div className="settings-account-row">
                  <div className="settings-account-avatar">{profile.riderName.slice(0, 1)}</div>
                  <div className="settings-account-info">
                    {editingRider ? (
                      <form className="rider-name-form" onSubmit={submitRiderName}>
                        <input aria-label={t("Имя игрока", "Ойыншы аты", "Player name")} maxLength={24} value={draftRiderName}
                          onChange={(e) => setDraftRiderName(e.target.value)} autoFocus />
                        <button type="submit"><Check size={14} strokeWidth={2.7} /></button>
                        <button type="button" onClick={() => { setEditingRider(false); setDraftRiderName(profile.riderName); }}>
                          <X size={14} strokeWidth={2.7} />
                        </button>
                      </form>
                    ) : (
                      <button type="button" className="settings-account-name-btn" onClick={() => { setDraftRiderName(profile.riderName); setEditingRider(true); }}>
                        <strong>{profile.riderName}</strong>
                        <Pencil size={11} strokeWidth={2.4} />
                      </button>
                    )}
                    <span>{auth.status === "signed-in" ? auth.email : t("Гостевой профиль", "Қонақ профилі", "Guest profile")}</span>
                  </div>
                  {auth.status === "signed-in" ? (
                    <button type="button" className="settings-signout-btn" onClick={onSignOut}>{t("Выйти", "Шығу", "Sign out")}</button>
                  ) : (
                    <button type="button" className="settings-signin-btn" onClick={onBackToLogin}>{t("Войти", "Кіру", "Sign in")}</button>
                  )}
                </div>

                <div className="settings-footer">Kokpar 3D · v0.9.0</div>
              </div>
            </div>
          )}

        </div>
        )}

        {/* Bottom navigation */}
        <nav className="bottom-nav" aria-label="Навигация">
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "game" ? " active" : ""}`}
            onClick={() => setNavTab("game")}
          >
            <Play size={22} strokeWidth={2.2} />
            <span>{t("Игра", "Ойын", "Play")}</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "stable" ? " active" : ""}`}
            onClick={() => setNavTab("stable")}
          >
            <Trophy size={22} strokeWidth={2.2} />
            <span>{t("Конюшня", "Қора", "Stable")}</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "history" ? " active" : ""}`}
            onClick={() => setNavTab("history")}
          >
            <History size={22} strokeWidth={2.2} />
            <span>{t("История", "Тарих", "History")}</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "profile" ? " active" : ""}`}
            onClick={() => setNavTab("profile")}
          >
            <User size={22} strokeWidth={2.2} />
            <span>{t("Профиль", "Профиль", "Profile")}</span>
          </button>
        </nav>

      </div>

      {/* ── Coin shop overlay ── */}
      {showCoinScreen && (
        <div className="cscreen-wrap">
          <div className="status-bar-spacer" />
          <div className="cscreen-topbar">
            <button className="cscreen-back" type="button" onClick={() => setShowCoinScreen(false)}>‹</button>
            <div className="cscreen-title">{t("Монеты", "Монеттер", "Coins")}</div>
            <span className="cscreen-balance-chip">{formatCoins(profile.coins)} ⌾</span>
          </div>
          <div className="cscreen-body">
            <div className="cscreen-balance-card">
              <div className="cscreen-balance-label">{t("Баланс", "Баланс", "Balance")}</div>
              <div className="cscreen-balance-row">
                <span className="cscreen-coin-circle" />
                <span className="cscreen-balance-amount">{formatCoins(profile.coins)}</span>
                <span className="cscreen-daily">
                  {t("за матчи сегодня", "бүгін матчтар үшін", "from today's matches")}<br />
                  <span className="cscreen-daily-gain">+120 ⌾</span>
                </span>
              </div>
            </div>
            <div className="cscreen-packages-section">
              <div className="cscreen-section-label">{t("Наборы", "Жинақтар", "Packages")}</div>
              <div className="cscreen-packages-grid">
                <div className="cscreen-pkg">
                  <div className="cscreen-pkg-row"><span className="cscreen-pkg-coin" /><span className="cscreen-pkg-amount">300</span></div>
                  <div className="cscreen-pkg-name">{t("Стартовый", "Стартовый", "Starter")}</div>
                  <button className="cscreen-pkg-btn" type="button" disabled>299 ₸</button>
                </div>
                <div className="cscreen-pkg">
                  <div className="cscreen-pkg-row"><span className="cscreen-pkg-coin" /><span className="cscreen-pkg-amount">800</span></div>
                  <div className="cscreen-pkg-name">+10% {kz ? "бонус" : "бонус"}</div>
                  <button className="cscreen-pkg-btn" type="button" disabled>749 ₸</button>
                </div>
                <div className="cscreen-pkg cscreen-pkg--featured">
                  <span className="cscreen-pkg-badge">{t("выгодно", "тиімді", "best value")}</span>
                  <div className="cscreen-pkg-row"><span className="cscreen-pkg-coin" /><span className="cscreen-pkg-amount">2 000</span></div>
                  <div className="cscreen-pkg-name">+20% {kz ? "бонус" : "бонус"}</div>
                  <button className="cscreen-pkg-btn cscreen-pkg-btn--featured" type="button" disabled>1 690 ₸</button>
                </div>
                <div className="cscreen-pkg">
                  <div className="cscreen-pkg-row"><span className="cscreen-pkg-coin" /><span className="cscreen-pkg-amount">5 000</span></div>
                  <div className="cscreen-pkg-name">+35% {kz ? "бонус" : "бонус"}</div>
                  <button className="cscreen-pkg-btn" type="button" disabled>3 990 ₸</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCoinShop && (
        <div className="cshop-overlay" onClick={() => setShowCoinShop(false)}>
          <div className="cshop-sheet" onClick={(e) => e.stopPropagation()}>
            <span className="cshop-handle" />
            <div className="cshop-head">
              <span className="cshop-coin-circle" />
              <div className="cshop-head-info">
                <div className="cshop-head-title">{t("Пополнить монеты", "Монет толтыру", "Top up coins")}</div>
                <div className="cshop-head-balance">{t("Баланс", "Баланс", "Balance")} {formatCoins(profile.coins)} ⌾</div>
              </div>
            </div>
            <div className="cshop-packages">
              <div className="cshop-pkg">
                <div className="cshop-pkg-amount">300</div>
                <div className="cshop-pkg-price">299 ₸</div>
              </div>
              <div className="cshop-pkg cshop-pkg--featured">
                <span className="cshop-pkg-badge">{t("выгодно", "тиімді", "best value")}</span>
                <div className="cshop-pkg-amount">2 000</div>
                <div className="cshop-pkg-price cshop-pkg-price--featured">1 690 ₸</div>
              </div>
              <div className="cshop-pkg">
                <div className="cshop-pkg-amount">5 000</div>
                <div className="cshop-pkg-price">3 990 ₸</div>
              </div>
            </div>
            <div className="cshop-methods">
              <div className="cshop-method">Kaspi</div>
              <div className="cshop-method">Apple Pay</div>
              <div className="cshop-method">Google Play</div>
            </div>
            <button className="cshop-pay-btn" type="button" disabled>
              {t("Оплатить 1 690 ₸", "Төлеу 1 690 ₸", "Pay 1 690 ₸")}
            </button>
            <div className="cshop-ad-row">
              <div className="cshop-ad-icon">▶</div>
              <div className="cshop-ad-text">{t("Или посмотрите рекламу: +50 ⌾", "Немесе жарнама қараңыз: +50 ⌾", "Or watch an ad: +50 ⌾")}</div>
              <button className="cshop-ad-btn" type="button" disabled>{t("Смотреть", "Қарау", "Watch")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
