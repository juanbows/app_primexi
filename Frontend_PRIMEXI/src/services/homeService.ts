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

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

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

export async function getTopPlayers(gameweek: number) {
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

  return (data ?? []) as PlayerRecord[];
}

export async function getRevelationPlayer(gameweek: number) {
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

  return (data as PlayerRecord | null) ?? null;
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

async function getLatestSyncedGameweek() {
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

  return Number.isInteger(data?.gameweek) ? data.gameweek : null;
}

export async function getHomeContext() {
  const latestSyncedGameweek = await getLatestSyncedGameweek().catch(() => null);

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
      latestSyncedGameweek,
    };
  } catch {
    const fallbackContext = await getHomeContextFromSupabase();
    return {
      ...fallbackContext,
      latestSyncedGameweek,
    };
  }
}

export async function getCurrentGameweek() {
  const homeContext = await getHomeContext();
  return homeContext.currentGameweek;
}

export async function getNewsInsights(gameweek: number) {
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

  return [
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
  ].filter((insight): insight is HomeInsight => insight !== null);
}
