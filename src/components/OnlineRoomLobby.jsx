import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleDot, Clipboard, Crown, DoorOpen, Link2, LogIn, Plus, Radio, RefreshCw, Shield, Users, X } from "lucide-react";
import { onlineRoomStore } from "../app/onlineRooms.js";

function makeLangT(lang) {
  return (ru, kz, en) => {
    if (lang === "kz") return kz ?? ru;
    if (lang === "en") return en ?? ru;
    return ru;
  };
}

function roomCodeFromUrl() {
  if (typeof window === "undefined") return "";
  return onlineRoomStore.normalizeCode(new URLSearchParams(window.location.search).get("room"));
}

function inviteLink(room) {
  if (!room || typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "online_room");
  url.searchParams.set("room", room.code);
  return url.toString();
}

function LobbyPlayer({ player, current, host, onKick, kickLabel }) {
  return (
    <li className={current ? "lobby-player current" : "lobby-player"}>
      <span className="lobby-player-avatar">{player.riderName.slice(0, 1)}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong>{player.riderName}</strong>
        <small>{player.horseName}</small>
      </span>
      {host && <Crown size={14} strokeWidth={2.5} style={{ color: "#f0c347", flexShrink: 0 }} />}
      {player.ready && <Check size={14} strokeWidth={2.5} style={{ color: "#7ed47e", flexShrink: 0 }} />}
      {onKick && (
        <button className="lobby-kick" type="button" onClick={onKick} aria-label={kickLabel ?? `Kick ${player.riderName}`}>
          <X size={13} strokeWidth={2.5} />
        </button>
      )}
    </li>
  );
}

