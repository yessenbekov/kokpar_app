import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, CircleDot, Clock3, Cloud, Flag, Gavel, HardDrive, History, LoaderCircle, LogIn, LogOut, Mail, Pencil, Play, Trophy, User, Users, X, Zap } from "lucide-react";
import { gameModeById } from "../app/gameModes.js";
import { HorseStable } from "./HorseStable.jsx";
import { Marketplace } from "./Marketplace.jsx";
import { MatchHistory } from "./MatchHistory.jsx";
import { ModeSelector } from "./ModeSelector.jsx";
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
  const canStart = !onlineMode || onlineLobbyState.canStart;
  const startLabel = onlineMode ? onlineStartLabel(onlineLobbyState) : selectedMode.startLabel;

  const handleOnlineLobbyStateChange = useCallback((nextState) => {
    setOnlineLobbyState((currentState) => (sameOnlineState(currentState, nextState) ? currentState : nextState));
  }, []);

  useEffect(() => {
    setOnlineReady(false);
    setOnlineLobbyState(EMPTY_ONLINE_STATE);
  }, [settings.modeId, settings.teamSide, settings.horseId]);

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

  async function handleListItem(itemType, itemId, slotKey, horseId, price) {
    await onListItem?.(itemType, itemId, slotKey, horseId, price);
    setListingDraft(null);
  }

  return (
    <section className="setup" aria-label="Кокпар 3D">
      <div className="setup-panel stable-panel">

        {/* Top bar */}
        <div className="setup-topbar">
          <span className="setup-topbar-title">Кокпар 3D</span>
          <span className="setup-topbar-coins">{formatCoins(profile.coins)} күміс</span>
        </div>

        {/* Scrollable content */}
        <div className="setup-content">

          {/* TAB: ИГРА */}
          {navTab === "game" && (
            <div className="tab-pane">
              {/* Selected horse strip */}
              <button
                type="button"
                className="horse-strip"
                onClick={() => setNavTab("stable")}
                aria-label="Сменить лошадь"
              >
                <span className="horse-strip-avatar">{selectedHorse.name.slice(0, 1)}</span>
                <span className="horse-strip-info">
                  <strong>{selectedHorse.name}</strong>
                  <span>Ур. {selectedHorse.level} · Нажми чтобы сменить</span>
                </span>
                <span className="horse-strip-arrow">›</span>
              </button>

              <ModeSelector modeId={settings.modeId} onModeChange={(modeId) => onSettingChange("modeId", modeId)} />

              <div className="match-options">
                <div className="setting-group" aria-label="Сторона">
                  <div className="setting-title">
                    <Flag size={17} strokeWidth={2.4} />
                    <span>Сторона</span>
                  </div>
                  <div className="choice-grid two">
                    <button className={`choice team-blue${settings.teamSide !== "red" ? " active" : ""}`} type="button" onClick={() => onSettingChange("teamSide", "blue")}>
                      <strong>Синие</strong>
                      <span>Левые ворота</span>
                    </button>
                    <button className={`choice team-red${settings.teamSide === "red" ? " active" : ""}`} type="button" onClick={() => onSettingChange("teamSide", "red")}>
                      <strong>Красные</strong>
                      <span>Правые ворота</span>
                    </button>
                  </div>
                </div>

                <div className="setting-group" aria-label="Тип цели">
                  <div className="setting-title">
                    <CircleDot size={17} strokeWidth={2.4} />
                    <span>Цель</span>
                  </div>
                  <div className="choice-grid two">
                    <button className={settings.goalType === "circle" ? "choice active" : "choice"} type="button" disabled={selectedMode.goalLocked} onClick={() => onSettingChange("goalType", "circle")}>
                      <strong>Круг</strong>
                      <span>На земле</span>
                    </button>
                    <button className={settings.goalType === "kazan" ? "choice active" : "choice"} type="button" disabled={selectedMode.goalLocked} onClick={() => onSettingChange("goalType", "kazan")}>
                      <strong>Казан</strong>
                      <span>С бортом</span>
                    </button>
                  </div>
                </div>

                <div className="setting-group" aria-label="Игроки">
                  <div className="setting-title">
                    <Users size={17} strokeWidth={2.4} />
                    <span>Игроки</span>
                  </div>
                  <div className="choice-grid three">
                    {[3, 4, 5].map((size) => (
                      <button className={settings.teamSize === size ? "choice active" : "choice"} type="button" key={size} onClick={() => onSettingChange("teamSize", size)}>
                        <strong>{size}×{size}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-group" aria-label="Время матча">
                  <div className="setting-title">
                    <Clock3 size={17} strokeWidth={2.4} />
                    <span>Время</span>
                  </div>
                  <div className="choice-grid three">
                    {[2, 3, 5].map((minutes) => (
                      <button className={settings.matchMinutes === minutes ? "choice active" : "choice"} type="button" key={minutes} onClick={() => onSettingChange("matchMinutes", minutes)}>
                        <strong>{minutes}:00</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-group" aria-label="Сложность">
                  <div className="setting-title">
                    <Zap size={17} strokeWidth={2.4} />
                    <span>Сложность</span>
                  </div>
                  <div className="choice-grid three">
                    {[
                      { id: "easy",   label: "Новичок",   sub: "ИИ слабый" },
                      { id: "normal", label: "Нормально", sub: "Стандарт" },
                      { id: "hard",   label: "Батыр",     sub: "ИИ сильный" }
                    ].map(({ id, label, sub }) => (
                      <button className={(settings.difficulty ?? "normal") === id ? "choice active" : "choice"} type="button" key={id} onClick={() => onSettingChange("difficulty", id)}>
                        <strong>{label}</strong>
                        <span>{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {onlineMode && (
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
              )}

              <div className="tab-footer">
                <button className="start-button" type="button" onClick={handleStart} disabled={!canStart}>
                  <Play size={19} fill="currentColor" strokeWidth={2.4} />
                  <span>{startLabel}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: КОНЮШНЯ */}
          {navTab === "stable" && (
            <div className="tab-pane">
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
                  selectedHorseId={settings.horseId}
                  onBuyItem={onBuyItem}
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
              <MatchHistory />
            </div>
          )}

          {/* TAB: ПРОФИЛЬ */}
          {navTab === "profile" && (
            <div className="tab-pane">
              <div className="profile-page">
                <div className="profile-hero">
                  <div className="profile-avatar-lg">{profile.riderName.slice(0, 1)}</div>

                  {editingRider ? (
                    <form className="rider-name-form" onSubmit={submitRiderName}>
                      <input
                        aria-label="Имя игрока"
                        maxLength={24}
                        value={draftRiderName}
                        onChange={(e) => setDraftRiderName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit"><Check size={14} strokeWidth={2.7} /></button>
                      <button type="button" onClick={() => { setEditingRider(false); setDraftRiderName(profile.riderName); }}>
                        <X size={14} strokeWidth={2.7} />
                      </button>
                    </form>
                  ) : (
                    <div className="profile-name-row">
                      <strong className="profile-hero-name">{profile.riderName}</strong>
                      <button
                        className="rider-edit-button"
                        type="button"
                        aria-label="Переименовать"
                        onClick={() => { setDraftRiderName(profile.riderName); setEditingRider(true); }}
                      >
                        <Pencil size={13} strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="profile-stats-row">
                  <div className="profile-stat">
                    <span className="profile-stat-value">Ур. {profile.level}</span>
                    <span className="profile-stat-label">Уровень</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-value">{formatCoins(profile.coins)}</span>
                    <span className="profile-stat-label">Күміс</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-value">{ownedCount}/{profile.stableCapacity}</span>
                    <span className="profile-stat-label">Коней</span>
                  </div>
                </div>

                <AccountPanel auth={auth} onBackToLogin={onBackToLogin} onSignOut={onSignOut} />
              </div>
            </div>
          )}

        </div>

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
