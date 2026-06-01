import { DEFAULT_PLAYER_PROFILE, sanitizePlayerProfile } from "./playerProfile.js";
import { supabase } from "./supabaseClient.js";

function profileFromRows(profileRow, horseRows = []) {
  return sanitizePlayerProfile({
    riderName: profileRow.rider_name,
    level: profileRow.level,
    coins: profileRow.coins,
    reputation: profileRow.reputation,
    selectedHorseId: profileRow.selected_horse_id,
    selectedHorseType: profileRow.selected_horse_type,
    stableCapacity: profileRow.stable_capacity,
    matchPreferences: profileRow.match_preferences,
    ownedHorses: (horseRows ?? []).map((horse) => ({
      id: horse.id,
      name: horse.name,
      typeId: horse.type_id,
      level: horse.level,
      xp: horse.xp,
      bond: horse.bond,
      equipment: horse.equipment,
      record: horse.record
    }))
  });
}

function profileRowFromProfile(profile, userId) {
  return {
    user_id: userId,
    rider_name: profile.riderName,
    level: profile.level,
    coins: profile.coins,
    reputation: profile.reputation,
    selected_horse_id: profile.selectedHorseId,
    selected_horse_type: profile.selectedHorseType,
    stable_capacity: profile.stableCapacity,
    match_preferences: profile.matchPreferences
  };
}

function horseRowsFromProfile(profile, userId) {
  return profile.ownedHorses.map((horse) => ({
    user_id: userId,
    id: horse.id,
    name: horse.name,
    type_id: horse.typeId,
    level: horse.level,
    xp: horse.xp,
    bond: horse.bond,
    equipment: horse.equipment,
    record: horse.record
  }));
}

async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function createSupabaseProfileStore({ client = supabase } = {}) {
  const store = {
    kind: "supabase",

    async read() {
      if (!client) return { status: "unconfigured", profile: sanitizePlayerProfile(DEFAULT_PLAYER_PROFILE) };

      const user = await currentUser(client);
      if (!user) return { status: "signed-out", profile: sanitizePlayerProfile(DEFAULT_PLAYER_PROFILE) };

      const { data: profileRow, error: profileError } = await client
        .from("player_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileRow) {
        return { status: "missing", profile: sanitizePlayerProfile(DEFAULT_PLAYER_PROFILE) };
      }

      const { data: horseRows, error: horsesError } = await client
        .from("owned_horses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (horsesError) throw horsesError;

      return {
        status: "loaded",
        profile: profileFromRows(profileRow, horseRows)
      };
    },

    async save(profile) {
      const safeProfile = sanitizePlayerProfile(profile);
      if (!client) return safeProfile;

      const user = await currentUser(client);
      if (!user) return safeProfile;

      const { error: profileError } = await client
        .from("player_profiles")
        .upsert(profileRowFromProfile(safeProfile, user.id), { onConflict: "user_id" });

      if (profileError) throw profileError;

      const horseRows = horseRowsFromProfile(safeProfile, user.id);
      const { error: horsesError } = await client.from("owned_horses").upsert(horseRows, { onConflict: "user_id,id" });

      if (horsesError) throw horsesError;

      return safeProfile;
    }
  };

  return store;
}

export const supabaseProfileStore = createSupabaseProfileStore();
