import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NumericLike = number | string | null | undefined;
type TableRow = Record<string, unknown>;

type SyncRequest = {
  limit?: number;
  offset?: number;
};

type PlayerSeed = {
  id: string;
  fpl_id: number;
  name: string;
};

type PlayerCatalogSeedRow = {
  id: string;
  fpl_id: number;
  web_name: string | null;
  full_name: string | null;
};

type LegacyPlayerSeedRow = {
  player_catalog_id: string | null;
  fpl_id: number | null;
  name: string | null;
  full_name: string | null;
};

type FplHistoryEntry = {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string | null;
  team_h_score: number | null;
  team_a_score: number | null;
  round: number;
  modified: boolean;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: NumericLike;
  creativity: NumericLike;
  threat: NumericLike;
  ict_index: NumericLike;
  clearances_blocks_interceptions: number;
  recoveries: number;
  tackles: number;
  defensive_contribution: number;
  starts: number;
  expected_goals: NumericLike;
  expected_assists: NumericLike;
  expected_goal_involvements: NumericLike;
  expected_goals_conceded: NumericLike;
  value: NumericLike;
  transfers_balance: NumericLike;
  selected: NumericLike;
  transfers_in: NumericLike;
  transfers_out: NumericLike;
};

type FplElementSummary = {
  history: FplHistoryEntry[];
};

type PlayerFixtureStatsRow = {
  player_catalog_id: string;
  fpl_id: number;
  gameweek: number;
  fixture_fpl_id: number;
  opponent_team_fpl_id: number;
  was_home: boolean;
  kickoff_time: string | null;
  team_h_score: number | null;
  team_a_score: number | null;
  modified: boolean;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number | null;
  creativity: number | null;
  threat: number | null;
  ict_index: number | null;
  clearances_blocks_interceptions: number;
  recoveries: number;
  tackles: number;
  defensive_contribution: number;
  starts: number;
  expected_goals: number | null;
  expected_assists: number | null;
  expected_goal_involvements: number | null;
  expected_goals_conceded: number | null;
  value_tenths: number | null;
  transfers_balance: number | null;
  selected: number | null;
  transfers_in: number | null;
  transfers_out: number | null;
  api_payload: FplHistoryEntry;
};

