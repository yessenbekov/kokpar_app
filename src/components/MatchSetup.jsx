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

export function MatchSetup({ profile, settings, auth, onBackToLogin, onSignOut, onHorseRename, onHorseCreate, onHorseDelete, onSettingChange, onStart, onRiderRename, onBuyItem, onBuyHorse, onEquipItem, onListItem, onCancelListing, onPurchase, onEquipFromInventory }) {
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
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem("kokpar_lang") || "ru"; } catch { return "ru"; } });
  const [sfxVol, setSfxVol] = useState(() => { try { return Number(localStorage.getItem("kokpar_sfx") ?? 78); } catch { return 78; } });
  const [musicVol, setMusicVol] = useState(() => { try { return Number(localStorage.getItem("kokpar_music") ?? 42); } catch { return 42; } });
  const [vibration, setVibration] = useState(() => { try { return localStorage.getItem("kokpar_vibration") !== "false"; } catch { return true; } });
  const [cameraMode, setCameraMode] = useState(() => { try { return localStorage.getItem("kokpar_camera") || "back"; } catch { return "back"; } });
  const [leftHand, setLeftHand] = useState(() => { try { return localStorage.getItem("kokpar_lefthand") === "true"; } catch { return false; } });
  const [hints, setHints] = useState(() => { try { return localStorage.getItem("kokpar_hints") !== "false"; } catch { return true; } });

  function toggleLang(l) { setLangState(l); try { localStorage.setItem("kokpar_lang", l); } catch {} }
  const kz = lang === "kz";

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
  const isTraining = selectedMode.id === "training";

  async function handleListItem(itemType, itemId, slotKey, horseId, price) {
    await onListItem?.(itemType, itemId, slotKey, horseId, price);
    setListingDraft(null);
  }

  return (
    <section className="setup" aria-label="Кокпар 3D">
      <div className="setup-panel stable-panel">

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
              <span className="home-coins-chip">{formatCoins(profile.coins)} күміс</span>
            </div>

            <div className="home-scene-card">
              <div className="home-scene-inner">
                <div className="home-logo">КӨКПАР</div>
                <div className="home-logo-3d">3 D</div>
                <span className="home-scene-caption">3D сцена: всадник с серке, статичный кадр</span>
              </div>
            </div>

            <div className="home-actions">
              <button
                className="start-button home-play-btn"
                type="button"
                onClick={() => { setHomeScreen(false); setNavTab("game"); setWizardStep(0); }}
              >
                {kz ? "Ойнау" : "Ойнау · Играть"}
              </button>
              <div className="home-sub-btns">
                <button type="button" className="home-sub-btn" onClick={() => { setHomeScreen(false); setNavTab("stable"); }}>
                  {kz ? "Қора" : "Конюшня"}
                </button>
                <button type="button" className="home-sub-btn" onClick={() => {
                  onSettingChange("modeId", "online_room");
                  setHomeScreen(false);
                  setNavTab("game");
                  setWizardStep(1);
                }}>
                  Онлайн
                </button>
                <button type="button" className="home-sub-btn" onClick={() => { setHomeScreen(false); setNavTab("profile"); }}>
                  {kz ? "Баптаулар" : "Настройки"}
                </button>
              </div>

              {auth.status !== "signed-in" && (
                <div className="home-guest-strip">
                  <span className="home-guest-dot" />
                  <span className="home-guest-text">{kz ? "Қонақ профилі · жергілікті сақталады" : "Гостевой профиль · сохраняется локально"}</span>
                  <button type="button" className="home-guest-login" onClick={onBackToLogin}>{kz ? "Кіру" : "Войти"}</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Top bar (hidden on game step 0 — that screen has its own header) */}
        {!homeScreen && !(navTab === "game" && wizardStep === 0) && (
          <div className="setup-topbar">
            <span className="setup-topbar-title">Кокпар 3D</span>
            <span className="setup-topbar-coins">{formatCoins(profile.coins)} күміс</span>
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
                    <span className="wizard-step-title">{kz ? "Режим" : "Режим"}</span>
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
                        kokpar: kz ? "Классика" : "Классика",
                        training: kz ? "Практика" : "Практика",
                        online_room: "Онлайн"
                      };
                      const MODE_SHORT_DESC = {
                        kokpar: kz ? "Матч — шеңбер немесе қазан." : "Матч с выбором круга или казана.",
                        training: kz ? "Бос жүріс: бақылау, серке, лақтыру." : "Свободный заезд: контроль, подбор серке, броски.",
                        online_room: kz ? "Бөлме жасау немесе код бойынша кіру." : "Создать комнату или войти по коду."
                      };
                      if (isActive) {
                        return (
                          <div key={mode.id} className="wizard-mode-big-card">
                            <div className="wizard-mode-big-preview">{MODE_PREVIEW_TEXT[mode.id] ?? "арт режима"}</div>
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
                          <div className={`wizard-mode-img-box mode-img-${MODE_ICON_COLOR[mode.id] ?? "gold"}`} />
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
                        {kz ? "Әрі қарай · Матч баптаулары" : "Далее · Настройки матча"}
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
                    <span className="wizard-step-title">{isTraining ? "Тренировка" : "Матч"}</span>
                    {!isTraining && <span className="wizard-mode-pill">{selectedMode.name}</span>}
                  </div>

                  {!isTraining && (
                    <>
                      <p className="wizard-label">Цель</p>
                      <div className="wizard-side-grid">
                        <button type="button"
                          className={`wizard-option-card${settings.goalType === "circle" ? " active" : ""}${selectedMode.goalLocked ? " disabled" : ""}`}
                          style={{ flexDirection: "column", height: "auto", padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 4 }}
                          disabled={selectedMode.goalLocked}
                          onClick={() => onSettingChange("goalType", "circle")}>
                          <strong style={{ fontFamily: "Oswald, sans-serif", fontSize: 17, fontWeight: 600 }}>Круг</strong>
                          <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, color: "rgba(214,178,110,.75)" }}>Разметка на земле</span>
                        </button>
                        <button type="button"
                          className={`wizard-option-card${settings.goalType === "kazan" ? " active" : ""}${selectedMode.goalLocked ? " disabled" : ""}`}
                          style={{ flexDirection: "column", height: "auto", padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 4 }}
                          disabled={selectedMode.goalLocked}
                          onClick={() => onSettingChange("goalType", "kazan")}>
                          <strong style={{ fontFamily: "Oswald, sans-serif", fontSize: 17, fontWeight: 600 }}>Казан</strong>
                          <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, color: "rgba(214,178,110,.75)" }}>Препятствие</span>
                        </button>
                      </div>

                      <p className="wizard-label">Состав</p>
                      <div className="wizard-three-grid">
                        {[3, 4, 5].map((size) => (
                          <button key={size} type="button"
                            className={`wizard-option-card${settings.teamSize === size ? " active" : ""}`}
                            onClick={() => onSettingChange("teamSize", size)}>
                            {size} × {size}
                          </button>
                        ))}
                      </div>

                      <p className="wizard-label">Время</p>
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

                      <p className="wizard-label">Сторона</p>
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

                  <p className="wizard-label">Сложность</p>
                  <div className="wizard-diff-seg">
                    {[
                      { id: "easy",   label: "Лёгкая"  },
                      { id: "normal", label: "Средняя" },
                      { id: "hard",   label: "Сложная" }
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
                        <span>Арғымақ · Баланс · Ур. {selectedHorse.level}</span>
                      </span>
                      <span style={{ font: "700 12px Manrope, sans-serif", color: "#3aabee" }}>Сменить</span>
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
              <div className="wizard-step-header">
                <button type="button" className="wizard-back-btn" onClick={goHome}>‹</button>
                <span className="wizard-step-title">Қора · Конюшня</span>
              </div>
              <div className="stable-tabs">
                <button type="button" className={stableTab === "stable" ? "stable-tab-btn active" : "stable-tab-btn"} onClick={() => setStableTab("stable")}>
                  Конюшня
                </button>
                <button type="button" className={stableTab === "shop" ? "stable-tab-btn active" : "stable-tab-btn"} onClick={() => setStableTab("shop")}>
                  Магазин
                </button>
                <button type="button" className={stableTab === "market" ? "stable-tab-btn active" : "stable-tab-btn"} onClick={() => setStableTab("market")}>
                  <Gavel size={13} strokeWidth={2.4} />
                  Торги
                </button>
              </div>

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
                />
              )}
              {stableTab === "shop" && (
                <Shop
                  profile={profile}
                  onBuyHorse={onBuyHorse}
                />
              )}
              {stableTab === "market" && (
                <Marketplace
                  profile={profile}
                  listingDraft={listingDraft}
                  onListItem={handleListItem}
                  onCancelListing={onCancelListing}
                  onPurchase={onPurchase}
                />
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
                <span className="wizard-step-title">{kz ? "Баптаулар" : "Настройки"}</span>
              </div>
              <div className="settings-page">

                {/* Account row */}
                <div className="settings-account-row">
                  <div className="settings-account-avatar">{profile.riderName.slice(0, 1)}</div>
                  <div className="settings-account-info">
                    <strong>{profile.riderName}</strong>
                    <span>{auth.status === "signed-in" ? auth.email : (kz ? "Қонақ профилі" : "Гостевой профиль")}</span>
                  </div>
                  {auth.status === "signed-in" ? (
                    <button type="button" className="settings-signout-btn" onClick={onSignOut}>{kz ? "Шығу" : "Выйти"}</button>
                  ) : (
                    <button type="button" className="settings-signin-btn" onClick={onBackToLogin}>{kz ? "Кіру" : "Войти"}</button>
                  )}
                </div>

                {/* Rider name edit */}
                <div className="settings-name-row">
                  {editingRider ? (
                    <form className="rider-name-form" onSubmit={submitRiderName}>
                      <input aria-label={kz ? "Ойыншы аты" : "Имя игрока"} maxLength={24} value={draftRiderName}
                        onChange={(e) => setDraftRiderName(e.target.value)} autoFocus />
                      <button type="submit"><Check size={14} strokeWidth={2.7} /></button>
                      <button type="button" onClick={() => { setEditingRider(false); setDraftRiderName(profile.riderName); }}>
                        <X size={14} strokeWidth={2.7} />
                      </button>
                    </form>
                  ) : (
                    <div className="settings-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                      <span className="settings-row-label">{kz ? "Лақап ат" : "Псевдоним"}</span>
                      <span className="settings-name-val">{profile.riderName}</span>
                      <button className="settings-edit-btn" type="button" onClick={() => { setDraftRiderName(profile.riderName); setEditingRider(true); }}>
                        <Pencil size={13} strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Language */}
                <div className="settings-section-label">{kz ? "Тіл" : "Язык"}</div>
                <div className="settings-seg">
                  <button type="button" className={`settings-seg-btn${kz ? " active" : ""}`} onClick={() => toggleLang("kz")}>Қазақша</button>
                  <button type="button" className={`settings-seg-btn${!kz ? " active" : ""}`} onClick={() => toggleLang("ru")}>Русский</button>
                </div>

                {/* Sound */}
                <div className="settings-section-label">{kz ? "Дыбыс" : "Звук"}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <span className="settings-row-label">{kz ? "Эффекттер" : "Эффекты"}</span>
                    <input type="range" className="settings-slider" min={0} max={100} value={sfxVol}
                      onChange={(e) => { const v = Number(e.target.value); setSfxVol(v); try { localStorage.setItem("kokpar_sfx", v); } catch {} }} />
                    <span className="settings-row-val">{sfxVol}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{kz ? "Музыка" : "Музыка"}</span>
                    <input type="range" className="settings-slider" min={0} max={100} value={musicVol}
                      onChange={(e) => { const v = Number(e.target.value); setMusicVol(v); try { localStorage.setItem("kokpar_music", v); } catch {} }} />
                    <span className="settings-row-val">{musicVol}%</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{kz ? "Діріл" : "Вибрация"}</span>
                    <button type="button" className={`settings-toggle${vibration ? " on" : ""}`}
                      onClick={() => { const v = !vibration; setVibration(v); try { localStorage.setItem("kokpar_vibration", String(v)); } catch {} }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                </div>

                {/* Camera / Controls */}
                <div className="settings-section-label">{kz ? "Басқару" : "Управление"}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <span className="settings-row-label">{kz ? "Камера" : "Камера"}</span>
                    <div className="settings-seg-sm">
                      <button type="button" className={`settings-seg-btn-sm${cameraMode === "tv" ? " active" : ""}`}
                        onClick={() => { setCameraMode("tv"); try { localStorage.setItem("kokpar_camera", "tv"); } catch {} }}>ТВ</button>
                      <button type="button" className={`settings-seg-btn-sm${cameraMode === "back" ? " active" : ""}`}
                        onClick={() => { setCameraMode("back"); try { localStorage.setItem("kokpar_camera", "back"); } catch {} }}>{kz ? "Артта" : "За спиной"}</button>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{kz ? "Сол қол" : "Левша"}</span>
                    <button type="button" className={`settings-toggle${leftHand ? " on" : ""}`}
                      onClick={() => { const v = !leftHand; setLeftHand(v); try { localStorage.setItem("kokpar_lefthand", String(v)); } catch {} }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">{kz ? "Кеңестер" : "Подсказки"}</span>
                    <button type="button" className={`settings-toggle${hints ? " on" : ""}`}
                      onClick={() => { const v = !hints; setHints(v); try { localStorage.setItem("kokpar_hints", String(v)); } catch {} }}>
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                </div>

                <div className="settings-stats-row">
                  <div className="settings-stat">
                    <span className="settings-stat-value">Ур. {profile.level}</span>
                    <span className="settings-stat-label">{kz ? "Деңгей" : "Уровень"}</span>
                  </div>
                  <div className="settings-stat">
                    <span className="settings-stat-value">{formatCoins(profile.coins)}</span>
                    <span className="settings-stat-label">Күміс</span>
                  </div>
                  <div className="settings-stat">
                    <span className="settings-stat-value">{ownedCount}/{profile.stableCapacity}</span>
                    <span className="settings-stat-label">{kz ? "Жылқы" : "Коней"}</span>
                  </div>
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
            <span>Игра</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "stable" ? " active" : ""}`}
            onClick={() => setNavTab("stable")}
          >
            <Trophy size={22} strokeWidth={2.2} />
            <span>Конюшня</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "history" ? " active" : ""}`}
            onClick={() => setNavTab("history")}
          >
            <History size={22} strokeWidth={2.2} />
            <span>История</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn${navTab === "profile" ? " active" : ""}`}
            onClick={() => setNavTab("profile")}
          >
            <User size={22} strokeWidth={2.2} />
            <span>Профиль</span>
          </button>
        </nav>

      </div>
    </section>
  );
}
