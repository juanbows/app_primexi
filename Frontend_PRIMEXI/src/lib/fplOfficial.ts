type OfficialBootstrapTeam = {
  id: number;
  name: string;
  short_name: string;
};

type FplBootstrapResponse = {
  teams?: OfficialBootstrapTeam[];
};

type TeamLike = {
  fpl_id?: number | null;
  name?: string | null;
  short_name?: string | null;
};

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

let officialTeamMapPromise: Promise<Map<number, OfficialBootstrapTeam>> | null =
  null;

export function isPlaceholderTeamName(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase() ?? "";

  return (
    normalizedValue === "" ||
    normalizedValue === "equipo" ||
    normalizedValue === "n/a" ||
    /^team\s+\d+$/.test(normalizedValue)
  );
}

export function isPlaceholderTeamShortName(value: string | null | undefined) {
  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return (
    normalizedValue === "" ||
    normalizedValue === "N/A" ||
    normalizedValue === "TEA"
  );
}

export async function getOfficialTeamMap() {
  if (!officialTeamMapPromise) {
    officialTeamMapPromise = fetch(FPL_BOOTSTRAP_URL, {
      headers: {
        accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `FPL bootstrap request failed with status ${response.status}.`,
          );
        }

        const payload = (await response.json()) as FplBootstrapResponse;
        return new Map(
          (payload.teams ?? []).map((team) => [team.id, team] as const),
        );
      })
      .catch((error) => {
        officialTeamMapPromise = null;
        throw error;
      });
  }

  return officialTeamMapPromise;
}

export function resolveTeamName(
  team: TeamLike | null | undefined,
  officialTeamMap?: Map<number, OfficialBootstrapTeam> | null,
) {
  const officialTeam =
    team?.fpl_id && officialTeamMap ? officialTeamMap.get(team.fpl_id) : null;

  if (officialTeam?.name) {
    return officialTeam.name;
  }

  if (!isPlaceholderTeamName(team?.name)) {
    return team?.name?.trim() ?? "Equipo";
  }

  if (officialTeam?.short_name) {
    return officialTeam.short_name;
  }

  if (!isPlaceholderTeamShortName(team?.short_name)) {
    return team?.short_name?.trim() ?? "Equipo";
  }

  return "Equipo";
}

export function resolveTeamShortName(
  team: TeamLike | null | undefined,
  officialTeamMap?: Map<number, OfficialBootstrapTeam> | null,
) {
  const officialTeam =
    team?.fpl_id && officialTeamMap ? officialTeamMap.get(team.fpl_id) : null;

  if (officialTeam?.short_name) {
    return officialTeam.short_name;
  }

  if (!isPlaceholderTeamShortName(team?.short_name)) {
    return team?.short_name?.trim() ?? "N/A";
  }

  if (!isPlaceholderTeamName(team?.name)) {
    return team?.name?.trim() ?? "N/A";
  }

  return "N/A";
}
