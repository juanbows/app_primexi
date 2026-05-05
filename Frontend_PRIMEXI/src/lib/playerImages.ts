const PREMIER_LEAGUE_PHOTO_HOST = "resources.premierleague.com";
const PLAYER_PHOTO_BASE_URL =
  "https://resources.premierleague.com/premierleague/photos/players";
const PLAYER_PHOTO_FALLBACK_URL =
  "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";

const fplPhotoFilenamePattern = /^p?(\d+)(?:\.(?:png|jpe?g|webp))?$/i;
const fplPhotoPathPattern =
  /\/premierleague\/photos\/players\/(?:\d+x\d+\/)?p?(\d+)\.(?:png|jpe?g|webp)$/i;

export type PlayerPhotoSize = "40x40" | "110x140" | "250x250";

function extractFplPhotoCode(photo: string) {
  const trimmedPhoto = photo.trim();
  const filenameMatch = trimmedPhoto.match(fplPhotoFilenamePattern);

  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  try {
    const photoUrl = new URL(trimmedPhoto);

    if (photoUrl.hostname !== PREMIER_LEAGUE_PHOTO_HOST) {
      return null;
    }

    const pathMatch = photoUrl.pathname.match(fplPhotoPathPattern);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export function resolvePlayerPhotoUrl(
  photo: string | null | undefined,
  size: PlayerPhotoSize = "250x250",
) {
  const trimmedPhoto = photo?.trim();

  if (!trimmedPhoto) {
    return PLAYER_PHOTO_FALLBACK_URL;
  }

  const fplPhotoCode = extractFplPhotoCode(trimmedPhoto);

  if (fplPhotoCode) {
    return `${PLAYER_PHOTO_BASE_URL}/${size}/p${fplPhotoCode}.png`;
  }

  if (/^https?:\/\//i.test(trimmedPhoto)) {
    return trimmedPhoto;
  }

  return PLAYER_PHOTO_FALLBACK_URL;
}
