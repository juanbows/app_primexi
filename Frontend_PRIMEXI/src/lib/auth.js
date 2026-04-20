import { supabase } from "@/lib/supabaseClient";

export async function signUp(
  email,
  password,
  teamName = "Mi equipo",
  emailRedirectTo,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: {
        team_name: teamName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function createUserProfile(profile) {
  const { id, email, teamName = "Mi equipo" } = profile;

  if (!id || !email) {
    throw new Error("Missing required user profile data.");
  }

  const { data, error } = await supabase.from("users").upsert(
    {
      id,
      team_name: teamName,
      email,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
  return data;
}
