import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NumericLike = number | string | null | undefined;
type PositionCode = "GK" | "DEF" | "MID" | "FWD";
type TableRow = Record<string, unknown>;

type FplBootstrap = {
  elements: FplElement[];
  teams: FplTeam[];
  element_types: FplElementType[];
  events: FplEvent[];
};

type FplTeam = {
  code: number;
  draw: number;
  form: string | null;
  id: number;
  loss: number;
  name: string;
  played: number;
  points: number;
  position: number;
  short_name: string;
  strength: number;
  team_division: number | null;
  unavailable: boolean;
  win: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
  pulse_id: number | null;
};

type FplEvent = {
  id: number;
  name: string;
  deadline_time: string | null;
  release_time: string | null;
  average_entry_score: number | null;
  finished: boolean;
  data_checked: boolean;
  highest_scoring_entry: number | null;
  deadline_time_epoch: number | null;
  deadline_time_game_offset: number | null;
  highest_score: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  cup_leagues_created: boolean;
  h2h_ko_matches_created: boolean;
  can_enter: boolean;
  can_manage: boolean;
  released: boolean;
  ranked_count: number | null;
  overrides: unknown;
  chip_plays: unknown;
  most_selected: number | null;
  most_transferred_in: number | null;
  top_element: number | null;
  top_element_info?: {
    points?: number | null;
  } | null;
  transfers_made: number | null;
  most_captained: number | null;
  most_vice_captained: number | null;
};

type FplElementType = {
  id: number;
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: string;
  squad_select: number;
  squad_min_select: number;
  squad_max_select: number;
  squad_min_play: number;
  squad_max_play: number;
  ui_shirt_specific: boolean;
  sub_positions_locked: unknown;
  element_count: number;
};

type FplElement = {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  known_name: string | null;
  team: number;
  team_code: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  minutes: number;
  form: NumericLike;
  status: string;
  selected_by_percent: NumericLike;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
  news: string;
  news_added: string | null;
  photo: string;
  points_per_game: NumericLike;
  event_points: number;
  bonus: number;
  bps: number;
  influence: NumericLike;
  creativity: NumericLike;
  threat: NumericLike;
  ict_index: NumericLike;
  expected_goals: NumericLike;
  expected_assists: NumericLike;
  expected_goal_involvements: NumericLike;
  expected_goals_conceded: NumericLike;
  transfers_in: number;
  transfers_out: number;
};

type FplFixture = {
  code: number;
  event: number | null;
  finished: boolean;
  finished_provisional: boolean;
  id: number;
  kickoff_time: string | null;
  minutes: number;
  provisional_start_time: boolean;
  started: boolean | null;
  team_a: number;
  team_a_score: number | null;
  team_h: number;
  team_h_score: number | null;
  stats: unknown;
  team_h_difficulty: number;
  team_a_difficulty: number;
  pulse_id: number | null;
};

type SyncRequest = {
  gameweek?: number;
  limit?: number;
};

type PlayerSnapshotRow = {
  fpl_id: number;
  code: number;
  name: string;
  web_name: string;
  first_name: string;
  second_name: string;
  known_name: string | null;
  full_name: string;
  position: PositionCode;
  team: string;
  team_code: number;
  price: number;
  price_tenths: number;
  total_points: number;
  gameweek: number;
  is_revelation: boolean;
  fpl_team_id: number;
  fpl_position_id: number;
  minutes: number;
  form: number;
  status: string;
  selected_by_percent: number;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
  news: string;
  news_added: string | null;
  photo: string | null;
  points_per_game: number | null;
  event_points: number | null;
  influence: number | null;
  creativity: number | null;
  threat: number | null;
  ict_index: number | null;
  bonus: number | null;
  bps: number | null;
  expected_goals: number | null;
  expected_assists: number | null;
  expected_goal_involvements: number | null;
  expected_goals_conceded: number | null;
  transfers_in: number | null;
  transfers_out: number | null;
  api_payload: FplElement;
  updated_at: string;
};

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";
const PLAYER_PHOTO_BASE_URL =
  "https://resources.premierleague.com/premierleague/photos/players/110x140/p";
const UPSERT_CHUNK_SIZE = 200;
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

