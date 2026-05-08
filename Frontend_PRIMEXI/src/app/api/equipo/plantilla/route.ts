import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  FPL_BUDGET_CAP,
  TEAM_FORMATION,
} from "@/features/team/teamTypes";
import type {
  TeamPlayer,
  TeamPlayerPosition,
  TeamPlayerStatus,
} from "@/features/team/teamTypes";

const INITIAL_POSITION_LIMITS: Record<TeamPlayerPosition, number> = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
};

const POSITION_VALUES = new Set<TeamPlayerPosition>(["GK", "DEF", "MID", "FWD"]);
const POSITION_CANDIDATE_LIMIT = 60;

type PlayerSnapshotRow = {
  id: string;
  fpl_id: number | null;
  name: string | null;
  full_name: string | null;
  team: string | null;
  position: string | null;
  price: number | string | null;
  total_points: number | null;
  form: number | string | null;
  points_per_game: number | string | null;
  selected_by_percent: number | string | null;
  status: string | null;
  photo: string | null;
  chance_of_playing_next_round: number | null;
  fpl_team_id: number | null;
};

type TeamRow = {
  fpl_id: number | null;
  name: string | null;
  short_name: string | null;
};

type FixtureRow = {
  kickoff_time: string | null;
  finished: boolean | null;
  gameweek: number | null;
  team_h_fpl_id: number | null;
  team_a_fpl_id: number | null;
  team_h_difficulty: number | null;
  team_a_difficulty: number | null;
};

type PlayerHistoryRow = {
  fpl_id: number | null;
  gameweek: number | null;
  total_points: number | null;
};

