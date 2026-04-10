import { getSupabaseClient } from "@/lib/supabaseClient";

type CurrentGameweekEvent = {
  id: number;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
};

type CurrentGameweekResponse = {
  events: CurrentGameweekEvent[];
};

type PlayerSummary = {
  id: string;
  fpl_id: number;
  name: string;
  full_name: string;
  position: string;
  team: string;
  price: number | string;
  photo: string | null;
};

type PlayerGameweekStatsRow = {
  gameweek: number;
  total_points: number | null;
  minutes: number | null;
  goals_scored: number | null;
  assists: number | null;
  clean_sheets: number | null;
  players: PlayerSummary;
};

export type PlayerRecord = PlayerSummary & {
  gameweek: number;
  total_points: number | null;
  minutes: number | null;
  goals_scored: number | null;
  assists: number | null;
  clean_sheets: number | null;
};

const playerGameweekColumns = `
  gameweek,
  total_points,
  minutes,
  goals_scored,
  assists,
  clean_sheets,
  players!inner (
    id,
    fpl_id,
    name,
    full_name,
    position,
    team,
    price,
    photo
  )
`;

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

function mapPlayerGameweekRow(row: PlayerGameweekStatsRow): PlayerRecord {
  return {
    id: row.players.id,
    fpl_id: row.players.fpl_id,
    name: row.players.name,
    full_name: row.players.full_name,
    position: row.players.position,
    team: row.players.team,
    price: row.players.price,
    photo: row.players.photo,
    gameweek: row.gameweek,
    total_points: row.total_points,
    minutes: row.minutes,
    goals_scored: row.goals_scored,
    assists: row.assists,
    clean_sheets: row.clean_sheets,
  };
}

export async function getTopPlayers(gameweek: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_gameweek_stats")
    .select(playerGameweekColumns)
    .eq("gameweek", gameweek)
    .order("total_points", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return ((data ?? []) as PlayerGameweekStatsRow[]).map(mapPlayerGameweekRow);
}

export async function getRevelationPlayer(gameweek: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_gameweek_stats")
    .select(playerGameweekColumns)
    .eq("gameweek", gameweek)
    .order("total_points", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPlayerGameweekRow(data as PlayerGameweekStatsRow) : null;
}

export async function getCurrentGameweek() {
  const response = await fetch(FPL_BOOTSTRAP_URL, {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FPL bootstrap request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as CurrentGameweekResponse;
  const currentEvent =
    data.events.find((event) => event.is_current) ??
    data.events.find((event) => event.is_next) ??
    [...data.events]
      .filter((event) => event.finished)
      .sort((left, right) => left.id - right.id)
      .at(-1);

  return currentEvent?.id ?? 1;
}