function normalizePosition(shortName: string): PositionCode {
  if (shortName === "GKP") {
    return "GK";
  }

  if (shortName === "DEF" || shortName === "MID" || shortName === "FWD") {
    return shortName;
  }

  throw new Error(`Unsupported FPL position code: ${shortName}`);
}

function toNumber(value: NumericLike, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
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

function normalizePhoto(photo: string | null | undefined) {
  if (!photo) {
    return null;
  }

  return `${PLAYER_PHOTO_BASE_URL}${photo}`;
}

function resolveDefaultGameweek(events: FplEvent[]) {
  const currentEvent =
    events.find((event) => event.is_current) ??
    events.find((event) => event.is_next) ??
    [...events]
      .filter((event) => event.finished)
      .sort((left, right) => left.id - right.id)
      .at(-1) ??
    null;

  return currentEvent?.id ?? 1;
}

async function parseRequest(req: Request): Promise<SyncRequest> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const gameweek = url.searchParams.get("gameweek");
    const limit = url.searchParams.get("limit");

    return {
      gameweek: gameweek ? Number(gameweek) : undefined,
      limit: limit ? Number(limit) : undefined,
    };
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  return (await req.json()) as SyncRequest;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`FPL API request failed for ${url} with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchFplData() {
  const [bootstrap, fixtures] = await Promise.all([
    fetchJson<FplBootstrap>(FPL_BOOTSTRAP_URL),
    fetchJson<FplFixture[]>(FPL_FIXTURES_URL),
  ]);

  return { bootstrap, fixtures };
}

function buildTeamRows(teams: FplTeam[], syncedAt: string): TableRow[] {
  return teams.map((team) => ({
    fpl_id: team.id,
    code: team.code,
    draw: team.draw,
    form: team.form,
    loss: team.loss,
    name: team.name,
    played: team.played,
    points: team.points,
    position: team.position,
    short_name: team.short_name,
    strength: team.strength,
    team_division: team.team_division,
    unavailable: team.unavailable,
    win: team.win,
    strength_overall_home: team.strength_overall_home,
    strength_overall_away: team.strength_overall_away,
    strength_attack_home: team.strength_attack_home,
    strength_attack_away: team.strength_attack_away,
    strength_defence_home: team.strength_defence_home,
    strength_defence_away: team.strength_defence_away,
    pulse_id: team.pulse_id,
    api_payload: team,
    updated_at: syncedAt,
  }));
}

function buildGameweekRows(events: FplEvent[], syncedAt: string): TableRow[] {
  return events.map((event) => ({
    fpl_id: event.id,
    name: event.name,
    deadline_time: event.deadline_time,
    release_time: event.release_time,
    average_entry_score: event.average_entry_score,
    finished: event.finished,
    data_checked: event.data_checked,
    highest_scoring_entry: event.highest_scoring_entry,
    deadline_time_epoch: event.deadline_time_epoch,
    deadline_time_game_offset: event.deadline_time_game_offset,
    highest_score: event.highest_score,
    is_previous: event.is_previous,
    is_current: event.is_current,
    is_next: event.is_next,
    cup_leagues_created: event.cup_leagues_created,
    h2h_ko_matches_created: event.h2h_ko_matches_created,
    can_enter: event.can_enter,
    can_manage: event.can_manage,
    released: event.released,
    ranked_count: event.ranked_count,
    overrides: event.overrides,
    chip_plays: event.chip_plays,
    most_selected: event.most_selected,
    most_transferred_in: event.most_transferred_in,
    top_element: event.top_element,
    top_element_points: event.top_element_info?.points ?? null,
    transfers_made: event.transfers_made,
    most_captained: event.most_captained,
    most_vice_captained: event.most_vice_captained,
    api_payload: event,
    updated_at: syncedAt,
  }));
}

function buildElementTypeRows(
  elementTypes: FplElementType[],
  syncedAt: string,
): TableRow[] {
  return elementTypes.map((elementType) => ({
    fpl_id: elementType.id,
    plural_name: elementType.plural_name,
    plural_name_short: elementType.plural_name_short,
    singular_name: elementType.singular_name,
    singular_name_short: elementType.singular_name_short,
    app_code: normalizePosition(elementType.singular_name_short),
    squad_select: elementType.squad_select,
    squad_min_select: elementType.squad_min_select,
    squad_max_select: elementType.squad_max_select,
    squad_min_play: elementType.squad_min_play,
    squad_max_play: elementType.squad_max_play,
    ui_shirt_specific: elementType.ui_shirt_specific,
    sub_positions_locked: elementType.sub_positions_locked,
    element_count: elementType.element_count,
    api_payload: elementType,
    updated_at: syncedAt,
  }));
}

function buildFixtureRows(fixtures: FplFixture[], syncedAt: string): TableRow[] {
  return fixtures.map((fixture) => ({
    fpl_id: fixture.id,
    code: fixture.code,
    gameweek: fixture.event,
    finished: fixture.finished,
    finished_provisional: fixture.finished_provisional,
    started: fixture.started,
    minutes: fixture.minutes,
    provisional_start_time: fixture.provisional_start_time,
    kickoff_time: fixture.kickoff_time,
    team_h_fpl_id: fixture.team_h,
    team_h_score: fixture.team_h_score,
    team_a_fpl_id: fixture.team_a,
    team_a_score: fixture.team_a_score,
    team_h_difficulty: fixture.team_h_difficulty,
    team_a_difficulty: fixture.team_a_difficulty,
    stats: fixture.stats,
    pulse_id: fixture.pulse_id,
    api_payload: fixture,
    updated_at: syncedAt,
  }));
}

function buildPlayerRows(
  bootstrap: FplBootstrap,
  gameweek: number,
  syncedAt: string,
): PlayerSnapshotRow[] {
  const teamById = new Map<number, FplTeam>(
    bootstrap.teams.map((team) => [team.id, team]),
  );
  const positionCodeById = new Map<number, PositionCode>(
    bootstrap.element_types.map((position) => [
      position.id,
      normalizePosition(position.singular_name_short),
    ]),
  );

  const players = bootstrap.elements.map((element) => {
    const team = teamById.get(element.team);
    const positionCode = positionCodeById.get(element.element_type);

    if (!team) {
      throw new Error(`Missing team mapping for FPL team id ${element.team}.`);
    }

    if (!positionCode) {
      throw new Error(
        `Missing position mapping for FPL element_type ${element.element_type}.`,
      );
    }

    return {
      fpl_id: element.id,
      code: element.code,
      name: element.web_name,
      web_name: element.web_name,
      first_name: element.first_name,
      second_name: element.second_name,
      known_name: element.known_name,
      full_name: `${element.first_name} ${element.second_name}`.trim(),
      position: positionCode,
      team: team.name,
      team_code: element.team_code,
      price: element.now_cost / 10,
      price_tenths: element.now_cost,
      total_points: element.total_points,
      gameweek,
      is_revelation: false,
      fpl_team_id: element.team,
      fpl_position_id: element.element_type,
      minutes: element.minutes ?? 0,
      form: toNumber(element.form),
      status: element.status,
      selected_by_percent: toNumber(element.selected_by_percent),
      chance_of_playing_next_round: toNullableInteger(
        element.chance_of_playing_next_round,
      ),
      chance_of_playing_this_round: toNullableInteger(
        element.chance_of_playing_this_round,
      ),
      news: element.news ?? "",
      news_added: element.news_added,
      photo: normalizePhoto(element.photo),
      points_per_game: toNullableNumber(element.points_per_game),
      event_points: toNullableInteger(element.event_points),
      influence: toNullableNumber(element.influence),
      creativity: toNullableNumber(element.creativity),
      threat: toNullableNumber(element.threat),
      ict_index: toNullableNumber(element.ict_index),
      bonus: toNullableInteger(element.bonus),
      bps: toNullableInteger(element.bps),
      expected_goals: toNullableNumber(element.expected_goals),
      expected_assists: toNullableNumber(element.expected_assists),
      expected_goal_involvements: toNullableNumber(
        element.expected_goal_involvements,
      ),
      expected_goals_conceded: toNullableNumber(
        element.expected_goals_conceded,
      ),
      transfers_in: toNullableInteger(element.transfers_in),
      transfers_out: toNullableInteger(element.transfers_out),
      api_payload: element,
      updated_at: syncedAt,
    } satisfies PlayerSnapshotRow;
  });

  return players.sort(
    (left, right) =>
      toNumber(right.total_points) - toNumber(left.total_points),
  );
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
      .upsert(rowsChunk, { onConflict });

    if (error) {
      throw error;
    }
  }
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
    const limit = request.limit;

    if (
      request.gameweek !== undefined &&
      (!Number.isInteger(request.gameweek) || request.gameweek < 1 || request.gameweek > 38)
    ) {
      throw new Error("gameweek must be an integer between 1 and 38.");
    }

    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      throw new Error("limit must be a positive integer when provided.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const { bootstrap, fixtures } = await fetchFplData();
    const currentEvent =
      bootstrap.events.find((event) => event.is_current) ??
      bootstrap.events.find((event) => event.is_next) ??
      null;
    const gameweek = request.gameweek ?? resolveDefaultGameweek(bootstrap.events);
    const syncedAt = new Date().toISOString();

    const teamRows = buildTeamRows(bootstrap.teams, syncedAt);
    const gameweekRows = buildGameweekRows(bootstrap.events, syncedAt);
    const elementTypeRows = buildElementTypeRows(bootstrap.element_types, syncedAt);
    const fixtureRows = buildFixtureRows(fixtures, syncedAt);
    const transformedPlayers = buildPlayerRows(bootstrap, gameweek, syncedAt);
    const playersToSync =
      limit === undefined
        ? transformedPlayers
        : transformedPlayers.slice(0, limit);

    if (playersToSync.length === 0) {
      throw new Error("The FPL API returned no players to sync.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    await upsertInChunks(supabaseAdmin, "teams", teamRows, "fpl_id");
    await upsertInChunks(supabaseAdmin, "gameweeks", gameweekRows, "fpl_id");
    await upsertInChunks(
      supabaseAdmin,
      "element_types",
      elementTypeRows,
      "fpl_id",
    );
    await upsertInChunks(supabaseAdmin, "fixtures", fixtureRows, "fpl_id");
    await upsertInChunks(supabaseAdmin, "players", playersToSync, "fpl_id,gameweek");

    const { error: resetError } = await supabaseAdmin
      .from("players")
      .update({
        is_revelation: false,
        updated_at: syncedAt,
      })
      .eq("gameweek", gameweek);

    if (resetError) {
      throw resetError;
    }

    const revelationPlayer = playersToSync[0];

    const { error: revelationError } = await supabaseAdmin
      .from("players")
      .update({
        is_revelation: true,
        updated_at: syncedAt,
      })
      .eq("fpl_id", revelationPlayer.fpl_id)
      .eq("gameweek", gameweek);

    if (revelationError) {
      throw revelationError;
    }

    return new Response(
      JSON.stringify(
        {
          source: {
            bootstrap_url: FPL_BOOTSTRAP_URL,
            fixtures_url: FPL_FIXTURES_URL,
            elements: bootstrap.elements.length,
            teams: bootstrap.teams.length,
            positions: bootstrap.element_types.length,
            events: bootstrap.events.length,
            fixtures: fixtures.length,
            current_event: currentEvent
              ? {
                  id: currentEvent.id,
                  name: currentEvent.name,
                  deadline_time: currentEvent.deadline_time,
                  finished: currentEvent.finished,
                  is_current: currentEvent.is_current,
                  is_next: currentEvent.is_next,
                }
              : null,
          },
          mapping: {
            teams: "bootstrap-static.teams -> public.teams",
            gameweeks: "bootstrap-static.events -> public.gameweeks",
            positions: "bootstrap-static.element_types -> public.element_types",
            fixtures: "fixtures -> public.fixtures",
            players:
              "bootstrap-static.elements -> public.players + trigger-driven player_catalog sync",
          },
          sync: {
            snapshot_gameweek: gameweek,
            requested_limit: limit ?? null,
            synced_players: playersToSync.length,
            synced_teams: teamRows.length,
            synced_gameweeks: gameweekRows.length,
            synced_positions: elementTypeRows.length,
            synced_fixtures: fixtureRows.length,
            revelation_player: {
              fpl_id: revelationPlayer.fpl_id,
              name: revelationPlayer.name,
              team: revelationPlayer.team,
              total_points: revelationPlayer.total_points,
            },
          },
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
      error instanceof Error ? error.message : "Unexpected sync error.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
