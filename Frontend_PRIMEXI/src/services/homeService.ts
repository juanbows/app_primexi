import { getOfficialTeamMap, resolveTeamName } from "@/lib/fplOfficial";
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

type RelatedTeamRow = {
  fpl_id: number | null;
  name: string | null;
  short_name: string | null;
};

type RelatedElementTypeRow = {
  app_code: string | null;
  singular_name: string | null;
};

type PlayerCatalogRow = {
  id: string;
  fpl_id: number;
  web_name: string | null;
  full_name: string | null;
  price: number | string | null;
  total_points: number | null;
  form: number | string | null;
  selected_by_percent: number | string | null;
  status: string | null;
  news: string | null;
  chance_of_playing_next_round: number | null;
  photo: string | null;
  teams: RelatedTeamRow | RelatedTeamRow[] | null;
  element_types:
    | RelatedElementTypeRow
    | RelatedElementTypeRow[]
    | null;
};

type PlayerFixtureStatsRow = {
  player_catalog_id: string | null;
  fpl_id: number | null;
  total_points: number | null;
  transfers_in: number | null;
  transfers_out: number | null;
};

type HistoricalPlayerAggregate = {
  playerCatalogId: string;
  fplId: number;
  eventPoints: number;
  transfersIn: number;
  transfersOut: number;
};

type OfficialTeamMap = Awaited<ReturnType<typeof getOfficialTeamMap>>;

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

const playerInsightColumns = `
  id,
  name,
  team,
  form,
  total_points,
  status,
  news,
  selected_by_percent,
  chance_of_playing_next_round,
  transfers_in,
  transfers_out
`;

