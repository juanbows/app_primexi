export type TeamPlayerStatus = "fit" | "normal" | "doubt";
export type TeamPlayerPosition = "GK" | "DEF" | "MID" | "FWD";

export interface TeamPlayer {
  id: string;
  fplId: number;
  name: string;
  shortName: string;
  team: string;
  teamName: string;
  position: TeamPlayerPosition;
  xP: number;
  price: number;
  ownership: number;
  form: number;
  totalPoints: number;
  status: TeamPlayerStatus;
  chanceOfPlayingNextRound: number | null;
  isCaptain?: boolean;
  isVice?: boolean;
  nextFixture: string;
  fixtureDifficulty: 1 | 2 | 3 | 4 | 5;
  last5: number[];
  image?: string;
}

export interface TeamSlot {
  id: string;
  position: TeamPlayerPosition;
  player: TeamPlayer | null;
}

export const TEAM_FORMATION = "4-3-3";
export const FPL_BUDGET_CAP = 100;

export const teamFormationRows = [
  { label: "GK", count: 1, top: 87, start: 0 },
  { label: "DEF", count: 4, top: 67, start: 1 },
  { label: "MID", count: 3, top: 42, start: 5 },
  { label: "FWD", count: 3, top: 17, start: 8 },
] as const;

export const teamSlotPositions: TeamPlayerPosition[] = [
  "GK",
  "DEF",
  "DEF",
  "DEF",
  "DEF",
  "MID",
  "MID",
  "MID",
  "FWD",
  "FWD",
  "FWD",
];

export function buildEmptyTeamSlots(): TeamSlot[] {
  return teamSlotPositions.map((position, index) => ({
    id: `team-slot-${index + 1}-${position.toLowerCase()}`,
    position,
    player: null,
  }));
}
