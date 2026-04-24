import { supabase } from "@/lib/supabaseClient";

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

export async function getGameweeks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("gameweeks")
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
    .from("gameweeks")
    .insert({
      user_id: user.id,
      gameweek,
      points,
    })
    .select("id, user_id, gameweek, points")
    .single();

  if (error) throw error;
  return data;
}

export async function getTransfers() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("transfers")
    .select("id, user_id, gameweek, player_in, player_out")
    .eq("user_id", user.id)
    .order("gameweek", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addTransfer({ gameweek, playerIn, playerOut }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("transfers")
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