export function OnlineRoomLobby({
  auth,
  profile,
  selectedHorse,
  settings,
  ready,
  startRequest,
  onReadyChange,
  onTeamChange,
  onBackToLogin,
  onLobbyStateChange,
  onRoomStart
}) {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [joinCode, setJoinCode] = useState(() => roomCodeFromUrl());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [lobbyView, setLobbyView] = useState("choose");
  const [openRooms, setOpenRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const startedRoomRef = useRef("");
  const autoJoinedRef = useRef(false);
  const leavingRef = useRef(false);

  const signedIn = auth.status === "signed-in";
  const t = makeLangT(settings?.lang ?? "ru");
  const currentPlayer = useMemo(
    () => players.find((player) => player.userId === currentUserId) ?? null,
    [currentUserId, players]
  );
  const playerReady = currentPlayer?.ready ?? ready;
  const isSpectator = currentPlayer ? currentPlayer.team === "spectator" : settings.teamSide === "spectator";
  const roomSettings = room ?? settings;
  const capacity = roomSettings.teamSize * 2;
  const bluePlayers = players.filter((player) => player.team === "blue");
  const redPlayers = players.filter((player) => player.team === "red");
  const spectators = players.filter((player) => player.team === "spectator");
  const activePlayers = players.filter((player) => player.team !== "spectator");
  const readyCount = activePlayers.filter((player) => player.ready).length;
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);
  const isHost = Boolean(room && currentUserId && room.hostUserId === currentUserId);
  const allReady = activePlayers.length > 0 && activePlayers.every((player) => player.ready);
  const canHostStart = Boolean(room && room.status === "lobby" && isHost && allReady && currentPlayer);

  function roomMatchSettings() {
    const opponent = players.find((p) => p.userId !== currentUserId && p.team !== "spectator") ?? null;
    return {
      ...settings,
      modeId: room?.modeId ?? settings.modeId,
      goalType: room?.goalType ?? settings.goalType,
      teamSize: room?.teamSize ?? settings.teamSize,
      matchMinutes: room?.matchMinutes ?? settings.matchMinutes,
      teamSide: currentPlayer?.team ?? settings.teamSide,
      onlineRoomId: room?.id ?? "",
      onlineRoomCode: room?.code ?? "",
      onlineMatchId: room?.onlineMatchId ?? "",
      onlineIsHost: isHost,
      onlinePlayerCount: players.length,
      opponentHorseCoatId: opponent?.horseCoatId ?? null
    };
  }

  function hydrate(nextState) {
    if (nextState.error) {
      setError(nextState.error instanceof Error ? nextState.error.message : t("Ошибка комнаты", "Бөлме қатесі", "Room error"));
      return;
    }

    if (!nextState.room && room && !leavingRef.current) {
      // Room disappeared externally — host closed it
      setRoom(null);
      setPlayers([]);
      setCurrentUserId("");
      setJoinCode("");
      startedRoomRef.current = "";
      onReadyChange(false);
      setError(t("Хост закрыл комнату", "Хост бөлмені жапты", "Host closed the room"));
      return;
    }

    if (nextState.room && currentUserId && !nextState.players.some((p) => p.userId === currentUserId) && players.some((p) => p.userId === currentUserId)) {
      // Player disappeared from list but room is still open — kicked
      setRoom(null);
      setPlayers([]);
      setCurrentUserId("");
      setJoinCode("");
      startedRoomRef.current = "";
      onReadyChange(false);
      setError(t("Вас выгнали из комнаты", "Сізді бөлмеден шығарды", "You were kicked from the room"));
      return;
    }

    setRoom(nextState.room);
    setPlayers(nextState.players);
    if (nextState.room) setError("");
  }

  useEffect(() => {
    if (!room?.id) {
      setPlayers([]);
      onReadyChange(false);
      return undefined;
    }

    let active = true;
    onlineRoomStore.fetch(room.id).then((nextState) => {
      if (active) hydrate(nextState);
    }).catch((nextError) => {
      if (active) setError(nextError instanceof Error ? nextError.message : t("Ошибка комнаты", "Бөлме қатесі", "Room error"));
    });

    const unsubscribe = onlineRoomStore.subscribe(room.id, (nextState) => {
      if (active) hydrate(nextState);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [room?.id]);

  useEffect(() => {
    onLobbyStateChange?.({
      allReady,
      canStart: canHostStart,
      hasRoom: Boolean(room),
      isHost,
      playerReady,
      playersCount: players.length,
      readyCount,
      onlineMatchId: room?.onlineMatchId ?? "",
      roomCode: room?.code ?? "",
      status: room?.status ?? "idle"
    });
  }, [allReady, canHostStart, isHost, onLobbyStateChange, playerReady, players.length, readyCount, room?.code, room?.onlineMatchId, room?.status]);

  useEffect(() => {
    if (!currentPlayer) {
      onReadyChange(false);
      return;
    }

    onReadyChange(currentPlayer.ready);
    if (settings.teamSide !== currentPlayer.team) onTeamChange(currentPlayer.team);
  }, [currentPlayer?.ready, currentPlayer?.team]);

  useEffect(() => {
    if (!signedIn || room || !joinCode || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    runRoomAction(async () => {
      const nextState = await onlineRoomStore.join({ code: joinCode, profile, selectedHorse, settings });
      setCurrentUserId(nextState.currentUserId ?? "");
      return nextState;
    });
  }, [signedIn, joinCode]);

  useEffect(() => {
    if (!room?.id || !currentUserId || !currentPlayer) return undefined;

    const nextHorse = {
      riderName: profile.riderName,
      horseId: selectedHorse.id,
      horseName: selectedHorse.name,
      horseType: selectedHorse.typeId,
      horseCoatId: selectedHorse.coatId ?? null
    };

    if (
      currentPlayer.riderName === nextHorse.riderName &&
      currentPlayer.horseId === nextHorse.horseId &&
      currentPlayer.horseName === nextHorse.horseName &&
      currentPlayer.horseType === nextHorse.horseType &&
      currentPlayer.horseCoatId === nextHorse.horseCoatId
    ) {
      return undefined;
    }

    let active = true;
    onlineRoomStore.updatePlayer(room.id, nextHorse).then((nextState) => {
      if (active) hydrate(nextState);
    }).catch((nextError) => {
      if (active) setError(nextError instanceof Error ? nextError.message : "Ошибка синхронизации игрока");
    });

    return () => {
      active = false;
    };
  }, [room?.id, currentUserId, currentPlayer?.horseId, currentPlayer?.horseName, currentPlayer?.horseType, currentPlayer?.horseCoatId, currentPlayer?.riderName, profile.riderName, selectedHorse.id, selectedHorse.name, selectedHorse.typeId, selectedHorse.coatId]);

  useEffect(() => {
    if (!room?.id || room.status !== "starting" || !room.onlineMatchId || startedRoomRef.current === room.id) return;

    startedRoomRef.current = room.id;
    setCountdown(3);
  }, [room?.id, room?.onlineMatchId, room?.status, currentPlayer?.team, isHost, players.length, settings.goalType, settings.matchMinutes, settings.modeId, settings.teamSide, settings.teamSize]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onRoomStart?.(roomMatchSettings());
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!startRequest || !canHostStart || !room?.id) return undefined;

    let active = true;
    runRoomAction(() => onlineRoomStore.start(room.id)).then(() => {
      if (active) setCopied("");
    });

    return () => {
      active = false;
    };
  }, [startRequest]);

  async function runRoomAction(action) {
    setBusy(true);
    setError("");
    setCopied("");

    try {
      const nextState = await action();
      hydrate(nextState);
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "Ошибка комнаты";
      if (msg.includes("violates check constraint") && msg.includes("team_size")) {
        setError("1×1 пока недоступен — требуется обновление сервера");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function createRoom() {
    await runRoomAction(async () => {
      const nextState = await onlineRoomStore.create({ profile, selectedHorse, settings });
      setCurrentUserId(nextState.currentUserId ?? "");
      setJoinCode(nextState.room?.code ?? "");
      return nextState;
    });
  }

  async function joinRoom(event) {
    event.preventDefault();
    await runRoomAction(async () => {
      const nextState = await onlineRoomStore.join({ code: joinCode, profile, selectedHorse, settings });
      setCurrentUserId(nextState.currentUserId ?? "");
      return nextState;
    });
  }

  async function joinByCode(code) {
    setJoinCode(code);
    await runRoomAction(async () => {
      const nextState = await onlineRoomStore.join({ code, profile, selectedHorse, settings });
      setCurrentUserId(nextState.currentUserId ?? "");
      return nextState;
    });
  }

  async function openJoinView() {
    setLobbyView("join-list");
    setLoadingRooms(true);
    setError("");
    try {
      const rooms = await onlineRoomStore.listOpenRooms();
      setOpenRooms(rooms);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Не удалось загрузить комнаты", "Бөлмелерді жүктеу мүмкін болмады", "Failed to load rooms"));
    } finally {
      setLoadingRooms(false);
    }
  }

  async function updateTeam(teamSide) {
    if (!room?.id) {
      onTeamChange(teamSide);
      return;
    }

    await runRoomAction(() => onlineRoomStore.updatePlayer(room.id, { teamSide, ready: false }));
  }

  async function toggleReady() {
    if (!room?.id || !currentPlayer) return;
    await runRoomAction(() => onlineRoomStore.updatePlayer(room.id, { ready: !currentPlayer.ready }));
  }

  async function updateRoomSetting(key, value) {
    if (!room?.id || !isHost) return;
    await runRoomAction(() => onlineRoomStore.updateSettings(room.id, { [key]: value }));
  }

  async function kickPlayer(userId) {
    if (!room?.id || !isHost) return;
    await runRoomAction(() => onlineRoomStore.kick(room.id, userId));
  }

  async function leaveRoom() {
    leavingRef.current = true;
    setBusy(true);
    setError("");
    setCopied("");

    try {
      await onlineRoomStore.leave(room);
      setRoom(null);
      setPlayers([]);
      setCurrentUserId("");
      setJoinCode("");
      startedRoomRef.current = "";
      onReadyChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("Ошибка выхода из комнаты", "Бөлмеден шығу қатесі", "Error leaving room"));
    } finally {
      setBusy(false);
      leavingRef.current = false;
    }
  }

  async function copyText(value, label) {
    if (!value) return;

    try {
      if (!canCopy) throw new Error(t("Буфер обмена недоступен", "Алмасу буфері қолжетімсіз", "Clipboard unavailable"));
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (nextError) {
      setCopied("");
      setError(nextError instanceof Error ? nextError.message : t("Не удалось скопировать", "Көшіру мүмкін болмады", "Failed to copy"));
    }
  }

  if (!signedIn) {
    return (
      <section className="online-lobby" aria-label={t("Онлайн комната", "Онлайн бөлме", "Online room")}>
        <div className="lobby-empty">
          <Radio size={18} strokeWidth={2.5} />
          <div>
            <strong>{t("Для онлайн-комнаты нужен аккаунт", "Онлайн бөлме үшін аккаунт қажет", "Account required for online room")}</strong>
            <span>{t("Войди через email, чтобы создать комнату или подключиться к другу.", "Бөлме жасау немесе досқа қосылу үшін email арқылы кіріңіз.", "Sign in with email to create a room or join a friend.")}</span>
          </div>
        </div>
        <button className="ready-button" type="button" onClick={onBackToLogin}>
          <LogIn size={17} strokeWidth={2.6} />
          <span>{t("Войти", "Кіру", "Sign in")}</span>
        </button>
      </section>
    );
  }

  return (
    <section className="online-lobby" aria-label={t("Онлайн комната", "Онлайн бөлме", "Online room")}>
      <div className="lobby-topline">
        <span>
          <Radio size={16} strokeWidth={2.5} />
          {room ? (
            <>
              {t("Комната", "Бөлме", "Room")} <b className="lobby-code">{room.code}</b>
              {isHost && <span className="lobby-host-chip">host</span>}
            </>
          ) : (
            t("Онлайн комната", "Онлайн бөлме", "Online room")
          )}
        </span>
        <span>{players.length || 1}/{capacity} {t("игроков", "ойыншы", "players")}</span>
      </div>

      {room && (
        <div className="lobby-settings-panel">
          {isHost && <div className="lobby-settings-host-tag">{t("Только хост может менять", "Тек хост өзгерте алады", "Only host can change")}</div>}
          <div className="lobby-setting-row">
            <span className="lobby-setting-label"><Users size={13} strokeWidth={2.4} /> {t("Состав", "Құрам", "Teams")}</span>
            <div className="lobby-setting-pills">
              {[1, 3, 4, 5].map(s => (
                <button key={s} type="button"
                  className={`lobby-pill${roomSettings.teamSize === s ? " active" : ""}`}
                  disabled={!isHost || busy}
                  onClick={() => updateRoomSetting("teamSize", s)}>
                  {s === 1 ? "1×1" : `${s}×${s}`}
                </button>
              ))}
            </div>
          </div>
          <div className="lobby-setting-row">
            <span className="lobby-setting-label"><CircleDot size={13} strokeWidth={2.4} /> {t("Цель", "Мақсат", "Goal")}</span>
            <div className="lobby-setting-pills">
              {["circle", "kazan"].map(g => (
                <button key={g} type="button"
                  className={`lobby-pill${roomSettings.goalType === g ? " active" : ""}`}
                  disabled={!isHost || busy}
                  onClick={() => updateRoomSetting("goalType", g)}>
                  {g === "circle" ? t("Круг", "Шеңбер", "Circle") : t("Казан", "Қазан", "Kazan")}
                </button>
              ))}
            </div>
          </div>
          <div className="lobby-setting-row">
            <span className="lobby-setting-label"><Shield size={13} strokeWidth={2.4} /> {t("Время", "Уақыт", "Time")}</span>
            <div className="lobby-setting-pills">
              {[2, 3, 5].map(m => (
                <button key={m} type="button"
                  className={`lobby-pill${roomSettings.matchMinutes === m ? " active" : ""}`}
                  disabled={!isHost || busy}
                  onClick={() => updateRoomSetting("matchMinutes", m)}>
                  {m} {t("мин", "мин", "min")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!room ? (
        <>
          {/* Выбор: создать или войти */}
          {lobbyView === "choose" && (
            <div className="lobby-choice-grid">
              <button type="button" className="lobby-choice-card" onClick={createRoom} disabled={busy}>
                <Plus size={30} strokeWidth={2.2} />
                <strong>{t("Создать", "Жасау", "Create")}</strong>
                <span>{t("Новая комната", "Жаңа бөлме", "New room")}</span>
              </button>
              <button type="button" className="lobby-choice-card" onClick={openJoinView} disabled={busy}>
                <DoorOpen size={30} strokeWidth={2.2} />
                <strong>{t("Войти", "Кіру", "Join")}</strong>
                <span>{t("Открытые игры", "Ашық ойындар", "Open games")}</span>
              </button>
            </div>
          )}

          {/* Список открытых комнат */}
          {lobbyView === "join-list" && (
            <div className="lobby-join-view">
              {loadingRooms ? (
                <div className="lobby-rooms-loading">
                  <RefreshCw size={18} strokeWidth={2.4} className="lobby-spin" />
                  <span>{t("Загружаем...", "Жүктелуде...", "Loading...")}</span>
                </div>
              ) : openRooms.length === 0 ? (
                <div className="lobby-rooms-empty">{t("Открытых комнат нет", "Ашық бөлмелер жоқ", "No open rooms")}</div>
              ) : (
                <div className="lobby-rooms-list">
                  {openRooms.map((r) => (
                    <button key={r.id} type="button" className="lobby-room-card" onClick={() => joinByCode(r.code)} disabled={busy}>
                      <span className="lobby-room-code">{r.code}</span>
                      <span className="lobby-room-meta">
                        {r.teamSize === 1 ? `1×1 ${t("Дуэль", "Дуэль", "Duel")}` : `${r.teamSize}×${r.teamSize}`} · {r.goalType === "kazan" ? t("Казан", "Қазан", "Kazan") : t("Круг", "Шеңбер", "Circle")} · {r.matchMinutes}{t("мин", "мин", "min")}
                      </span>
                      <span className="lobby-room-players">{r.playerCount}/{r.teamSize * 2} 🏇</span>
                    </button>
                  ))}
                </div>
              )}

              <form className="lobby-join-form" onSubmit={joinRoom}>
                <input
                  aria-label={t("Код комнаты", "Бөлме коды", "Room code")}
                  value={joinCode}
                  onChange={(e) => setJoinCode(onlineRoomStore.normalizeCode(e.target.value))}
                  maxLength={6}
                  placeholder={t("или введи КОД", "немесе КОД енгізіңіз", "or enter CODE")}
                  disabled={busy}
                />
                <button type="submit" disabled={busy || joinCode.length < 4}>
                  <DoorOpen size={16} strokeWidth={2.5} />
                  <span>{t("Войти", "Кіру", "Join")}</span>
                </button>
              </form>

              <button type="button" className="wizard-back-btn" onClick={() => setLobbyView("choose")}>‹</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="lobby-share">
            <button type="button" onClick={() => copyText(room.code, t("Код скопирован", "Код көшірілді", "Code copied"))} disabled={busy}>
              <Clipboard size={15} strokeWidth={2.5} />
              <span>{t("Код", "Код", "Code")}</span>
            </button>
            <button type="button" onClick={() => copyText(inviteLink(room), t("Ссылка скопирована", "Сілтеме көшірілді", "Link copied"))} disabled={busy}>
              <Link2 size={15} strokeWidth={2.5} />
              <span>{t("Ссылка", "Сілтеме", "Link")}</span>
            </button>
            <span>{room.status === "starting" ? t("Стартуем", "Бастауда", "Starting") : `${t("Готовы", "Дайын", "Ready")} ${readyCount}/${activePlayers.length}`}</span>
          </div>

          <div className="team-pick" aria-label={t("Выбор стороны", "Жақ таңдау", "Choose side")}>
            {["blue", "red"].map((team) => (
              <button
                className={currentPlayer?.team === team ? `team-choice ${team} active` : `team-choice ${team}`}
                type="button"
                key={team}
                onClick={() => updateTeam(team)}
                disabled={busy}
              >
                {team === "red" ? t("Қызыл", "Қызыл", "Red") : t("Көк", "Көк", "Blue")}
              </button>
            ))}
            <button
              className={isSpectator ? "team-choice spectator active" : "team-choice spectator"}
              type="button"
              onClick={() => updateTeam("spectator")}
              disabled={busy}
            >
              {t("Зритель", "Бақылаушы", "Spectator")}
            </button>
          </div>

          {countdown !== null && (
            <div className="lobby-countdown" key={countdown}>
              {countdown > 0 ? countdown : t("Старт!", "Старт!", "Go!")}
            </div>
          )}

          <div className="lobby-teams">
            <div className="lobby-team blue">
              <strong>{t("Синяя команда", "Көк команда", "Blue team")}</strong>
              <ul>
                {bluePlayers.map((player) => (
                  <LobbyPlayer
                    player={player}
                    current={player.userId === currentUserId}
                    host={player.userId === room.hostUserId}
                    onKick={isHost && !busy && player.userId !== currentUserId && player.userId !== room.hostUserId ? () => kickPlayer(player.userId) : undefined}
                    kickLabel={t(`Кикнуть ${player.riderName}`, `${player.riderName}-ды шығару`, `Kick ${player.riderName}`)}
                    key={player.userId}
                  />
                ))}
              </ul>
            </div>
            <div className="lobby-team red">
              <strong>{t("Красная команда", "Қызыл команда", "Red team")}</strong>
              <ul>
                {redPlayers.map((player) => (
                  <LobbyPlayer
                    player={player}
                    current={player.userId === currentUserId}
                    host={player.userId === room.hostUserId}
                    onKick={isHost && !busy && player.userId !== currentUserId && player.userId !== room.hostUserId ? () => kickPlayer(player.userId) : undefined}
                    kickLabel={t(`Кикнуть ${player.riderName}`, `${player.riderName}-ды шығару`, `Kick ${player.riderName}`)}
                    key={player.userId}
                  />
                ))}
              </ul>
            </div>
          </div>

          {spectators.length > 0 && (
            <div className="lobby-spectators">
              <strong>{t("Зрители", "Бақылаушылар", "Spectators")}</strong>
              <ul>
                {spectators.map((player) => (
                  <LobbyPlayer
                    player={player}
                    current={player.userId === currentUserId}
                    host={player.userId === room.hostUserId}
                    onKick={isHost && !busy && player.userId !== currentUserId ? () => kickPlayer(player.userId) : undefined}
                    kickLabel={t(`Кикнуть ${player.riderName}`, `${player.riderName}-ды шығару`, `Kick ${player.riderName}`)}
                    key={player.userId}
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="lobby-actions two">
            {!isSpectator && (
              <button className={playerReady ? "ready-button active" : "ready-button"} type="button" onClick={toggleReady} disabled={busy}>
                <Check size={17} strokeWidth={2.6} />
                <span>{playerReady ? t("Готов", "Дайын", "Ready") : t("Готовиться", "Дайындалу", "Get ready")}</span>
              </button>
            )}
            <button className={isSpectator ? "ready-button" : "ready-button secondary"} type="button" onClick={leaveRoom} disabled={busy}>
              <DoorOpen size={17} strokeWidth={2.6} />
              <span>{t("Выйти из комнаты", "Бөлмеден шығу", "Leave room")}</span>
            </button>
          </div>
        </>
      )}

      {copied && (
        <div className="lobby-status success" role="status">
          <Check size={14} strokeWidth={2.6} />
          <span>{copied}</span>
        </div>
      )}

      {error && (
        <div className="lobby-status error" role="alert">
          <RefreshCw size={14} strokeWidth={2.6} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
