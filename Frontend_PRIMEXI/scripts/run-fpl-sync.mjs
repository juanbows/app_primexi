import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = resolve(process.cwd());
const envFilePath = resolve(rootDir, ".env.local");
const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

async function loadEnvFile(filePath) {
  try {
    const fileContents = await readFile(filePath, "utf8");

    for (const line of fileContents.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

      if (!key || process.env[key]) {
        continue;
      }

      const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");
      process.env[key] = normalizedValue;
    }
  } catch {
    // Ignore missing local env files in CI where secrets come from the runner.
  }
}

function getRequiredEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing environment variable. Tried: ${keys.join(", ")}`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}.`);
  }

  return response.json();
}

async function resolveTargetGameweek() {
  const bootstrap = await fetchJson(FPL_BOOTSTRAP_URL, {
    headers: {
      accept: "application/json",
    },
  });

  const events = bootstrap.events ?? [];
  const currentEvent =
    events.find((event) => event.is_current) ??
    events.find((event) => event.is_next) ??
    [...events]
      .filter((event) => event.finished)
      .sort((left, right) => left.id - right.id)
      .at(-1) ??
    null;

  if (!currentEvent?.id) {
    throw new Error("Unable to determine the current FPL gameweek.");
  }

  return Number(currentEvent.id);
}

async function invokeFunction({ baseUrl, anonKey, functionName, payload }) {
  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Function ${functionName} failed with status ${response.status}: ${responseText}`,
    );
  }

  return responseText ? JSON.parse(responseText) : null;
}

async function main() {
  await loadEnvFile(envFilePath);

  const baseUrl = getRequiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRequiredEnv(
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  const historyBatchLimit = Number(process.env.FPL_HISTORY_LIMIT ?? "100");

  if (
    !Number.isInteger(historyBatchLimit) ||
    historyBatchLimit < 1 ||
    historyBatchLimit > 100
  ) {
    throw new Error("FPL_HISTORY_LIMIT must be an integer between 1 and 100.");
  }

  const targetGameweek = await resolveTargetGameweek();

  console.log(`Syncing FPL data for GW${targetGameweek}...`);

  const playersResult = await invokeFunction({
    baseUrl,
    anonKey,
    functionName: "sync-fpl-players",
    payload: {
      gameweek: targetGameweek,
    },
  });

  console.log(
    JSON.stringify(
      {
        step: "sync-fpl-players",
        gameweek: targetGameweek,
        synced_players: playersResult?.sync?.synced_players ?? null,
      },
      null,
      2,
    ),
  );

  let historyOffset = 0;
  let totalHistoryPlayers = null;
  let totalHistoryRows = 0;
  let totalSyncedPlayers = 0;

  while (true) {
    const historyResult = await invokeFunction({
      baseUrl,
      anonKey,
      functionName: "sync-fpl-player-history",
      payload: {
        limit: historyBatchLimit,
        offset: historyOffset,
      },
    });

    totalHistoryPlayers = historyResult?.total_players ?? totalHistoryPlayers;
    totalHistoryRows +=
      historyResult?.synced_rows ??
      historyResult?.synced_fixture_rows ??
      0;
    totalSyncedPlayers += historyResult?.synced_players ?? 0;

    console.log(
      JSON.stringify(
        {
          step: "sync-fpl-player-history",
          limit: historyBatchLimit,
          offset: historyOffset,
          synced_players: historyResult?.synced_players ?? null,
          synced_rows:
            historyResult?.synced_rows ??
            historyResult?.synced_fixture_rows ??
            null,
          total_players: historyResult?.total_players ?? null,
          has_more: historyResult?.has_more ?? false,
          next_offset: historyResult?.next_offset ?? null,
        },
        null,
        2,
      ),
    );

    if (!historyResult?.has_more || historyResult?.next_offset === null) {
      break;
    }

    historyOffset = historyResult.next_offset;
  }

  console.log(
    JSON.stringify(
      {
        step: "sync-fpl-player-history:complete",
        total_players: totalHistoryPlayers,
        total_synced_players: totalSyncedPlayers,
        total_synced_rows: totalHistoryRows,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
