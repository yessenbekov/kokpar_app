import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleDot, Clipboard, Crown, DoorOpen, Link2, LogIn, Plus, Radio, RefreshCw, Shield, Users } from "lucide-react";
import { onlineRoomStore } from "../app/onlineRooms.js";

function goalLabel(goalType) {
  return goalType === "kazan" ? "Казан" : "Круг";
}

function teamLabel(team) {
  return team === "red" ? "Қызыл" : "Көк";
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

function LobbyPlayer({ player, current, host }) {
  return (
    <li className={current ? "lobby-player current" : "lobby-player"}>
      <span>
        <strong>{player.riderName}</strong>
        <small>{player.horseName}</small>
      </span>
      {host && <Crown size={15} strokeWidth={2.5} />}
      {player.ready && <Check size={15} strokeWidth={2.5} />}
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
  const startedRoomRef = useRef("");

  const signedIn = auth.status === "signed-in";
  const currentPlayer = useMemo(
    () => players.find((player) => player.userId === currentUserId) ?? null,
    [currentUserId, players]
  );
  const playerReady = currentPlayer?.ready ?? ready;
  const roomSettings = room ?? settings;
  const capacity = roomSettings.teamSize * 2;
  const bluePlayers = players.filter((player) => player.team === "blue");
  const redPlayers = players.filter((player) => player.team === "red");
  const readyCount = players.filter((player) => player.ready).length;
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);
  const isHost = Boolean(room && currentUserId && room.hostUserId === currentUserId);
  const allReady = players.length > 0 && players.every((player) => player.ready);
  const canHostStart = Boolean(room && room.status === "lobby" && isHost && allReady && currentPlayer);

  function roomMatchSettings() {
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
      onlinePlayerCount: players.length
    };
  }

  function hydrate(nextState) {
    if (nextState.error) {
      setError(nextState.error instanceof Error ? nextState.error.message : "Ошибка комнаты");
      return;
    }

    setRoom(nextState.room);
    setPlayers(nextState.players);
    setError("");
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
      if (active) setError(nextError instanceof Error ? nextError.message : "Ошибка комнаты");
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
    if (!room?.id || !currentUserId || !currentPlayer) return undefined;

    const nextHorse = {
      riderName: profile.riderName,
      horseId: selectedHorse.id,
      horseName: selectedHorse.name,
      horseType: selectedHorse.typeId
    };

    if (
      currentPlayer.riderName === nextHorse.riderName &&
      currentPlayer.horseId === nextHorse.horseId &&
      currentPlayer.horseName === nextHorse.horseName &&
      currentPlayer.horseType === nextHorse.horseType
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
  }, [room?.id, currentUserId, currentPlayer?.horseId, currentPlayer?.horseName, currentPlayer?.horseType, currentPlayer?.riderName, profile.riderName, selectedHorse.id, selectedHorse.name, selectedHorse.typeId]);

  useEffect(() => {
    if (!room?.id || room.status !== "starting" || !room.onlineMatchId || startedRoomRef.current === room.id) return;

    startedRoomRef.current = room.id;
    onRoomStart?.(roomMatchSettings());
  }, [room?.id, room?.onlineMatchId, room?.status, currentPlayer?.team, isHost, players.length, settings.goalType, settings.matchMinutes, settings.modeId, settings.teamSide, settings.teamSize]);

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
      setError(nextError instanceof Error ? nextError.message : "Ошибка комнаты");
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

  async function leaveRoom() {
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
      setError(nextError instanceof Error ? nextError.message : "Ошибка выхода из комнаты");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value, label) {
    if (!value) return;

    try {
      if (!canCopy) throw new Error("Буфер обмена недоступен");
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (nextError) {
      setCopied("");
      setError(nextError instanceof Error ? nextError.message : "Не удалось скопировать");
    }
  }

  if (!signedIn) {
    return (
      <section className="online-lobby" aria-label="Онлайн комната">
        <div className="lobby-empty">
          <Radio size={18} strokeWidth={2.5} />
          <div>
            <strong>Для онлайн-комнаты нужен аккаунт</strong>
            <span>Войди через email, чтобы создать комнату или подключиться к другу.</span>
          </div>
        </div>
        <button className="ready-button" type="button" onClick={onBackToLogin}>
          <LogIn size={17} strokeWidth={2.6} />
          <span>Войти</span>
        </button>
      </section>
    );
  }

  return (
    <section className="online-lobby" aria-label="Онлайн комната">
      <div className="lobby-topline">
        <span>
          <Radio size={16} strokeWidth={2.5} />
          {room ? (
            <>
              Комната <b className="lobby-code">{room.code}</b>
              {isHost && <span className="lobby-host-chip">host</span>}
            </>
          ) : (
            "Supabase комната"
          )}
        </span>
        <span>{players.length || 1}/{capacity} игроков</span>
      </div>

      <div className="lobby-summary">
        <span>
          <Users size={15} strokeWidth={2.4} />
          {roomSettings.teamSize}×{roomSettings.teamSize}
        </span>
        <span>
          <CircleDot size={15} strokeWidth={2.4} />
          {goalLabel(roomSettings.goalType)}
        </span>
        <span>
          <Shield size={15} strokeWidth={2.4} />
          {roomSettings.matchMinutes}:00
        </span>
      </div>

      {!room ? (
        <div className="lobby-actions">
          <button className="ready-button" type="button" onClick={createRoom} disabled={busy}>
            <Plus size={17} strokeWidth={2.6} />
            <span>{busy ? "Создаем" : "Создать комнату"}</span>
          </button>

          <form className="lobby-join-form" onSubmit={joinRoom}>
            <input
              aria-label="Код комнаты"
              value={joinCode}
              onChange={(event) => setJoinCode(onlineRoomStore.normalizeCode(event.target.value))}
              maxLength={6}
              placeholder="КОД"
              disabled={busy}
            />
            <button type="submit" disabled={busy || joinCode.length < 4}>
              <DoorOpen size={16} strokeWidth={2.5} />
              <span>Войти</span>
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="lobby-share">
            <button type="button" onClick={() => copyText(room.code, "Код скопирован")} disabled={busy}>
              <Clipboard size={15} strokeWidth={2.5} />
              <span>Код</span>
            </button>
            <button type="button" onClick={() => copyText(inviteLink(room), "Ссылка скопирована")} disabled={busy}>
              <Link2 size={15} strokeWidth={2.5} />
              <span>Ссылка</span>
            </button>
            <span>{room.status === "starting" ? "Стартуем" : `Готовы ${readyCount}/${players.length}`}</span>
          </div>

          <div className="team-pick" aria-label="Выбор стороны">
            {["blue", "red"].map((team) => (
              <button
                className={currentPlayer?.team === team ? `team-choice ${team} active` : `team-choice ${team}`}
                type="button"
                key={team}
                onClick={() => updateTeam(team)}
                disabled={busy}
              >
                {teamLabel(team)}
              </button>
            ))}
          </div>

          <div className="lobby-teams">
            <div className="lobby-team blue">
              <strong>Көк команда</strong>
              <ul>
                {bluePlayers.map((player) => (
                  <LobbyPlayer
                    player={player}
                    current={player.userId === currentUserId}
                    host={player.userId === room.hostUserId}
                    key={player.userId}
                  />
                ))}
              </ul>
            </div>
            <div className="lobby-team red">
              <strong>Қызыл команда</strong>
              <ul>
                {redPlayers.map((player) => (
                  <LobbyPlayer
                    player={player}
                    current={player.userId === currentUserId}
                    host={player.userId === room.hostUserId}
                    key={player.userId}
                  />
                ))}
              </ul>
            </div>
          </div>

          <div className="lobby-actions two">
            <button className={playerReady ? "ready-button active" : "ready-button"} type="button" onClick={toggleReady} disabled={busy}>
              <Check size={17} strokeWidth={2.6} />
              <span>{playerReady ? "Готов" : "Готовиться"}</span>
            </button>
            <button className="ready-button secondary" type="button" onClick={leaveRoom} disabled={busy}>
              <DoorOpen size={17} strokeWidth={2.6} />
              <span>Выйти из комнаты</span>
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
