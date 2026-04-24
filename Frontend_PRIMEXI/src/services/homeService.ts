import { getSupabaseClient } from "@/lib/supabaseClient";

type GameweekEvent = {
  id?: number;
  fpl_id?: number;
  name?: string | null;
  deadline_time?: string | null;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
};

type CurrentGameweekResponse = {
  events: GameweekEvent[];
};

type PlayerSummary = {
  id: string;
  fpl_id: number;
  name: string;
  full_name: string;
  position: string;
  team: string;
  fpl_team_id: number | null;
  price: number | string;
  photo: string | null;
};

type PlayerSnapshotRow = PlayerSummary & {
  gameweek: number;
  total_points: number | null;
  event_points: number | null;
  minutes: number | null;
  form: number | null;
  selected_by_percent: number | null;
  status: string | null;
  chance_of_playing_next_round: number | null;
};

export type PlayerRecord = PlayerSnapshotRow;

type GameweekRow = {
  fpl_id: number;
  name: string;
  deadline_time: string | null;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
};

type PlayerInsightRow = {
  id: string;
  name: string;
  team: string;
  form: number | null;
  total_points: number | null;
  status: string | null;
  news: string | null;
  selected_by_percent: number | null;
  chance_of_playing_next_round: number | null;
  transfers_in: number | null;
  transfers_out: number | null;
};

type HistoricalPlayerStatRow = {
  player_catalog_id: string | null;
  fpl_id: number;
  gameweek: number;
  total_points: number | null;
  minutes: number | null;
  transfers_in: number | null;
  transfers_out: number | null;
};

type PlayerCatalogRow = {
  id: string;
  fpl_id: number;
  web_name: string | null;
  full_name: string | null;
  fpl_team_id: number | null;
  fpl_position_id: number | null;
  price: number | string | null;
  photo: string | null;
  form: number | string | null;
  status: string | null;
  news: string | null;
  selected_by_percent: number | string | null;
  chance_of_playing_next_round: number | null;
  total_points: number | null;
  transfers_in: number | null;
  transfers_out: number | null;
};

type TeamLookupRow = {
  fpl_id: number;
  name: string | null;
  short_name: string | null;
  api_payload:
    | {
        name?: string | null;
        short_name?: string | null;
      }
    | null;
};

export type HomeCountdown = {
  gameweek: number;
  deadlineTime: string;
};

export type HomeContext = {
  currentGameweek: number;
  countdown: HomeCountdown | null;
  latestSyncedGameweek: number | null;
};

export type HomeInsight = {
  id: string;
  type: "availability" | "form" | "market_in" | "market_out";
  title: string;
  description: string;
  probability?: string;
};

const playerSnapshotColumns = `
  id,
  fpl_id,
  name,
  full_name,
  position,
  team,
  fpl_team_id,
  price,
  photo,
  gameweek,
  total_points,
  event_points,
  minutes,
  form,
  selected_by_percent,
  status,
  chance_of_playing_next_round
`;

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

const positionCodeByFplPositionId: Record<number, PlayerRecord["position"]> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function resolveEventGameweek(event: GameweekEvent) {
  return event.fpl_id ?? event.id ?? 1;
}

function resolveCurrentEvent(events: GameweekEvent[]) {
  return (
    events.find((event) => event.is_current) ??
    events.find((event) => event.is_next) ??
    [...events]
      .filter((event) => event.finished)
      .sort(
        (left, right) => resolveEventGameweek(left) - resolveEventGameweek(right),
      )
      .at(-1) ??
    null
  );
}

function resolveUpcomingDeadlineEvent(events: GameweekEvent[]) {
  const upcomingEvents = [...events]
    .filter((event) => {
      if (!event.deadline_time) {
        return false;
      }

      return new Date(event.deadline_time).getTime() > Date.now();
    })
    .sort((left, right) => {
      const leftTime = new Date(left.deadline_time ?? 0).getTime();
      const rightTime = new Date(right.deadline_time ?? 0).getTime();
      return leftTime - rightTime;
    });

  return upcomingEvents[0] ?? null;
}

