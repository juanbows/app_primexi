import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getOfficialTeamMap,
  resolveTeamName,
  resolveTeamShortName,
} from "@/lib/fplOfficial";

type SupabaseTeamRow = {
  id: string;
  fpl_id: number | null;
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
      .select("id, fpl_id, name, short_name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const officialTeamMap = await getOfficialTeamMap().catch(() => null);

    const teams = ((data ?? []) as SupabaseTeamRow[])
      .map((team) => ({
        id: team.id,
        name: resolveTeamName(team, officialTeamMap),
        shortName: resolveTeamShortName(team, officialTeamMap),
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, "en", { sensitivity: "base" }),
      );

    return NextResponse.json({ teams });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los equipos.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
