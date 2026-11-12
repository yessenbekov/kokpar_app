import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

export async function saveImbaResult({ userId, riderName, horseName, scorePlayer, scoreOpponent, won, goals, steals, teamSize, goalType }) {
  if (!isSupabaseConfigured || !supabase || !userId) return;

  const { error } = await supabase.from("imba_results").insert({
    user_id: userId,
    rider_name: riderName,
    horse_name: horseName,
    score_player: scorePlayer,
    score_opponent: scoreOpponent,
    won,
    goals,
    steals,
    team_size: teamSize,
    goal_type: goalType,
    played_at: new Date().toISOString()
  });

  if (error) console.warn("imba_results insert failed", error);
}