function buildHomeContext(events: GameweekEvent[]): HomeContext {
  const currentEvent = resolveCurrentEvent(events);
  const countdownEvent = resolveUpcomingDeadlineEvent(events);

  return {
    currentGameweek: currentEvent ? resolveEventGameweek(currentEvent) : 1,
    countdown:
      countdownEvent?.deadline_time
        ? {
            gameweek: resolveEventGameweek(countdownEvent),
            deadlineTime: countdownEvent.deadline_time,
          }
        : null,
    latestSyncedGameweek: null,
  };
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return null;
  }

  return `${value.toFixed(1)}%`;
}

function trimCopy(value: string | null | undefined, maxLength = 110) {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1).trimEnd()}…`;
}

function resolvePositionCode(fplPositionId: number | null | undefined) {
  return positionCodeByFplPositionId[fplPositionId ?? 0] ?? "MID";
}

function isPlaceholderTeamValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return true;
  }

  return /^team\s+\d+$/i.test(normalizedValue) || normalizedValue.toUpperCase() === "TEA";
}

function resolveTeamDisplayName(
  team: TeamLookupRow | null | undefined,
  fallbackTeam?: string | null,
) {
  const apiPayloadName = team?.api_payload?.name?.trim();
  if (apiPayloadName) {
    return apiPayloadName;
  }

  if (!isPlaceholderTeamValue(team?.name)) {
    return team?.name?.trim() ?? "Sin equipo";
  }

  if (!isPlaceholderTeamValue(team?.short_name)) {
    return team?.short_name?.trim() ?? "Sin equipo";
  }

  if (!isPlaceholderTeamValue(fallbackTeam)) {
    return fallbackTeam?.trim() ?? "Sin equipo";
  }

  return "Sin equipo";
}

async function getHistoricalPlayerRecords(gameweek: number): Promise<PlayerRecord[]> {
  const supabase = getSupabaseClient();
  const { data: statsData, error: statsError } = await supabase
    .from("player_gameweek_stats")
    .select("player_catalog_id,fpl_id,gameweek,total_points,minutes,transfers_in,transfers_out")
    .eq("gameweek", gameweek)
    .order("total_points", { ascending: false })
    .limit(20);

  if (statsError) {
    throw statsError;
  }

  const historicalStats = (statsData ?? []) as HistoricalPlayerStatRow[];

  if (historicalStats.length === 0) {
    return [];
  }

  const playerCatalogIds = historicalStats
    .map((row) => row.player_catalog_id)
    .filter((value): value is string => Boolean(value));

  const { data: catalogData, error: catalogError } =
    playerCatalogIds.length > 0
      ? await supabase
          .from("player_catalog")
          .select(
            "id,fpl_id,web_name,full_name,fpl_team_id,fpl_position_id,price,photo,form,status,news,selected_by_percent,chance_of_playing_next_round,total_points,transfers_in,transfers_out",
          )
          .in("id", playerCatalogIds)
      : { data: [], error: null };

  if (catalogError) {
    throw catalogError;
  }

  const playerCatalog = (catalogData ?? []) as PlayerCatalogRow[];
  const teamIds = Array.from(
    new Set(
      playerCatalog
        .map((row) => row.fpl_team_id)
        .filter((value): value is number => Number.isInteger(value)),
    ),
  );

  const { data: teamData, error: teamError } =
    teamIds.length > 0
      ? await supabase
          .from("teams")
          .select("fpl_id,name,short_name,api_payload")
          .in("fpl_id", teamIds)
      : { data: [], error: null };

  if (teamError) {
    throw teamError;
  }

  const catalogById = new Map(playerCatalog.map((row) => [row.id, row]));
  const teamByFplId = new Map(
    ((teamData ?? []) as TeamLookupRow[]).map((row) => [row.fpl_id, row]),
  );

  const historicalPlayers: Array<PlayerRecord | null> = historicalStats.map((row) => {
      const catalog =
        (row.player_catalog_id ? catalogById.get(row.player_catalog_id) : null) ??
        playerCatalog.find((entry) => entry.fpl_id === row.fpl_id) ??
        null;

      if (!catalog) {
        return null;
      }

      return {
        id: catalog.id,
        fpl_id: catalog.fpl_id,
        name: catalog.web_name ?? catalog.full_name ?? `Player ${catalog.fpl_id}`,
        full_name: catalog.full_name ?? catalog.web_name ?? `Player ${catalog.fpl_id}`,
        position: resolvePositionCode(catalog.fpl_position_id),
        team: resolveTeamDisplayName(teamByFplId.get(catalog.fpl_team_id ?? -1)),
        fpl_team_id: catalog.fpl_team_id,
        price: catalog.price ?? 0,
        photo: catalog.photo,
        gameweek: row.gameweek,
        total_points: catalog.total_points ?? row.total_points ?? 0,
        event_points: row.total_points ?? 0,
        minutes: row.minutes ?? 0,
        form: toFiniteNumber(catalog.form),
        selected_by_percent: toFiniteNumber(catalog.selected_by_percent),
        status: catalog.status,
        chance_of_playing_next_round: catalog.chance_of_playing_next_round,
      } satisfies PlayerRecord;
    });

  return historicalPlayers.filter((player): player is PlayerRecord => player !== null);
}

async function getSnapshotPlayerRecords(gameweek: number): Promise<PlayerRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select(playerSnapshotColumns)
    .eq("gameweek", gameweek)
    .order("event_points", { ascending: false })
    .order("total_points", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const snapshotPlayers = (data ?? []) as PlayerRecord[];
  const teamIds = Array.from(
    new Set(
      snapshotPlayers
        .map((player) => player.fpl_team_id)
        .filter((value): value is number => Number.isInteger(value)),
    ),
  );

  if (teamIds.length === 0) {
    return snapshotPlayers;
  }

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("fpl_id,name,short_name,api_payload")
    .in("fpl_id", teamIds);

  if (teamError) {
    throw teamError;
  }

  const teamByFplId = new Map(
    ((teamData ?? []) as TeamLookupRow[]).map((row) => [row.fpl_id, row]),
  );

  return snapshotPlayers.map((player) => ({
    ...player,
    team: resolveTeamDisplayName(
      teamByFplId.get(player.fpl_team_id ?? -1),
      player.team,
    ),
  }));
}

async function getLatestSnapshotGameweek(): Promise<number | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select("gameweek")
    .order("gameweek", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const latestGameweekRow = data as { gameweek?: number | null } | null;
  const latestGameweek = latestGameweekRow?.gameweek ?? null;

  return Number.isInteger(latestGameweek) ? latestGameweek : null;
}

async function getPlayerRecordsForGameweek(gameweek: number): Promise<PlayerRecord[]> {
  const latestSnapshotGameweek = await getLatestSnapshotGameweek().catch(() => null);

  if (latestSnapshotGameweek !== null && gameweek < latestSnapshotGameweek) {
    const historicalPlayers = await getHistoricalPlayerRecords(gameweek);
    if (historicalPlayers.length > 0) {
      return historicalPlayers;
    }
  }

  const snapshotPlayers = await getSnapshotPlayerRecords(gameweek);
  if (snapshotPlayers.length > 0) {
    return snapshotPlayers;
  }

  return getHistoricalPlayerRecords(gameweek);
}

function buildAvailabilityInsight(players: PlayerInsightRow[]) {
  const candidate = players.find((player) => {
    const chance = player.chance_of_playing_next_round;
    const status = player.status?.toLowerCase() ?? "";
    return (chance !== null && chance < 100) || status !== "a" || Boolean(trimCopy(player.news));
  });

  if (!candidate) {
    return null;
  }

  const chance = candidate.chance_of_playing_next_round;
  const headline =
    chance !== null && chance < 100
      ? `${candidate.name} entra en vigilancia`
      : `${candidate.name} deja una alerta abierta`;
  const fallbackDescription =
    chance !== null && chance < 100
      ? `${candidate.team} llega con ${chance}% de probabilidad de jugar la siguiente jornada.`
      : `${candidate.team} aparece con estado ${candidate.status?.toUpperCase() ?? "pendiente"} en el feed oficial.`;

  return {
    id: `availability-${candidate.id}`,
    type: "availability" as const,
    title: headline,
    description: trimCopy(candidate.news) ?? fallbackDescription,
    probability: chance !== null ? `${chance}% juega` : undefined,
  };
}

function buildFormInsight(player: PlayerInsightRow | null) {
  if (!player) {
    return null;
  }

  const form = toFiniteNumber(player.form);
  const selectedByPercent = formatPercentage(player.selected_by_percent);

  return {
    id: `form-${player.id}`,
    type: "form" as const,
    title: `${player.name} llega encendido`,
    description: `${player.team} firma forma ${form?.toFixed(1) ?? "0.0"} y suma ${player.total_points ?? 0} puntos esta temporada.`,
    probability: selectedByPercent ? `${selectedByPercent} selección` : undefined,
  };
}

export async function getTopPlayers(gameweek: number) {
  const players = await getPlayerRecordsForGameweek(gameweek);
  return players.slice(0, 5);
}

export async function getRevelationPlayer(gameweek: number) {
  const players = await getPlayerRecordsForGameweek(gameweek);
  return players[0] ?? null;
}

async function getHomeContextFromSupabase() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("gameweeks")
    .select("fpl_id,name,deadline_time,is_current,is_next,finished")
    .order("fpl_id", { ascending: true });

  if (error) {
    throw error;
  }

  return buildHomeContext((data ?? []) as GameweekRow[]);
}

async function getLatestHistoricalGameweek(): Promise<number | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_gameweek_stats")
    .select("gameweek")
    .order("gameweek", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const latestGameweekRow = data as { gameweek?: number | null } | null;
  const latestGameweek = latestGameweekRow?.gameweek ?? null;

  return Number.isInteger(latestGameweek) ? latestGameweek : null;
}

export async function getHomeContext(): Promise<HomeContext> {
  const [latestHistoricalGameweek, latestSnapshotGameweek] = await Promise.all([
    getLatestHistoricalGameweek().catch(() => null),
    getLatestSnapshotGameweek().catch(() => null),
  ]);
  const latestSyncedGameweek = Math.max(
    latestHistoricalGameweek ?? 0,
    latestSnapshotGameweek ?? 0,
  ) || null;

  try {
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
    return {
      ...buildHomeContext(data.events),
      latestSyncedGameweek: latestSyncedGameweek ?? null,
    };
  } catch {
    const fallbackContext = await getHomeContextFromSupabase();
    return {
      ...fallbackContext,
      latestSyncedGameweek: latestSyncedGameweek ?? null,
    };
  }
}

export async function getCurrentGameweek() {
  const homeContext = await getHomeContext();
  return homeContext.currentGameweek;
}

export async function getNewsInsights(gameweek: number): Promise<HomeInsight[]> {
  const players = await getPlayerRecordsForGameweek(gameweek);
  const insightRows: PlayerInsightRow[] = players.map((player) => ({
    id: player.id,
    name: player.name,
    team: player.team,
    form: player.form,
    total_points: player.total_points,
    status: player.status,
    news: null,
    selected_by_percent: player.selected_by_percent,
    chance_of_playing_next_round: player.chance_of_playing_next_round,
    transfers_in: null,
    transfers_out: null,
  }));

  const bySelection = [...insightRows].sort(
    (left, right) =>
      (toFiniteNumber(right.selected_by_percent) ?? 0) -
      (toFiniteNumber(left.selected_by_percent) ?? 0),
  );
  const byForm = [...insightRows].sort(
    (left, right) => (right.form ?? 0) - (left.form ?? 0),
  );

  const insights: Array<HomeInsight | null> = [
    buildAvailabilityInsight(bySelection.slice(0, 20)),
    buildFormInsight(byForm[0] ?? null),
    null,
    null,
  ];

  return insights.filter((insight): insight is HomeInsight => insight !== null);
}