const playerCatalogColumns = `
  id,
  fpl_id,
  web_name,
  full_name,
  price,
  total_points,
  form,
  selected_by_percent,
  status,
  news,
  chance_of_playing_next_round,
  photo,
  teams:teams!player_catalog_team_id_fkey (
    fpl_id,
    name,
    short_name
  ),
  element_types:element_types!player_catalog_element_type_id_fkey (
    app_code,
    singular_name
  )
`;

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function takeFirstRelation<T>(value: T | T[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
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

function formatCompactNumber(value: number | null) {
  return new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
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

function buildAvailabilityInsight(players: PlayerInsightRow[]) {
  const candidate = players.find((player) => {
    const chance = player.chance_of_playing_next_round;
    const status = player.status?.toLowerCase() ?? "";
    return (
      (chance !== null && chance < 100) ||
      status !== "a" ||
      Boolean(trimCopy(player.news))
    );
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

function buildTransferInInsight(player: PlayerInsightRow | null) {
  if (!player || !player.transfers_in) {
    return null;
  }

  const selectedByPercent = formatPercentage(player.selected_by_percent);

  return {
    id: `market-in-${player.id}`,
    type: "market_in" as const,
    title: `${player.name} lidera los fichajes`,
    description: `${formatCompactNumber(player.transfers_in)} managers lo metieron y ya va en ${selectedByPercent ?? "0.0%"} de selección.`,
  };
}

function buildTransferOutInsight(player: PlayerInsightRow | null) {
  if (!player || !player.transfers_out) {
    return null;
  }

  const selectedByPercent = formatPercentage(player.selected_by_percent);

  return {
    id: `market-out-${player.id}`,
    type: "market_out" as const,
    title: `${player.name} sale del radar`,
    description: `${formatCompactNumber(player.transfers_out)} salidas en el mercado y ${selectedByPercent ?? "0.0%"} de selección restante.`,
  };
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

async function getLatestPlayerSnapshotGameweek(): Promise<number | null> {
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

async function getLatestHistoricalGameweek(): Promise<number | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_fixture_stats")
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

async function getLatestSyncedGameweek(): Promise<number | null> {
  const [latestPlayerSnapshotGameweek, latestHistoricalGameweek] =
    await Promise.all([
      getLatestPlayerSnapshotGameweek().catch(() => null),
      getLatestHistoricalGameweek().catch(() => null),
    ]);

  const candidateGameweeks = [
    latestPlayerSnapshotGameweek,
    latestHistoricalGameweek,
  ].filter((gameweek): gameweek is number => Number.isInteger(gameweek));

  return candidateGameweeks.length > 0 ? Math.max(...candidateGameweeks) : null;
}

async function getHistoricalGameweekAggregates(
  gameweek: number,
): Promise<HistoricalPlayerAggregate[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_fixture_stats")
    .select("player_catalog_id,fpl_id,total_points,transfers_in,transfers_out")
    .eq("gameweek", gameweek)
    .range(0, 1999);

  if (error) {
    throw error;
  }

  const aggregates = new Map<string, HistoricalPlayerAggregate>();

  for (const row of (data ?? []) as PlayerFixtureStatsRow[]) {
    if (!row.player_catalog_id || !row.fpl_id) {
      continue;
    }

    const playerCatalogId = String(row.player_catalog_id);
    const currentAggregate = aggregates.get(playerCatalogId) ?? {
      playerCatalogId,
      fplId: Number(row.fpl_id),
      eventPoints: 0,
      transfersIn: 0,
      transfersOut: 0,
    };

    currentAggregate.eventPoints += row.total_points ?? 0;
    currentAggregate.transfersIn += row.transfers_in ?? 0;
    currentAggregate.transfersOut += row.transfers_out ?? 0;

    aggregates.set(playerCatalogId, currentAggregate);
  }

  return Array.from(aggregates.values()).sort(
    (left, right) =>
      right.eventPoints - left.eventPoints ||
      right.transfersIn - left.transfersIn ||
      right.transfersOut - left.transfersOut ||
      left.fplId - right.fplId,
  );
}

async function getPlayerCatalogMap(playerCatalogIds: string[]) {
  if (playerCatalogIds.length === 0) {
    return new Map<string, PlayerCatalogRow>();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_catalog")
    .select(playerCatalogColumns)
    .in("id", playerCatalogIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as PlayerCatalogRow[]).map((player) => [player.id, player]),
  );
}

function buildHistoricalPlayerRecord(
  player: PlayerCatalogRow,
  aggregate: HistoricalPlayerAggregate,
  gameweek: number,
  officialTeamMap?: OfficialTeamMap | null,
): PlayerRecord {
  const relatedTeam = takeFirstRelation(player.teams);
  const relatedElementType = takeFirstRelation(player.element_types);
  const playerName = player.web_name ?? player.full_name ?? "Jugador";
  const fullName = player.full_name ?? playerName;

  return {
    id: player.id,
    fpl_id: player.fpl_id,
    name: playerName,
    full_name: fullName,
    position: relatedElementType?.app_code ?? "UNK",
    team: resolveTeamName(relatedTeam, officialTeamMap),
    price: player.price ?? 0,
    photo: player.photo,
    gameweek,
    total_points: player.total_points ?? 0,
    event_points: aggregate.eventPoints,
    minutes: null,
    form: toFiniteNumber(player.form),
    selected_by_percent: toFiniteNumber(player.selected_by_percent),
    status: player.status,
    chance_of_playing_next_round: player.chance_of_playing_next_round,
  };
}

async function getHistoricalPlayersForGameweek(
  gameweek: number,
  limit: number,
): Promise<PlayerRecord[]> {
  const aggregates = await getHistoricalGameweekAggregates(gameweek);

  if (aggregates.length === 0) {
    return [];
  }

  const topAggregates = aggregates.slice(0, limit);
  const playerCatalogMap = await getPlayerCatalogMap(
    topAggregates.map((aggregate) => aggregate.playerCatalogId),
  );
  const officialTeamMap = await getOfficialTeamMap().catch(() => null);

  return topAggregates
    .map((aggregate) => {
      const player = playerCatalogMap.get(aggregate.playerCatalogId);
      return player
        ? buildHistoricalPlayerRecord(
            player,
            aggregate,
            gameweek,
            officialTeamMap,
          )
        : null;
    })
    .filter((player): player is PlayerRecord => player !== null);
}

function buildHistoricalFormInsight(
  player: PlayerCatalogRow | null,
  aggregate: HistoricalPlayerAggregate | null,
  gameweek: number,
  officialTeamMap?: OfficialTeamMap | null,
) {
  if (!player || !aggregate) {
    return null;
  }

  const team = resolveTeamName(takeFirstRelation(player.teams), officialTeamMap);
  const selectedByPercent = formatPercentage(
    toFiniteNumber(player.selected_by_percent),
  );
  const playerName = player.web_name ?? player.full_name ?? "Jugador";

  return {
    id: `history-form-${player.id}-${gameweek}`,
    type: "form" as const,
    title: `${playerName} brillo en GW${gameweek}`,
    description: `${team} sumo ${aggregate.eventPoints} puntos en la jornada y hoy mantiene forma ${toFiniteNumber(player.form)?.toFixed(1) ?? "0.0"}.`,
    probability: selectedByPercent ? `${selectedByPercent} selección` : undefined,
  };
}

function buildHistoricalTransferInsight(
  player: PlayerCatalogRow | null,
  aggregate: HistoricalPlayerAggregate | null,
  gameweek: number,
  type: "market_in" | "market_out",
  officialTeamMap?: OfficialTeamMap | null,
) {
  if (!player || !aggregate) {
    return null;
  }

  const volume =
    type === "market_in" ? aggregate.transfersIn : aggregate.transfersOut;

  if (volume <= 0) {
    return null;
  }

  const team = resolveTeamName(takeFirstRelation(player.teams), officialTeamMap);
  const playerName = player.web_name ?? player.full_name ?? "Jugador";

  return {
    id: `${type}-${player.id}-${gameweek}`,
    type,
    title:
      type === "market_in"
        ? `${playerName} subio en el mercado`
        : `${playerName} perdio traccion`,
    description:
      type === "market_in"
        ? `${formatCompactNumber(volume)} entradas en GW${gameweek}. ${team} capitalizo ${aggregate.eventPoints} puntos esa fecha.`
        : `${formatCompactNumber(volume)} salidas en GW${gameweek}. ${team} cerro la jornada con ${aggregate.eventPoints} puntos de su parte.`,
  };
}

async function getHistoricalInsights(gameweek: number): Promise<HomeInsight[]> {
  const aggregates = await getHistoricalGameweekAggregates(gameweek);

  if (aggregates.length === 0) {
    return [];
  }

  const topPerformer = aggregates[0] ?? null;
  const topTransferIn =
    [...aggregates].sort((left, right) => right.transfersIn - left.transfersIn)[0] ??
    null;
  const topTransferOut =
    [...aggregates].sort(
      (left, right) => right.transfersOut - left.transfersOut,
    )[0] ?? null;
  const playerCatalogIds = Array.from(
    new Set(
      [topPerformer, topTransferIn, topTransferOut]
        .filter(
          (
            aggregate,
          ): aggregate is HistoricalPlayerAggregate => aggregate !== null,
        )
        .map((aggregate) => aggregate.playerCatalogId),
    ),
  );
  const playerCatalogMap = await getPlayerCatalogMap(playerCatalogIds);
  const officialTeamMap = await getOfficialTeamMap().catch(() => null);

  const insights: Array<HomeInsight | null> = [
    buildHistoricalFormInsight(
      topPerformer
        ? playerCatalogMap.get(topPerformer.playerCatalogId) ?? null
        : null,
      topPerformer,
      gameweek,
      officialTeamMap,
    ),
    buildHistoricalTransferInsight(
      topTransferIn
        ? playerCatalogMap.get(topTransferIn.playerCatalogId) ?? null
        : null,
      topTransferIn,
      gameweek,
      "market_in",
      officialTeamMap,
    ),
    buildHistoricalTransferInsight(
      topTransferOut
        ? playerCatalogMap.get(topTransferOut.playerCatalogId) ?? null
        : null,
      topTransferOut,
      gameweek,
      "market_out",
      officialTeamMap,
    ),
  ];

  return insights.filter((insight): insight is HomeInsight => insight !== null);
}

export async function getTopPlayers(gameweek: number) {
  const latestPlayerSnapshotGameweek =
    await getLatestPlayerSnapshotGameweek().catch(() => null);

  if (
    latestPlayerSnapshotGameweek !== null &&
    gameweek < latestPlayerSnapshotGameweek
  ) {
    return getHistoricalPlayersForGameweek(gameweek, 5);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select(playerSnapshotColumns)
    .eq("gameweek", gameweek)
    .order("event_points", { ascending: false })
    .order("total_points", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  const players = (data ?? []) as PlayerRecord[];

  if (players.length > 0 && players.some((player) => player.event_points !== null)) {
    return players;
  }

  return getHistoricalPlayersForGameweek(gameweek, 5);
}

export async function getRevelationPlayer(gameweek: number) {
  const latestPlayerSnapshotGameweek =
    await getLatestPlayerSnapshotGameweek().catch(() => null);

  if (
    latestPlayerSnapshotGameweek !== null &&
    gameweek < latestPlayerSnapshotGameweek
  ) {
    const players = await getHistoricalPlayersForGameweek(gameweek, 1);
    return players[0] ?? null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select(playerSnapshotColumns)
    .eq("gameweek", gameweek)
    .order("event_points", { ascending: false })
    .order("total_points", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const player = (data as PlayerRecord | null) ?? null;

  if (player && player.event_points !== null) {
    return player;
  }

  const historicalPlayers = await getHistoricalPlayersForGameweek(gameweek, 1);
  return historicalPlayers[0] ?? null;
}

export async function getHomeContext(): Promise<HomeContext> {
  const latestSyncedGameweek = await getLatestSyncedGameweek().catch(() => null);

  try {
    const response = await fetch(FPL_BOOTSTRAP_URL, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `FPL bootstrap request failed with status ${response.status}.`,
      );
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
  const latestPlayerSnapshotGameweek =
    await getLatestPlayerSnapshotGameweek().catch(() => null);

  if (
    latestPlayerSnapshotGameweek !== null &&
    gameweek < latestPlayerSnapshotGameweek
  ) {
    return getHistoricalInsights(gameweek);
  }

  const supabase = getSupabaseClient();
  const commonQuery = supabase
    .from("players")
    .select(playerInsightColumns)
    .eq("gameweek", gameweek);

  const [
    availabilityCandidatesResult,
    formResult,
    transferInResult,
    transferOutResult,
  ] = await Promise.all([
    commonQuery.order("selected_by_percent", { ascending: false }).limit(20),
    supabase
      .from("players")
      .select(playerInsightColumns)
      .eq("gameweek", gameweek)
      .order("form", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("players")
      .select(playerInsightColumns)
      .eq("gameweek", gameweek)
      .order("transfers_in", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("players")
      .select(playerInsightColumns)
      .eq("gameweek", gameweek)
      .order("transfers_out", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (availabilityCandidatesResult.error) {
    throw availabilityCandidatesResult.error;
  }

  if (formResult.error) {
    throw formResult.error;
  }

  if (transferInResult.error) {
    throw transferInResult.error;
  }

  if (transferOutResult.error) {
    throw transferOutResult.error;
  }

  const insights: Array<HomeInsight | null> = [
    buildAvailabilityInsight(
      (availabilityCandidatesResult.data ?? []) as PlayerInsightRow[],
    ),
    buildFormInsight((formResult.data ?? null) as PlayerInsightRow | null),
    buildTransferInInsight(
      (transferInResult.data ?? null) as PlayerInsightRow | null,
    ),
    buildTransferOutInsight(
      (transferOutResult.data ?? null) as PlayerInsightRow | null,
    ),
  ];

  const resolvedInsights = insights.filter(
    (insight): insight is HomeInsight => insight !== null,
  );

  if (resolvedInsights.length > 0) {
    return resolvedInsights;
  }

  return getHistoricalInsights(gameweek);
}
