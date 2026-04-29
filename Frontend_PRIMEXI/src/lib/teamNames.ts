type TeamNamePayload = {
  name?: string | null;
  short_name?: string | null;
};

function trimToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isPlaceholderTeamValue(value: string | null | undefined) {
  const trimmedValue = trimToNull(value);

  if (!trimmedValue) {
    return true;
  }

  return /^team\s+\d+$/i.test(trimmedValue) || trimmedValue.toUpperCase() === "TEA";
}

export function resolveTeamDisplayName({
  name,
  shortName,
  apiPayload,
  fallback = "Equipo",
}: {
  name?: string | null;
  shortName?: string | null;
  apiPayload?: TeamNamePayload | null;
  fallback?: string;
}) {
  const apiPayloadName = trimToNull(apiPayload?.name);
  if (apiPayloadName) {
    return apiPayloadName;
  }

  if (!isPlaceholderTeamValue(name)) {
    return trimToNull(name) ?? fallback;
  }

  const apiPayloadShortName = trimToNull(apiPayload?.short_name);
  if (apiPayloadShortName) {
    return apiPayloadShortName;
  }

  if (!isPlaceholderTeamValue(shortName)) {
    return trimToNull(shortName) ?? fallback;
  }

  return fallback;
}

export function resolveTeamShortName({
  name,
  shortName,
  apiPayload,
  fallback = "N/A",
}: {
  name?: string | null;
  shortName?: string | null;
  apiPayload?: TeamNamePayload | null;
  fallback?: string;
}) {
  const apiPayloadShortName = trimToNull(apiPayload?.short_name);
  if (apiPayloadShortName) {
    return apiPayloadShortName;
  }

  if (!isPlaceholderTeamValue(shortName)) {
    return trimToNull(shortName) ?? fallback;
  }

  const apiPayloadName = trimToNull(apiPayload?.name);
  if (apiPayloadName) {
    return apiPayloadName;
  }

  if (!isPlaceholderTeamValue(name)) {
    return trimToNull(name) ?? fallback;
  }

  return fallback;
}
