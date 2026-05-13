import { supabase } from "@/lib/supabaseClient";

const USER_GAMEWEEKS_TABLE = "user_gameweeks";
const USER_TRANSFERS_TABLE = "user_transfers";
const USER_RANKINGS_TABLE = "user_rankings";
const USER_CAPTAINS_TABLE = "user_captains";

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

export async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, team_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile({ teamName }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const normalizedTeamName = teamName?.trim() || "Mi equipo";

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        team_name: normalizedTeamName,
      },
      { onConflict: "id" },
    )
    .select("id, team_name, email")
    .single();

  if (error) throw error;

  await supabase.auth.updateUser({
    data: {
      team_name: normalizedTeamName,
    },
  });

  return data;
}

export async function getGameweeks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(USER_GAMEWEEKS_TABLE)
    .select("id, user_id, gameweek, points")
    .eq("user_id", user.id)
    .order("gameweek", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addGameweek({ gameweek, points }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from(USER_GAMEWEEKS_TABLE)
    .upsert(
      {
        user_id: user.id,
        gameweek,
        points,
      },
      { onConflict: "user_id,gameweek" },
    )
    .select("id, user_id, gameweek, points")
    .single();

  if (error) throw error;
  return data;
}

export async function getTransfers() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(USER_TRANSFERS_TABLE)
    .select("id, user_id, gameweek, player_in, player_out")
    .eq("user_id", user.id)
    .order("gameweek", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addTransfer({ gameweek, playerIn, playerOut }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from(USER_TRANSFERS_TABLE)
    .insert({
      user_id: user.id,
      gameweek,
      player_in: playerIn,
      player_out: playerOut,
    })
    .select("id, user_id, gameweek, player_in, player_out")
    .single();

  if (error) throw error;
  return data;
}

export async function getRankings(mode = "global") {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(USER_RANKINGS_TABLE)
    .select("id, user_id, gameweek, mode, rank")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("gameweek", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addRanking({ gameweek, mode, rank }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from(USER_RANKINGS_TABLE)
    .upsert(
      {
        user_id: user.id,
        gameweek,
        mode,
        rank,
      },
      { onConflict: "user_id,gameweek,mode" },
    )
    .select("id, user_id, gameweek, mode, rank")
    .single();

  if (error) throw error;
  return data;
}

export async function getCaptains() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(USER_CAPTAINS_TABLE)
    .select(
      "id, user_id, gameweek, captain, vice_captain, captain_points, best_option_points",
    )
    .eq("user_id", user.id)
    .order("gameweek", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addCaptain({
  gameweek,
  captain,
  viceCaptain,
  captainPoints,
  bestOptionPoints,
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from(USER_CAPTAINS_TABLE)
    .upsert(
      {
        user_id: user.id,
        gameweek,
        captain,
        vice_captain: viceCaptain,
        captain_points: captainPoints,
        best_option_points: bestOptionPoints,
      },
      { onConflict: "user_id,gameweek" },
    )
    .select(
      "id, user_id, gameweek, captain, vice_captain, captain_points, best_option_points",
    )
    .single();

  if (error) throw error;
  return data;
}
