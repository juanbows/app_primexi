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

export async function signInWithGoogle(redirectTo) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      ...(redirectTo ? { redirectTo } : {}),
    },
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

  if (!id || !email) return null;

  try {
    const { data, error } = await supabase.from("users").upsert(
      {
        id,
        team_name: teamName,
        email,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.warn("createUserProfile upsert warning:", error.message);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
