import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_SOURCE_URL =
  "https://es.whoscored.com/matches/1978406/live/europa-champions-league-2025-2026-paris-saint-germain-bayern-munich";
const MIRROR_PREFIX = "https://r.jina.ai/http://";

function parseArgs(argv) {
  const options = {
    sourceUrl: DEFAULT_SOURCE_URL,
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--out") {
      const nextValue = argv[index + 1];

      if (!nextValue) {
        throw new Error("Missing value for --out.");
      }

      options.outputPath = nextValue;
      index += 1;
      continue;
    }

    if (value.startsWith("--")) {
      throw new Error(`Unsupported option: ${value}`);
    }

    options.sourceUrl = value;
  }

  options.sourceUrl = normalizeSourceUrl(options.sourceUrl);

  return options;
}

function normalizeSourceUrl(value) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function buildMirrorUrl(sourceUrl) {
  return `${MIRROR_PREFIX}${sourceUrl}`;
}

async function fetchMirrorMarkdown(sourceUrl) {
  const mirrorUrl = buildMirrorUrl(sourceUrl);
  const response = await fetch(mirrorUrl, {
    headers: {
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch mirrored content. Status: ${response.status} ${response.statusText}`,
    );
  }

  const markdown = await response.text();

  if (!markdown.includes("## Cronología")) {
    throw new Error("The mirrored page does not contain the expected match timeline.");
  }

  return {
    mirrorUrl,
    markdown,
  };
}

function splitLines(markdown) {
  return markdown.split(/\r?\n/);
}

function extractTitle(lines) {
  const titleLine = lines.find((line) => line.startsWith("# "));
  return titleLine ? titleLine.slice(2).trim() : null;
}

function extractCompetition(lines) {
  const competitionLine = lines.find((line) => line.includes("Tournaments/"));

  if (!competitionLine) {
    return null;
  }

  const match = competitionLine.match(/\[([^\]]+)\]\(https:\/\/es\.whoscored\.com\/Regions\//);
  return match?.[1] ?? null;
}

function extractScoreMetadata(lines) {
  const scoreLine = lines.find(
    (line) =>
      line.includes("https://es.whoscored.com/teams/") &&
      /\)\d+\s*:\s*\d+\[/.test(line),
  );

  if (!scoreLine) {
    return {
      homeTeam: null,
      awayTeam: null,
      score: null,
      teamsById: {},
    };
  }

  const teamPattern =
    /\[(?<name>[^\]]+)\]\(https:\/\/es\.whoscored\.com\/teams\/(?<id>\d+)\/show\/[^)]+\)/g;
  const teamMatches = [...scoreLine.matchAll(teamPattern)];
  const scoreMatch = scoreLine.match(/(?<home>\d+)\s*:\s*(?<away>\d+)/);

  const [home, away] = teamMatches;
  const teamsById = {};

  if (home?.groups?.id && home?.groups?.name) {
    teamsById[home.groups.id] = home.groups.name.trim();
  }

  if (away?.groups?.id && away?.groups?.name) {
    teamsById[away.groups.id] = away.groups.name.trim();
  }

  return {
    homeTeam: home?.groups?.name?.trim() ?? null,
    awayTeam: away?.groups?.name?.trim() ?? null,
    score: scoreMatch
      ? {
          home: Number(scoreMatch.groups.home),
          away: Number(scoreMatch.groups.away),
        }
      : null,
    teamsById,
  };
}

function extractStatusMetadata(lines) {
  const statusLine = lines.find((line) => line.includes("Transcurrido:"));
  const summaryLine = lines.find((line) => line.startsWith("Descanso:"));
  const kickoffLine = lines.find((line) => line.startsWith("Comienzo:"));

  const halftimeMatch = summaryLine?.match(
    /Descanso:(?<home>\d+)\s*:\s*(?<away>\d+)\s+Final:(?<finalHome>\d+)\s*:\s*(?<finalAway>\d+)/,
  );
  const kickoffMatch = kickoffLine?.match(
    /Comienzo:(?<kickoff>\S+)\s+Fecha:(?<date>.+?)(?:!\[Image|$)/,
  );

  return {
    status: statusLine?.split("Transcurrido:").at(1)?.trim() ?? null,
    halftimeScore: halftimeMatch
      ? {
          home: Number(halftimeMatch.groups.home),
          away: Number(halftimeMatch.groups.away),
        }
      : null,
    finalScore: halftimeMatch
      ? {
          home: Number(halftimeMatch.groups.finalHome),
          away: Number(halftimeMatch.groups.finalAway),
        }
      : null,
    kickoff: kickoffMatch?.groups?.kickoff ?? null,
    matchDate: kickoffMatch?.groups?.date?.trim() ?? null,
    rawKickoffLine: kickoffLine ?? null,
  };
}

function extractVenueMetadata(lines) {
  const venueLine = lines.find((line) => line.includes("stadium_clmn_venue:"));

  if (!venueLine) {
    return {
      venue: null,
      attendance: null,
      referee: null,
    };
  }

  const venueMatch = venueLine.match(
    /stadium_clmn_venue:\s*(?<venue>.*?)\s+stadium_clmn_attend:\s*(?<attendance>.*?)\s+stadium_clmn_referee:\s*\[(?<referee>[^\]]+)\]/,
  );

  return {
    venue: venueMatch?.groups?.venue?.trim() ?? null,
    attendance: venueMatch?.groups?.attendance?.trim() ?? null,
    referee: venueMatch?.groups?.referee?.trim() ?? null,
  };
}

function extractKeyCommentaryLines(lines) {
  const followLiveIndex = lines.findIndex((line) => line.trim() === "Follow live");

  if (followLiveIndex === -1) {
    return [];
  }

  const sectionLines = lines.slice(followLiveIndex + 1);
  const commentaryEndIndex = sectionLines.findIndex((line) =>
    line.trimStart().startsWith("*   ![Image"),
  );

  if (commentaryEndIndex === -1) {
    return [];
  }

  return sectionLines.slice(0, commentaryEndIndex);
}

function parseMinuteToken(token) {
  const [base, added] = token.split("+").map((value) => Number(value));
  return Number.isFinite(added) ? base + added / 100 : base;
}

function cleanQualifiers(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function classifyEvent(description) {
  const normalizedDescription = description.toLowerCase();

  if (normalizedDescription.startsWith("¡gol! marca")) {
    return "goal";
  }

  if (normalizedDescription.includes("asiste a gol")) {
    return "assist";
  }

  if (normalizedDescription.includes("recibe una tarjeta amarilla")) {
    return "yellow_card";
  }

  if (normalizedDescription.includes("sale del campo")) {
    return "substitution_off";
  }

  if (normalizedDescription.includes("entra al campo")) {
    return "substitution_on";
  }

  if (normalizedDescription.includes("cambio de formación")) {
    return "formation_change";
  }

  if (normalizedDescription.includes("ajuste de formación")) {
    return "formation_adjustment";
  }

  if (normalizedDescription.includes("le da a la madera")) {
    return "woodwork";
  }

  if (normalizedDescription.includes("bloquea un tiro")) {
    return "shot_blocked";
  }

  if (normalizedDescription.includes("hace una entrada")) {
    return "tackle";
  }

  if (normalizedDescription.includes("gana un córner")) {
    return "corner_won";
  }

  if (
    normalizedDescription.includes("le para el tiro") ||
    normalizedDescription.includes("hace una parada")
  ) {
    return "save";
  }

  if (normalizedDescription.includes("acaba el segundo tiempo")) {
    return "match_end";
  }

  return "other";
}

function parseEventPayload(eventType, description) {
  const goalMatch = description.match(
    /^¡GOL! Marca (?<player>.+?)(?: , Asistido por (?<assistant>.+?))?(?: \((?<qualifiers>.+)\))?$/,
  );

  if (goalMatch) {
    return {
      player: goalMatch.groups.player.trim(),
      assistant: goalMatch.groups.assistant?.trim() ?? null,
      qualifiers: cleanQualifiers(goalMatch.groups.qualifiers),
    };
  }

  const assistMatch = description.match(
    /^(?<player>.+?) asiste a gol(?: \((?<qualifiers>.+)\))?$/,
  );

  if (assistMatch) {
    return {
      player: assistMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(assistMatch.groups.qualifiers),
    };
  }

  const yellowCardMatch = description.match(
    /^(?<player>.+?) recibe una tarjeta amarilla$/,
  );

  if (yellowCardMatch) {
    return {
      player: yellowCardMatch.groups.player.trim(),
    };
  }

  const substitutionOffMatch = description.match(/^(?<player>.+?) sale del campo$/);

  if (substitutionOffMatch) {
    return {
      player: substitutionOffMatch.groups.player.trim(),
    };
  }

  const substitutionOnMatch = description.match(/^(?<player>.+?) entra al campo$/);

  if (substitutionOnMatch) {
    return {
      player: substitutionOnMatch.groups.player.trim(),
    };
  }

  const formationMatch = description.match(
    /^(?:Cambio|Ajuste) de Formación \(Formaciones\) (?<formation>\d+)$/,
  );

  if (formationMatch) {
    return {
      formation: formationMatch.groups.formation,
    };
  }

  const blockedShotMatch = description.match(
    /^(?<player>.+?) bloquea un tiro(?: \((?<qualifiers>.+)\))?$/,
  );

  if (blockedShotMatch) {
    return {
      player: blockedShotMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(blockedShotMatch.groups.qualifiers),
    };
  }

  const tackleMatch = description.match(
    /^(?<player>.+?) hace una entrada pero no gana la posesión(?: \((?<qualifiers>.+)\))?$/,
  );

  if (tackleMatch) {
    return {
      player: tackleMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(tackleMatch.groups.qualifiers),
    };
  }

  const woodworkMatch = description.match(
    /^(?<player>.+?) le da a la madera(?: \((?<qualifiers>.+)\))?$/,
  );

  if (woodworkMatch) {
    return {
      player: woodworkMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(woodworkMatch.groups.qualifiers),
    };
  }

  const cornerMatch = description.match(
    /^(?<player>.+?) gana un córner a favor(?: \((?<qualifiers>.+)\))?$/,
  );

  if (cornerMatch) {
    return {
      player: cornerMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(cornerMatch.groups.qualifiers),
    };
  }

  const saveMatch = description.match(
    /^(?:A )?(?<player>.+?) le para el tiro(?: \((?<qualifiers>.+)\))?\s*$/,
  );

  if (saveMatch) {
    return {
      player: saveMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(saveMatch.groups.qualifiers),
    };
  }

  const keeperSaveMatch = description.match(
    /^(?<player>.+?) hace una parada(?: \((?<qualifiers>.+)\))?$/,
  );

  if (keeperSaveMatch) {
    return {
      player: keeperSaveMatch.groups.player.trim(),
      qualifiers: cleanQualifiers(keeperSaveMatch.groups.qualifiers),
    };
  }

  return {
    player: null,
    qualifiers: [],
  };
}

function parseCommentaryEvents(lines, teamsById) {
  const commentaryLines = extractKeyCommentaryLines(lines);
  const events = [];
  let activeTeamId = null;
  let lastImage = null;

  for (const rawLine of commentaryLines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith("![")) {
      lastImage = line;
      const teamMatch = line.match(/\/teams\/(?<teamId>\d+)\.png/);

      if (teamMatch?.groups?.teamId) {
        activeTeamId = teamMatch.groups.teamId;
      }

      continue;
    }

    const minuteMatch = line.match(/^(?<minute>\d+(?:\+\d+)?)(?<description>.*)$/);

    if (!minuteMatch) {
      continue;
    }

    const rawMinute = minuteMatch.groups.minute;
    const description = minuteMatch.groups.description.trim();
    const eventType = classifyEvent(description);
    const payload = parseEventPayload(eventType, description);

    events.push({
      minute: rawMinute,
      minuteValue: parseMinuteToken(rawMinute),
      type: eventType,
      teamId: activeTeamId,
      team: activeTeamId ? teamsById[activeTeamId] ?? null : null,
      description,
      image: lastImage,
      ...payload,
    });
  }

  return events.sort((left, right) => {
    if (left.minuteValue === right.minuteValue) {
      return left.description.localeCompare(right.description, "es");
    }

    return left.minuteValue - right.minuteValue;
  });
}

function buildResult(sourceUrl, mirrorUrl, markdown) {
  const lines = splitLines(markdown);
  const title = extractTitle(lines);
  const competition = extractCompetition(lines);
  const scoreMetadata = extractScoreMetadata(lines);
  const statusMetadata = extractStatusMetadata(lines);
  const venueMetadata = extractVenueMetadata(lines);
  const events = parseCommentaryEvents(lines, scoreMetadata.teamsById);

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    mirrorUrl,
    fetchStrategy: "r.jina.ai mirror",
    title,
    competition,
    match: {
      homeTeam: scoreMetadata.homeTeam,
      awayTeam: scoreMetadata.awayTeam,
      score: scoreMetadata.score,
      status: statusMetadata.status,
      halftimeScore: statusMetadata.halftimeScore,
      finalScore: statusMetadata.finalScore,
      kickoff: statusMetadata.kickoff,
      matchDate: statusMetadata.matchDate,
      venue: venueMetadata.venue,
      attendance: venueMetadata.attendance,
      referee: venueMetadata.referee,
    },
    events,
    totals: {
      events: events.length,
      goals: events.filter((event) => event.type === "goal").length,
      yellowCards: events.filter((event) => event.type === "yellow_card").length,
      substitutions:
        events.filter((event) => event.type === "substitution_off").length +
        events.filter((event) => event.type === "substitution_on").length,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { mirrorUrl, markdown } = await fetchMirrorMarkdown(options.sourceUrl);
  const result = buildResult(options.sourceUrl, mirrorUrl, markdown);
  const output = JSON.stringify(result, null, 2);

  if (options.outputPath) {
    const outputPath = resolve(process.cwd(), options.outputPath);
    await writeFile(outputPath, `${output}\n`, "utf8");
    console.log(`Scraping listo: ${outputPath}`);
    return;
  }

  console.log(output);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
