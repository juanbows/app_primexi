import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SupabaseTeamRow = {
  id: string;
  name: string | null;
  short_name: string | null;
};

function getServerSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your local environment.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET() {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, short_name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const teams = ((data ?? []) as SupabaseTeamRow[]).map((team) => ({
      id: team.id,
      name: team.name ?? team.short_name ?? "Equipo",
      shortName: team.short_name ?? team.name ?? "N/A",
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los equipos.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
