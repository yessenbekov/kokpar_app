import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomRoomCode(length = 5) {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = window.crypto.getRandomValues(new Uint32Array(length));
    return Array.from(values, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join("");
  }

  return Array.from({ length }, () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]).join("");
}

function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function roomFromRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    hostUserId: row.host_user_id,
    status: row.status,
    modeId: row.mode_id,
    goalType: row.goal_type,
    teamSize: row.team_size,
    matchMinutes: row.match_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function playerFromRow(row) {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    riderName: row.rider_name,
    horseId: row.horse_id,
    horseName: row.horse_name,
    horseType: row.horse_type,
    team: row.team_side,
    ready: Boolean(row.ready),
    joinedAt: row.joined_at,
    updatedAt: row.updated_at
  };
}

async function currentUser() {
  if (!supabase) throw new Error("Supabase не настроен");

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Нужно войти в аккаунт");

  return data.user;
}

function playerRow({ user, profile, selectedHorse, teamSide }) {
  return {
    user_id: user.id,
    rider_name: profile.riderName,
    horse_id: selectedHorse.id,
    horse_name: selectedHorse.name,
    horse_type: selectedHorse.typeId,
    team_side: teamSide === "red" ? "red" : "blue",
    ready: false
  };
}

async function upsertPlayer(roomId, user, profile, selectedHorse, teamSide) {
  const { error } = await supabase.from("online_room_players").upsert(
    {
      room_id: roomId,
      ...playerRow({ user, profile, selectedHorse, teamSide })
    },
    { onConflict: "room_id,user_id" }
  );

  if (error) throw error;
}

async function fetchRoom(roomId) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");

  const { data: roomRow, error: roomError } = await supabase.from("online_rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomError) throw roomError;
  if (!roomRow) return { room: null, players: [] };

  const { data: playerRows, error: playersError } = await supabase
    .from("online_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (playersError) throw playersError;

  return {
    room: roomFromRow(roomRow),
    players: (playerRows ?? []).map(playerFromRow)
  };
}

export const onlineRoomStore = {
  normalizeCode,

  async create({ profile, selectedHorse, settings }) {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");

    const user = await currentUser();
    let roomRow = null;
    let lastError = null;

    for (let attempt = 0; attempt < 4 && !roomRow; attempt += 1) {
      const { data, error } = await supabase
        .from("online_rooms")
        .insert({
          code: randomRoomCode(),
          host_user_id: user.id,
          status: "lobby",
          mode_id: settings.modeId,
          goal_type: settings.goalType,
          team_size: settings.teamSize,
          match_minutes: settings.matchMinutes
        })
        .select("*")
        .single();

      if (!error) {
        roomRow = data;
        break;
      }

      lastError = error;
      if (error.code !== "23505") break;
    }

    if (!roomRow) throw lastError ?? new Error("Не удалось создать комнату");

    await upsertPlayer(roomRow.id, user, profile, selectedHorse, settings.teamSide);
    return { ...(await fetchRoom(roomRow.id)), currentUserId: user.id };
  },

  async join({ code, profile, selectedHorse, settings }) {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");

    const roomCode = normalizeCode(code);
    if (roomCode.length < 4) throw new Error("Введи код комнаты");

    const user = await currentUser();
    const { data: roomRow, error: roomError } = await supabase
      .from("online_rooms")
      .select("*")
      .eq("code", roomCode)
      .eq("status", "lobby")
      .maybeSingle();

    if (roomError) throw roomError;
    if (!roomRow) throw new Error("Комната не найдена");

    const currentRoom = await fetchRoom(roomRow.id);
    if (currentRoom.players.length >= roomRow.team_size * 2 && !currentRoom.players.some((player) => player.userId === user.id)) {
      throw new Error("Комната заполнена");
    }

    await upsertPlayer(roomRow.id, user, profile, selectedHorse, settings.teamSide);
    return { ...(await fetchRoom(roomRow.id)), currentUserId: user.id };
  },

  fetch: fetchRoom,

  async updatePlayer(roomId, updates) {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");

    const user = await currentUser();
    const row = {};

    if (updates.riderName) row.rider_name = updates.riderName;
    if (updates.horseId) row.horse_id = updates.horseId;
    if (updates.horseName) row.horse_name = updates.horseName;
    if (updates.horseType) row.horse_type = updates.horseType;
    if (updates.teamSide) row.team_side = updates.teamSide === "red" ? "red" : "blue";
    if (typeof updates.ready === "boolean") row.ready = updates.ready;

    if (Object.keys(row).length === 0) return fetchRoom(roomId);

    const { error } = await supabase.from("online_room_players").update(row).eq("room_id", roomId).eq("user_id", user.id);
    if (error) throw error;

    return fetchRoom(roomId);
  },

  async leave(room) {
    if (!isSupabaseConfigured || !supabase || !room) return;

    const user = await currentUser();

    if (room.hostUserId === user.id) {
      const { error } = await supabase.from("online_rooms").delete().eq("id", room.id).eq("host_user_id", user.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("online_room_players").delete().eq("room_id", room.id).eq("user_id", user.id);
    if (error) throw error;
  },

  subscribe(roomId, onChange) {
    if (!isSupabaseConfigured || !supabase || !roomId) return () => {};

    const refresh = () => {
      fetchRoom(roomId)
        .then(onChange)
        .catch((error) => onChange({ room: null, players: [], error }));
    };

    const channel = supabase
      .channel(`online-room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_rooms", filter: `id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_room_players", filter: `room_id=eq.${roomId}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
