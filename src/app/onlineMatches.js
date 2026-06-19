import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function queryError(error, fallback) {
  if (!error) return new Error(fallback);
  if (error instanceof Error) return error;
  return new Error(error.message ?? error.details ?? error.hint ?? fallback);
}

async function currentUser() {
  if (!supabase) throw new Error("Supabase не настроен");

  const { data, error } = await supabase.auth.getUser();
  if (error) throw queryError(error, "Не удалось проверить аккаунт");
  if (!data.user) throw new Error("Нужно войти в аккаунт");

  return data.user;
}

function normalizeTeam(team) {
  return team === "red" ? "red" : team === "blue" ? "blue" : null;
}

function matchFromRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    roomId: row.room_id,
    hostUserId: row.host_user_id,
    status: row.status,
    modeId: row.mode_id,
    goalType: row.goal_type,
    teamSize: row.team_size,
    matchMinutes: row.match_minutes,
    settings: row.settings ?? {},
    score: {
      blue: row.score_blue ?? 0,
      red: row.score_red ?? 0
    },
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function playerSnapshot(matchId, player) {
  return {
    match_id: matchId,
    user_id: player.userId,
    rider_name: player.riderName,
    horse_id: player.horseId,
    horse_name: player.horseName,
    horse_type: player.horseType,
    team_side: player.team === "red" ? "red" : "blue",
    ready: Boolean(player.ready)
  };
}

function eventPayload(event) {
  const payload = { ...event };
  delete payload.type;
  delete payload.eventType;
  delete payload.team;
  delete payload.teamSide;
  return payload;
}

async function updateMatchAfterEvent(matchId, eventType, event) {
  const score = event.score ?? {};
  const update = {};

  if (eventType === "match_started") {
    update.status = "playing";
    update.started_at = new Date().toISOString();
  }

  if (eventType === "goal") {
    update.status = "playing";
  }

  if (eventType === "match_finished") {
    update.status = "finished";
    update.finished_at = new Date().toISOString();
  }

  if (Number.isFinite(score.blue)) update.score_blue = Math.max(0, Math.round(score.blue));
  if (Number.isFinite(score.red)) update.score_red = Math.max(0, Math.round(score.red));

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from("online_matches").update(update).eq("id", matchId);
  if (error) throw queryError(error, "Не удалось обновить состояние матча");
}

export const onlineMatchStore = {
  async createFromRoom({ room, players = [] }) {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");
    if (!room?.id) throw new Error("Комната не найдена");

    const user = await currentUser();
    const settings = {
      modeId: room.modeId,
      goalType: room.goalType,
      teamSize: room.teamSize,
      matchMinutes: room.matchMinutes,
      roomCode: room.code
    };

    const { data: matchRow, error: matchError } = await supabase
      .from("online_matches")
      .insert({
        room_id: room.id,
        host_user_id: user.id,
        status: "starting",
        mode_id: room.modeId,
        goal_type: room.goalType,
        team_size: room.teamSize,
        match_minutes: room.matchMinutes,
        settings
      })
      .select("*")
      .single();

    if (matchError) throw queryError(matchError, "Не удалось создать онлайн-матч");

    const snapshots = players.map((player) => playerSnapshot(matchRow.id, player));
    if (snapshots.length > 0) {
      const { error: playersError } = await supabase.from("online_match_players").insert(snapshots);
      if (playersError) throw queryError(playersError, "Не удалось сохранить участников матча");
    }

    return { match: matchFromRow(matchRow) };
  },

  async recordEvent(matchId, event = {}) {
    if (!isSupabaseConfigured || !supabase || !matchId) return null;

    const eventType = String(event.type ?? event.eventType ?? "").trim();
    if (!eventType) return null;

    const user = await currentUser();
    const teamSide = normalizeTeam(event.team ?? event.teamSide);

    const { data: eventRow, error: eventError } = await supabase
      .from("online_match_events")
      .insert({
        match_id: matchId,
        user_id: user.id,
        event_type: eventType,
        team_side: teamSide,
        payload: eventPayload(event)
      })
      .select("*")
      .single();

    if (eventError) throw queryError(eventError, "Не удалось записать событие матча");

    await updateMatchAfterEvent(matchId, eventType, event);
    return eventRow;
  }
};