const DEFAULT_LIMIT = 100;
const FETCH_BATCH_SIZE = 8;
const UPSERT_CHUNK_SIZE = 500;
const jsonHeaders = {
  "Content-Type": "application/json",
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function toNullableNumber(value: NumericLike) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toNullableInteger(value: NumericLike) {
  const parsedValue = toNullableNumber(value);
  return parsedValue === null ? null : Math.round(parsedValue);
}

async function parseRequest(req: Request): Promise<SyncRequest> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    return {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  return (await req.json()) as SyncRequest;
}

async function fetchPlayerHistory(fplId: number): Promise<FplElementSummary> {
  const response = await fetch(
    `https://fantasy.premierleague.com/api/element-summary/${fplId}/`,
    {
      headers: {
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `FPL history request failed for player ${fplId} with status ${response.status}.`,
    );
  }

  return (await response.json()) as FplElementSummary;
}

async function upsertInChunks(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: string,
  rows: TableRow[],
  onConflict: string,
) {
  if (rows.length === 0) {
    return;
  }

  for (const rowsChunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabaseAdmin
      .from(table)
      .upsert(rowsChunk, {
        onConflict,
      });

    if (error) {
      throw error;
    }
  }
}

function buildFixtureStatsRows(
  player: PlayerSeed,
  history: FplHistoryEntry[],
): PlayerFixtureStatsRow[] {
  return history
    .filter((historyEntry) =>
      Number.isInteger(historyEntry.round) &&
      Number.isInteger(historyEntry.fixture),
    )
    .map((historyEntry) => ({
      player_catalog_id: player.id,
      fpl_id: player.fpl_id,
      gameweek: historyEntry.round,
      fixture_fpl_id: historyEntry.fixture,
      opponent_team_fpl_id: historyEntry.opponent_team,
      was_home: historyEntry.was_home,
      kickoff_time: historyEntry.kickoff_time,
      team_h_score: historyEntry.team_h_score,
      team_a_score: historyEntry.team_a_score,
      modified: historyEntry.modified,
      total_points: historyEntry.total_points,
      minutes: historyEntry.minutes,
      goals_scored: historyEntry.goals_scored,
      assists: historyEntry.assists,
      clean_sheets: historyEntry.clean_sheets,
      goals_conceded: historyEntry.goals_conceded,
      own_goals: historyEntry.own_goals,
      penalties_saved: historyEntry.penalties_saved,
      penalties_missed: historyEntry.penalties_missed,
      yellow_cards: historyEntry.yellow_cards,
      red_cards: historyEntry.red_cards,
      saves: historyEntry.saves,
      bonus: historyEntry.bonus,
      bps: historyEntry.bps,
      influence: toNullableNumber(historyEntry.influence),
      creativity: toNullableNumber(historyEntry.creativity),
      threat: toNullableNumber(historyEntry.threat),
      ict_index: toNullableNumber(historyEntry.ict_index),
      clearances_blocks_interceptions:
        historyEntry.clearances_blocks_interceptions,
      recoveries: historyEntry.recoveries,
      tackles: historyEntry.tackles,
      defensive_contribution: historyEntry.defensive_contribution,
      starts: historyEntry.starts,
      expected_goals: toNullableNumber(historyEntry.expected_goals),
      expected_assists: toNullableNumber(historyEntry.expected_assists),
      expected_goal_involvements: toNullableNumber(
        historyEntry.expected_goal_involvements,
      ),
      expected_goals_conceded: toNullableNumber(
        historyEntry.expected_goals_conceded,
      ),
      value_tenths: toNullableInteger(historyEntry.value),
      transfers_balance: toNullableInteger(historyEntry.transfers_balance),
      selected: toNullableInteger(historyEntry.selected),
      transfers_in: toNullableInteger(historyEntry.transfers_in),
      transfers_out: toNullableInteger(historyEntry.transfers_out),
      api_payload: historyEntry,
    }));
}

async function loadPlayerSeeds(
  supabaseAdmin: ReturnType<typeof createClient>,
  limit: number,
  offset: number,
): Promise<{ players: PlayerSeed[]; totalPlayers: number }> {
  const { data: catalogPlayers, error: catalogError, count } = await supabaseAdmin
    .from("player_catalog")
    .select("id, fpl_id, web_name, full_name", { count: "exact" })
    .order("fpl_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (catalogError) {
    throw catalogError;
  }

  const catalogRows = (catalogPlayers ?? []) as PlayerCatalogSeedRow[];
  const totalPlayers = count ?? catalogRows.length;

  if (catalogRows.length > 0) {
    return {
      totalPlayers,
      players: catalogRows.map((player) => ({
        id: String(player.id),
        fpl_id: Number(player.fpl_id),
        name: String(player.web_name ?? player.full_name ?? player.fpl_id),
      })),
    };
  }

  const legacyFetchSize = limit * 3;
  const {
    data: players,
    error: playersError,
    count: legacyCount,
  } = await supabaseAdmin
    .from("players")
    .select("player_catalog_id, fpl_id, name, full_name", { count: "exact" })
    .order("fpl_id", { ascending: true })
    .range(offset, offset + legacyFetchSize - 1);

  if (playersError) {
    throw playersError;
  }

  const legacyRows = (players ?? []) as LegacyPlayerSeedRow[];
  const totalLegacyPlayers = legacyCount ?? legacyRows.length;
  const seeds = new Map<string, PlayerSeed>();

  for (const player of legacyRows) {
    if (!player.player_catalog_id || !player.fpl_id) {
      continue;
    }

    const key = String(player.player_catalog_id);
    if (!seeds.has(key)) {
      seeds.set(key, {
        id: key,
        fpl_id: Number(player.fpl_id),
        name: String(player.name ?? player.full_name ?? player.fpl_id),
      });
    }

    if (seeds.size >= limit) {
      break;
    }
  }

  return {
    totalPlayers: totalLegacyPlayers,
    players: Array.from(seeds.values()).slice(0, limit),
  };
}

async function fetchFixtureStatsRows(players: PlayerSeed[]) {
  const rows: PlayerFixtureStatsRow[] = [];

  for (const playerBatch of chunkArray(players, FETCH_BATCH_SIZE)) {
    const batchRows = await Promise.all(
      playerBatch.map(async (player) => {
        const summary = await fetchPlayerHistory(player.fpl_id);
        return buildFixtureStatsRows(player, summary.history);
      }),
    );

    rows.push(...batchRows.flat());
  }

  return rows;
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use GET or POST." }),
      {
        status: 405,
        headers: jsonHeaders,
      },
    );
  }

  try {
    const request = await parseRequest(req);
    const limit = request.limit ?? DEFAULT_LIMIT;
    const offset = request.offset ?? 0;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("limit must be an integer between 1 and 100.");
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("offset must be a non-negative integer.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { players: playerSeeds, totalPlayers } = await loadPlayerSeeds(
      supabaseAdmin,
      limit,
      offset,
    );

    if (playerSeeds.length === 0) {
      return new Response(
        JSON.stringify(
          {
            synced_players: 0,
            synced_fixture_rows: 0,
            refreshed_gameweeks: 0,
            limit,
            offset,
            total_players: totalPlayers,
            has_more: false,
            next_offset: null,
            sample_players: [],
          },
          null,
          2,
        ),
        {
          status: 200,
          headers: jsonHeaders,
        },
      );
    }

    const rows = await fetchFixtureStatsRows(playerSeeds);

    if (rows.length === 0) {
      throw new Error("The selected players returned no FPL history rows.");
    }

    await upsertInChunks(
      supabaseAdmin,
      "player_fixture_stats",
      rows,
      "fpl_id,fixture_fpl_id",
    );

    const affectedFplIds = Array.from(new Set(rows.map((row) => row.fpl_id)));
    const affectedGameweeks = Array.from(new Set(rows.map((row) => row.gameweek)));

    const { error: refreshAggregatesError } = await supabaseAdmin.rpc(
      "refresh_player_gameweek_stats_from_fixture_stats",
      {
        p_fpl_ids: affectedFplIds,
        p_gameweeks: affectedGameweeks,
      },
    );

    if (refreshAggregatesError) {
      throw refreshAggregatesError;
    }

    const { error: refreshRankingsError } = await supabaseAdmin.rpc(
      "refresh_player_season_rankings",
    );

    if (refreshRankingsError) {
      console.warn(
        "Unable to refresh mv_player_season_rankings after history sync:",
        refreshRankingsError.message,
      );
    }

    return new Response(
      JSON.stringify(
        {
          synced_players: playerSeeds.length,
          synced_fixture_rows: rows.length,
          refreshed_gameweeks: affectedGameweeks.length,
          limit,
          offset,
          total_players: totalPlayers,
          has_more: offset + playerSeeds.length < totalPlayers,
          next_offset:
            offset + playerSeeds.length < totalPlayers
              ? offset + playerSeeds.length
              : null,
          sample_players: playerSeeds.slice(0, 5).map((player) => ({
            id: player.id,
            fpl_id: player.fpl_id,
            name: player.name,
          })),
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected history sync error.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