type UpcomingFixture = {
  label: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
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

type ServerSupabaseClient = ReturnType<typeof getServerSupabaseClient>;

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function clampDifficulty(value: number | null | undefined): 1 | 2 | 3 | 4 | 5 {
  const safeValue = Math.round(value ?? 3);

  if (safeValue <= 1) return 1;
  if (safeValue >= 5) return 5;
  return safeValue as 1 | 2 | 3 | 4 | 5;
}

function buildTeamCode(teamName: string, shortName: string | null | undefined) {
  const normalizedShortName = shortName?.trim().toUpperCase() ?? "";

  if (normalizedShortName && !normalizedShortName.startsWith("TEA")) {
    return normalizedShortName;
  }

  const normalizedTeamName = teamName.replace(/[^A-Za-z]/g, "").toUpperCase();
  return normalizedTeamName.slice(0, 3) || "N/A";
}

function isTeamPlayerPosition(value: string | null | undefined): value is TeamPlayerPosition {
  return POSITION_VALUES.has((value ?? "") as TeamPlayerPosition);
}

function mapStatus(
  status: string | null,
  chanceOfPlayingNextRound: number | null,
): TeamPlayerStatus {
  const normalizedStatus = status?.toLowerCase() ?? "";

  if (normalizedStatus === "a") {
    if (chanceOfPlayingNextRound !== null && chanceOfPlayingNextRound < 100) {
      return "doubt";
    }

    return "fit";
  }

  if (["d", "i", "s", "u"].includes(normalizedStatus)) {
    return "doubt";
  }

  return "normal";
}

function buildHistoryMap(historyRows: PlayerHistoryRow[]) {
  const historyMap = new Map<number, number[]>();

  for (const row of historyRows) {
    if (!row.fpl_id || !Number.isInteger(row.gameweek)) {
      continue;
    }

    const currentHistory = historyMap.get(row.fpl_id) ?? [];

    if (currentHistory.length < 5) {
      currentHistory.push(row.total_points ?? 0);
      historyMap.set(row.fpl_id, currentHistory);
    }
  }

  return historyMap;
}

function buildUpcomingFixtureMap(
  fixtures: FixtureRow[],
  teamsByFplId: Map<number, TeamRow>,
) {
  const fixtureMap = new Map<number, UpcomingFixture>();

  for (const fixture of fixtures) {
    const homeTeamId = fixture.team_h_fpl_id;
    const awayTeamId = fixture.team_a_fpl_id;

    if (!homeTeamId || !awayTeamId) {
      continue;
    }

    const homeOpponent = teamsByFplId.get(awayTeamId);
    const awayOpponent = teamsByFplId.get(homeTeamId);

    if (!fixtureMap.has(homeTeamId)) {
      fixtureMap.set(homeTeamId, {
        label: `${homeOpponent?.short_name ?? homeOpponent?.name ?? "TBD"} (H)`,
        difficulty: clampDifficulty(fixture.team_h_difficulty),
      });
    }

    if (!fixtureMap.has(awayTeamId)) {
      fixtureMap.set(awayTeamId, {
        label: `${awayOpponent?.short_name ?? awayOpponent?.name ?? "TBD"} (A)`,
        difficulty: clampDifficulty(fixture.team_a_difficulty),
      });
    }
  }

  return fixtureMap;
}

function toTeamPlayer(
  player: PlayerSnapshotRow,
  teamsByFplId: Map<number, TeamRow>,
  historyMap: Map<number, number[]>,
  upcomingFixtureMap: Map<number, UpcomingFixture>,
): TeamPlayer | null {
  if (!player.fpl_id || !isTeamPlayerPosition(player.position)) {
    return null;
  }

  const price = toNumber(player.price) ?? 0;
  const form = toNumber(player.form) ?? 0;
  const pointsPerGame = toNumber(player.points_per_game) ?? form;
  const ownership = toNumber(player.selected_by_percent) ?? 0;
  const team = player.fpl_team_id ? teamsByFplId.get(player.fpl_team_id) : null;
  const teamName = player.team ?? team?.name ?? team?.short_name ?? "Sin equipo";
  const nextFixture = player.fpl_team_id
    ? upcomingFixtureMap.get(player.fpl_team_id) ?? null
    : null;
  const last5 = [...(historyMap.get(player.fpl_id) ?? [])]
    .slice(0, 5)
    .reverse();

  while (last5.length < 5) {
    last5.unshift(0);
  }

  return {
    id: String(player.id),
    fplId: player.fpl_id,
    name: player.full_name ?? player.name ?? "Jugador",
    shortName: player.name ?? player.full_name ?? "Jugador",
    team: buildTeamCode(teamName, team?.short_name),
    teamName,
    position: player.position,
    xP: Number(pointsPerGame.toFixed(1)),
    price,
    ownership,
    form,
    totalPoints: player.total_points ?? 0,
    status: mapStatus(player.status, player.chance_of_playing_next_round),
    chanceOfPlayingNextRound: player.chance_of_playing_next_round,
    nextFixture: nextFixture?.label ?? "Sin fixture",
    fixtureDifficulty: nextFixture?.difficulty ?? 3,
    last5,
    image: player.photo ?? undefined,
  };
}

function assignLeadership(players: TeamPlayer[]) {
  const rankedPlayers = [...players]
    .sort((left, right) => right.xP - left.xP)
    .map((player) => player.id);
  const captainId = rankedPlayers[0] ?? null;
  const viceId = rankedPlayers[1] ?? null;

  return players.map((player) => ({
    ...player,
    isCaptain: captainId === player.id,
    isVice: viceId === player.id,
  }));
}

function pickInitialPlayerRows(players: PlayerSnapshotRow[]) {
  const remainingLimits = { ...INITIAL_POSITION_LIMITS };
  const selectedRows: PlayerSnapshotRow[] = [];

  for (const player of players) {
    if (!isTeamPlayerPosition(player.position)) {
      continue;
    }

    if (remainingLimits[player.position] <= 0) {
      continue;
    }

    selectedRows.push(player);
    remainingLimits[player.position] -= 1;

    if (selectedRows.length === 11) {
      break;
    }
  }

  return selectedRows;
}

function pickInitialSquad(players: TeamPlayer[]) {
  const remainingLimits = { ...INITIAL_POSITION_LIMITS };
  const squad: TeamPlayer[] = [];

  for (const player of players) {
    if (remainingLimits[player.position] <= 0) {
      continue;
    }

    squad.push(player);
    remainingLimits[player.position] -= 1;

    if (squad.length === 11) {
      break;
    }
  }

  return assignLeadership(squad);
}

async function getLatestGameweek(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("players")
    .select("gameweek")
    .order("gameweek", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const gameweek = (data as { gameweek?: number | null } | null)?.gameweek ?? null;

  if (!Number.isInteger(gameweek)) {
    throw new Error("No pudimos detectar la jornada sincronizada en Supabase.");
  }

  return Number(gameweek);
}

async function loadPlayers(
  supabase: ServerSupabaseClient,
  latestGameweek: number,
  position: TeamPlayerPosition | null,
) {
  let query = supabase
    .from("players")
    .select(
      `
        id,
        fpl_id,
        name,
        full_name,
        team,
        position,
        price,
        total_points,
        form,
        points_per_game,
        selected_by_percent,
        status,
        photo,
        chance_of_playing_next_round,
        fpl_team_id
      `,
    )
    .eq("gameweek", latestGameweek)
    .order("total_points", { ascending: false })
    .order("form", { ascending: false });

  if (position) {
    query = query.eq("position", position).limit(POSITION_CANDIDATE_LIMIT);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as PlayerSnapshotRow[];
}

async function loadTeams(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("teams")
    .select("fpl_id, name, short_name");

  if (error) {
    throw error;
  }

  return (data ?? []) as TeamRow[];
}

async function loadHistory(
  supabase: ServerSupabaseClient,
  fplIds: number[],
) {
  if (fplIds.length === 0) {
    return [] as PlayerHistoryRow[];
  }

  const { data, error } = await supabase
    .from("player_fixture_stats")
    .select("fpl_id, gameweek, total_points")
    .in("fpl_id", fplIds)
    .order("gameweek", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PlayerHistoryRow[];
}

async function loadUpcomingFixtures(
  supabase: ServerSupabaseClient,
  latestGameweek: number,
  teamFplIds: number[],
) {
  if (teamFplIds.length === 0) {
    return [] as FixtureRow[];
  }

  const teamIdsCsv = teamFplIds.join(",");
  const { data, error } = await supabase
    .from("fixtures")
    .select(
      `
        kickoff_time,
        finished,
        gameweek,
        team_h_fpl_id,
        team_a_fpl_id,
        team_h_difficulty,
        team_a_difficulty
      `,
    )
    .eq("finished", false)
    .gte("gameweek", latestGameweek)
    .or(`team_h_fpl_id.in.(${teamIdsCsv}),team_a_fpl_id.in.(${teamIdsCsv})`)
    .order("kickoff_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as FixtureRow[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const positionParam = searchParams.get("position")?.trim().toUpperCase() ?? null;
    const position = isTeamPlayerPosition(positionParam) ? positionParam : null;
    const supabase = getServerSupabaseClient();
    const latestGameweek = await getLatestGameweek(supabase);
    const allPlayerRows = await loadPlayers(supabase, latestGameweek, position);
    const playerRows = position ? allPlayerRows : pickInitialPlayerRows(allPlayerRows);
    const teams = await loadTeams(supabase);
    const teamsByFplId = new Map(
      teams
        .filter((team) => Number.isInteger(team.fpl_id))
        .map((team) => [Number(team.fpl_id), team] as const),
    );
    const playerFplIds = playerRows
      .map((player) => player.fpl_id)
      .filter((fplId): fplId is number => Number.isInteger(fplId));
    const teamFplIds = Array.from(
      new Set(
        playerRows
          .map((player) => player.fpl_team_id)
          .filter((teamId): teamId is number => Number.isInteger(teamId)),
      ),
    );

    const [historyRows, upcomingFixtures] = await Promise.all([
      loadHistory(supabase, playerFplIds),
      loadUpcomingFixtures(supabase, latestGameweek, teamFplIds),
    ]);

    const historyMap = buildHistoryMap(historyRows);
    const upcomingFixtureMap = buildUpcomingFixtureMap(
      upcomingFixtures,
      teamsByFplId,
    );
    const hydratedPlayers = playerRows
      .map((player) =>
        toTeamPlayer(player, teamsByFplId, historyMap, upcomingFixtureMap),
      )
      .filter((player): player is TeamPlayer => player !== null);

    if (position) {
      return NextResponse.json({
        budgetCap: FPL_BUDGET_CAP,
        players: hydratedPlayers,
      });
    }

    return NextResponse.json({
      budgetCap: FPL_BUDGET_CAP,
      formation: TEAM_FORMATION,
      squad: pickInitialSquad(hydratedPlayers),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la plantilla.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
