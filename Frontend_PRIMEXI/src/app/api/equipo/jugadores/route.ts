import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const positionIdMap = {
  GK: 1,
  DEF: 2,
  MID: 3,
  FWD: 4,
} as const;

type SupabasePlayerRow = {
  id: string;
  fpl_id: number;
  web_name: string;
  full_name: string;
  fpl_position_id: number | null;
  price: number | string | null;
  total_points: number | null;
  form: number | string | null;
  selected_by_percent: number | string | null;
  status: string | null;
  photo: string | null;
  teams:
    | {
        name: string | null;
        short_name: string | null;
      }
    | {
        name: string | null;
        short_name: string | null;
      }[]
    | null;
  element_types:
    | {
        app_code: string | null;
        singular_name: string | null;
      }
    | {
        app_code: string | null;
        singular_name: string | null;
      }[]
    | null;
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

function takeFirstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position")?.trim().toUpperCase() ?? null;
    const teamId = searchParams.get("teamId")?.trim() ?? null;
    const supabase = getServerSupabaseClient();

    let playersQuery = supabase
      .from("player_catalog")
      .select(
        `
          id,
          fpl_id,
          web_name,
          full_name,
          fpl_position_id,
          price,
          total_points,
          form,
          selected_by_percent,
          status,
          photo,
          teams:teams!player_catalog_team_id_fkey (
            name,
            short_name
          ),
          element_types:element_types!player_catalog_element_type_id_fkey (
            app_code,
            singular_name
          )
        `,
      )
      .order("total_points", { ascending: false })
      .order("web_name", { ascending: true });

    if (position && position in positionIdMap) {
      playersQuery = playersQuery.eq(
        "fpl_position_id",
        positionIdMap[position as keyof typeof positionIdMap],
      );
    }

    if (teamId) {
      playersQuery = playersQuery.eq("team_id", teamId);
    }

    const playersResult = await playersQuery;

    if (playersResult.error) {
      throw playersResult.error;
    }

    const players = ((playersResult.data ?? []) as SupabasePlayerRow[]).map((player) => {
      const team = takeFirstRelation(player.teams);
      const elementType = takeFirstRelation(player.element_types);

      return {
        id: player.id,
        fplId: player.fpl_id,
        name: player.web_name,
        fullName: player.full_name,
        team: team?.name ?? team?.short_name ?? "N/A",
        teamName: team?.name ?? team?.short_name ?? "N/A",
        position: elementType?.app_code ?? "UNK",
        positionLabel: elementType?.singular_name ?? "Unknown",
        price: toNumber(player.price),
        totalPoints: player.total_points ?? 0,
        form: toNumber(player.form),
        ownership: toNumber(player.selected_by_percent),
        status: player.status,
        photo: player.photo,
      };
    });

    return NextResponse.json({ players });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los jugadores.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
