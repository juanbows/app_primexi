export type StatusLevel = "low" | "medium" | "high";

export interface CountdownData {
  gameweek: number;
  deadlineTime: string;
}

export interface HomeSummary {
  fixture: StatusLevel;
  rotation: StatusLevel;
  injuries: StatusLevel;
}

export interface TopPlayerMatchStats {
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  xG: number;
  xA: number;
  bonus: number;
  bps: number;
}

export interface TopPlayer {
  id: number;
  name: string;
  team: string;
  points: number;
  achievement: string;
  position: number;
  image: string;
  matchStats: TopPlayerMatchStats;
}

export interface RevelationPlayerData {
  name: string;
  team: string;
  points: number;
  achievement: string;
  trend: {
    lastGWs: number[];
    xG: number[];
    minutes: number[];
  };
  reason: string;
}

export type NewsInsightType = "injury" | "form" | "prediction" | "confirmed";
export type NewsIconKey = "activity" | "trending-up" | "info" | "sparkles";
export type NewsAccent = "cyan" | "green" | "pink";

export interface NewsInsight {
  id: number;
  type: NewsInsightType;
  title: string;
  description: string;
  fullText: string;
  probability?: string;
  icon: NewsIconKey;
  accent: NewsAccent;
}

export type TeamPlayerStatus = "fit" | "normal" | "doubt";
export type TeamPlayerPosition = "GK" | "DEF" | "MID" | "FWD";

export interface TeamPlayer {
  id: number;
  name: string;
  shortName: string;
  team: string;
  position: TeamPlayerPosition;
  xP: number;
  price: number;
  ownership: number;
  form: number;
  status: TeamPlayerStatus;
  isCaptain?: boolean;
  isVice?: boolean;
  nextFixture: string;
  fixtureDifficulty: 1 | 2 | 3 | 4 | 5;
  last5: number[];
  image?: string;
}

export interface TeamFormationData {
  formation: string;
  squad: TeamPlayer[];
  last5Form: number[];
}

export interface TransferRecommendation {
  outPlayer: { name: string; team: string; price: number };
  inPlayer: { name: string; team: string; price: number };
  xpGain: number;
  priceDiff: number;
}

export interface TransferSellCandidate {
  id: string;
  name: string;
  team: string;
  xp: number;
  difficulty: "green" | "amber" | "red";
}

export interface TransferReplacement {
  id: string;
  name: string;
  price: number;
  xp: number;
  xpDiff: number;
}

export interface TransfersViewData {
  budget: number;
  freeTransfers: number;
  baselineXp: number;
  recommended: TransferRecommendation;
  sellCandidates: TransferSellCandidate[];
  replacementMap: Record<string, TransferReplacement[]>;
}

export interface ManagerTransfer {
  inPlayer: string;
  outPlayer: string;
}

export interface ManagerProfile {
  initials: string;
  managerName: string;
  teamName: string;
  formLabel: string;
  overallRank: string;
  overallPopulation: string;
  privateLeagueRank: string;
  totalPoints: number;
  currentGameweekPoints: number;
  currentCaptain: string;
  currentCaptainNote: string;
  recentTransfers: ManagerTransfer[];
}

export const initialGameweek = 32;

export const countdownData: CountdownData = {
  gameweek: initialGameweek,
  deadlineTime: "2026-04-10T17:30:00Z",
};

export function getHomeSummaryForGameweek(gameweek: number): HomeSummary {
  return {
    fixture: gameweek % 2 === 0 ? "low" : "medium",
    rotation: gameweek % 3 === 0 ? "high" : "low",
    injuries: gameweek % 4 === 0 ? "high" : "low",
  };
}

const topPlayersRotation: TopPlayer[][] = [
  [
    {
      id: 1,
      name: "Foden",
      team: "MCI",
      points: 18,
      achievement: "Hat trick y MVP",
      position: 1,
      image: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
      matchStats: {
        minutes: 90,
        goals: 3,
        assists: 0,
        shots: 6,
        keyPasses: 2,
        xG: 1.9,
        xA: 0.3,
        bonus: 3,
        bps: 42,
      },
    },
    {
      id: 2,
      name: "Isak",
      team: "NEW",
      points: 15,
      achievement: "Doble Gol",
      position: 2,
      image: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=400",
      matchStats: {
        minutes: 90,
        goals: 2,
        assists: 0,
        shots: 5,
        keyPasses: 1,
        xG: 1.4,
        xA: 0.1,
        bonus: 3,
        bps: 38,
      },
    },
    {
      id: 3,
      name: "Palmer",
      team: "CHE",
      points: 14,
      achievement: "Gol y Asistencia",
      position: 3,
      image: "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
      matchStats: {
        minutes: 88,
        goals: 1,
        assists: 1,
        shots: 3,
        keyPasses: 4,
        xG: 0.6,
        xA: 0.7,
        bonus: 2,
        bps: 34,
      },
    },
    {
      id: 4,
      name: "Salah",
      team: "LIV",
      points: 13,
      achievement: "Gol y Assist",
      position: 4,
      image: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
      matchStats: {
        minutes: 90,
        goals: 1,
        assists: 1,
        shots: 4,
        keyPasses: 3,
        xG: 0.7,
        xA: 0.5,
        bonus: 2,
        bps: 31,
      },
    },
    {
      id: 5,
      name: "Saka",
      team: "ARS",
      points: 12,
      achievement: "Gol de MVP",
      position: 5,
      image: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=400",
      matchStats: {
        minutes: 90,
        goals: 1,
        assists: 0,
        shots: 2,
        keyPasses: 2,
        xG: 0.5,
        xA: 0.2,
        bonus: 1,
        bps: 28,
      },
    },
  ],
  [
    {
      id: 1,
      name: "Haaland",
      team: "MCI",
      points: 20,
      achievement: "Triplete Historico",
      position: 1,
      image: "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
      matchStats: {
        minutes: 90,
        goals: 3,
        assists: 0,
        shots: 7,
        keyPasses: 1,
        xG: 2.2,
        xA: 0.1,
        bonus: 3,
        bps: 44,
      },
    },
    {
      id: 2,
      name: "Salah",
      team: "LIV",
      points: 16,
      achievement: "Doblete",
      position: 2,
      image: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
      matchStats: {
        minutes: 90,
        goals: 2,
        assists: 0,
        shots: 5,
        keyPasses: 2,
        xG: 1.3,
        xA: 0.2,
        bonus: 2,
        bps: 36,
      },
    },
    {
      id: 3,
      name: "Son",
      team: "TOT",
      points: 14,
      achievement: "Gol y 2 Assists",
      position: 3,
      image: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=400",
      matchStats: {
        minutes: 88,
        goals: 1,
        assists: 2,
        shots: 4,
        keyPasses: 5,
        xG: 0.7,
        xA: 1.1,
        bonus: 3,
        bps: 39,
      },
    },
    {
      id: 4,
      name: "Watkins",
      team: "AVL",
      points: 13,
      achievement: "Doblete Crucial",
      position: 4,
      image: "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
      matchStats: {
        minutes: 90,
        goals: 2,
        assists: 0,
        shots: 5,
        keyPasses: 1,
        xG: 1.5,
        xA: 0.1,
        bonus: 2,
        bps: 33,
      },
    },
    {
      id: 5,
      name: "Foden",
      team: "MCI",
      points: 11,
      achievement: "Asistencias",
      position: 5,
      image: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
      matchStats: {
        minutes: 90,
        goals: 0,
        assists: 2,
        shots: 2,
        keyPasses: 4,
        xG: 0.3,
        xA: 0.8,
        bonus: 1,
        bps: 27,
      },
    },
  ],
  [
    {
      id: 1,
      name: "Palmer",
      team: "CHE",
      points: 19,
      achievement: "Hat trick perfecto",
      position: 1,
      image: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=400",
      matchStats: {
        minutes: 90,
        goals: 3,
        assists: 0,
        shots: 6,
        keyPasses: 3,
        xG: 1.8,
        xA: 0.2,
        bonus: 3,
        bps: 41,
      },
    },
    {
      id: 2,
      name: "Isak",
      team: "NEW",
      points: 14,
      achievement: "Doblete",
      position: 2,
      image: "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
      matchStats: {
        minutes: 90,
        goals: 2,
        assists: 0,
        shots: 4,
        keyPasses: 1,
        xG: 1.2,
        xA: 0.1,
        bonus: 2,
        bps: 32,
      },
    },
    {
      id: 3,
      name: "Bowen",
      team: "WHU",
      points: 13,
      achievement: "Gol y Assist",
      position: 3,
      image: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
      matchStats: {
        minutes: 90,
        goals: 1,
        assists: 1,
        shots: 3,
        keyPasses: 3,
        xG: 0.6,
        xA: 0.6,
        bonus: 2,
        bps: 30,
      },
    },
    {
      id: 4,
      name: "De Bruyne",
      team: "MCI",
      points: 12,
      achievement: "3 Asistencias",
      position: 4,
      image: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=400",
      matchStats: {
        minutes: 82,
        goals: 0,
        assists: 3,
        shots: 2,
        keyPasses: 6,
        xG: 0.2,
        xA: 1.4,
        bonus: 3,
        bps: 40,
      },
    },
    {
      id: 5,
      name: "Rashford",
      team: "MUN",
      points: 11,
      achievement: "Gol clave",
      position: 5,
      image: "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
      matchStats: {
        minutes: 90,
        goals: 1,
        assists: 0,
        shots: 3,
        keyPasses: 2,
        xG: 0.7,
        xA: 0.2,
        bonus: 1,
        bps: 26,
      },
    },
  ],
];

export function getTopPlayersForGameweek(gameweek: number): TopPlayer[] {
  const index =
    ((gameweek - 23) % topPlayersRotation.length + topPlayersRotation.length) %
    topPlayersRotation.length;
  return topPlayersRotation[index];
}

const revelationRotation: RevelationPlayerData[] = [
  {
    name: "Gordon",
    team: "NEW",
    points: 12,
    achievement: "Impacto Sorpresivo y xG Alto",
    trend: {
      lastGWs: [2, 3, 12],
      xG: [0.2, 0.4, 0.9],
      minutes: [64, 71, 90],
    },
    reason: "Subida fuerte de xG y minutos completos esta jornada.",
  },
  {
    name: "Mbeumo",
    team: "BRE",
    points: 13,
    achievement: "Doblete inesperado",
    trend: {
      lastGWs: [4, 5, 13],
      xG: [0.3, 0.5, 1.1],
      minutes: [70, 78, 90],
    },
    reason: "Aumento de minutos + xG explosivo en el ultimo partido.",
  },
  {
    name: "Paqueta",
    team: "WHU",
    points: 11,
    achievement: "Gol y dominio del medio",
    trend: {
      lastGWs: [3, 4, 11],
      xG: [0.1, 0.2, 0.6],
      minutes: [62, 74, 88],
    },
    reason: "Mejor volumen ofensivo y rol mas avanzado.",
  },
];

export function getRevelationForGameweek(gameweek: number): RevelationPlayerData {
  const index =
    ((gameweek - 23) % revelationRotation.length + revelationRotation.length) %
    revelationRotation.length;
  return revelationRotation[index];
}

export const newsInsights: NewsInsight[] = [
  {
    id: 1,
    type: "prediction",
    title: "De Bruyne - Alta Probabilidad de Jugar",
    description: "IA predice 90% de probabilidad de titular",
    fullText:
      "El modelo combino tendencia de minutos, carga de entreno y reportes del staff. Senales positivas en la semana elevan la probabilidad de titularidad. Riesgo principal: rotacion tardia si el marcador es comodo.",
    probability: "90%",
    icon: "activity",
    accent: "cyan",
  },
  {
    id: 2,
    type: "confirmed",
    title: "Solanke Confirmado",
    description: "+135 managers lo ficharon en las ultimas 24h",
    fullText:
      "Confirmado en el once inicial segun reporte oficial. Opcion solida para capitania diferencial: buen fixture y alta forma reciente. Se espera participacion completa.",
    icon: "trending-up",
    accent: "green",
  },
  {
    id: 3,
    type: "injury",
    title: "Alerta: Salah Duda",
    description: "Posible rotacion segun analisis del equipo",
    fullText:
      "Senales mixtas en entrenamientos y carga acumulada. El staff podria limitar minutos si el equipo toma ventaja temprano. Plan recomendado: preparar un sustituto directo en el banquillo.",
    icon: "info",
    accent: "pink",
  },
  {
    id: 4,
    type: "form",
    title: "Palmer en Racha",
    description: "4 goles en los ultimos 3 partidos",
    fullText:
      "Esta generando mas tiros dentro del area y participa en acciones clave. El xG por 90 se disparo, y su rol a balon parado aumento.",
    icon: "sparkles",
    accent: "cyan",
  },
];

export const teamFormationMock: TeamFormationData = {
  formation: "4-3-3",
  squad: [
    {
      id: 1,
      name: "David Raya",
      shortName: "Raya",
      team: "ARS",
      position: "GK",
      xP: 4.8,
      price: 5.7,
      ownership: 28,
      form: 5.2,
      status: "fit",
      nextFixture: "BOU (H)",
      fixtureDifficulty: 2,
      last5: [6, 2, 8, 1, 6],
    },
    {
      id: 2,
      name: "Trent Alexander-Arnold",
      shortName: "TAA",
      team: "LIV",
      position: "DEF",
      xP: 6.1,
      price: 7.2,
      ownership: 42,
      form: 6.8,
      status: "fit",
      nextFixture: "WOL (H)",
      fixtureDifficulty: 2,
      last5: [9, 2, 10, 6, 5],
    },
    {
      id: 3,
      name: "William Saliba",
      shortName: "Saliba",
      team: "ARS",
      position: "DEF",
      xP: 5.3,
      price: 6.1,
      ownership: 35,
      form: 5.0,
      status: "fit",
      nextFixture: "BOU (H)",
      fixtureDifficulty: 2,
      last5: [6, 6, 2, 8, 2],
    },
    {
      id: 4,
      name: "Gabriel Magalhaes",
      shortName: "Gabriel",
      team: "ARS",
      position: "DEF",
      xP: 5.5,
      price: 6.3,
      ownership: 30,
      form: 5.4,
      status: "normal",
      nextFixture: "BOU (H)",
      fixtureDifficulty: 2,
      last5: [2, 8, 6, 2, 6],
    },
    {
      id: 5,
      name: "Pedro Porro",
      shortName: "Porro",
      team: "TOT",
      position: "DEF",
      xP: 4.9,
      price: 5.6,
      ownership: 18,
      form: 4.6,
      status: "doubt",
      nextFixture: "MCI (A)",
      fixtureDifficulty: 5,
      last5: [1, 6, 2, 1, 8],
    },
    {
      id: 6,
      name: "Mohamed Salah",
      shortName: "Salah",
      team: "LIV",
      position: "MID",
      xP: 8.9,
      price: 13.2,
      ownership: 72,
      form: 9.2,
      status: "fit",
      isCaptain: true,
      nextFixture: "WOL (H)",
      fixtureDifficulty: 2,
      last5: [13, 6, 15, 8, 10],
    },
    {
      id: 7,
      name: "Bukayo Saka",
      shortName: "Saka",
      team: "ARS",
      position: "MID",
      xP: 7.4,
      price: 10.1,
      ownership: 50,
      form: 7.0,
      status: "doubt",
      nextFixture: "BOU (H)",
      fixtureDifficulty: 2,
      last5: [2, 12, 5, 8, 3],
    },
    {
      id: 8,
      name: "Cole Palmer",
      shortName: "Palmer",
      team: "CHE",
      position: "MID",
      xP: 7.8,
      price: 10.8,
      ownership: 55,
      form: 8.1,
      status: "fit",
      isVice: true,
      nextFixture: "EVE (H)",
      fixtureDifficulty: 2,
      last5: [10, 8, 14, 3, 9],
    },
    {
      id: 9,
      name: "Erling Haaland",
      shortName: "Haaland",
      team: "MCI",
      position: "FWD",
      xP: 8.2,
      price: 14.5,
      ownership: 80,
      form: 8.8,
      status: "fit",
      nextFixture: "TOT (H)",
      fixtureDifficulty: 3,
      last5: [12, 5, 15, 2, 8],
    },
    {
      id: 10,
      name: "Alexander Isak",
      shortName: "Isak",
      team: "NEW",
      position: "FWD",
      xP: 7.6,
      price: 9.0,
      ownership: 45,
      form: 7.5,
      status: "fit",
      nextFixture: "BRE (A)",
      fixtureDifficulty: 3,
      last5: [8, 10, 2, 13, 6],
    },
    {
      id: 11,
      name: "Ollie Watkins",
      shortName: "Watkins",
      team: "AVL",
      position: "FWD",
      xP: 6.4,
      price: 8.2,
      ownership: 25,
      form: 5.9,
      status: "normal",
      nextFixture: "NFO (A)",
      fixtureDifficulty: 4,
      last5: [6, 2, 8, 5, 3],
    },
  ],
  last5Form: [58, 45, 67, 42, 55],
};

export const transfersViewMock: TransfersViewData = {
  budget: 1.5,
  freeTransfers: 1,
  baselineXp: 52.4,
  recommended: {
    outPlayer: { name: "Darwin Nunez", team: "LIV", price: 7.6 },
    inPlayer: { name: "Ollie Watkins", team: "AVL", price: 8.1 },
    xpGain: 3.2,
    priceDiff: 0.5,
  },
  sellCandidates: [
    { id: "p1", name: "Darwin Nunez", team: "LIV", xp: 3.4, difficulty: "red" },
    { id: "p2", name: "Jarrod Bowen", team: "WHU", xp: 3.9, difficulty: "amber" },
    { id: "p3", name: "Joachim Andersen", team: "CRY", xp: 2.8, difficulty: "red" },
    { id: "p4", name: "Anthony Gordon", team: "NEW", xp: 4.6, difficulty: "green" },
    { id: "p5", name: "Eberechi Eze", team: "CRY", xp: 4.1, difficulty: "amber" },
    { id: "p6", name: "James Tarkowski", team: "EVE", xp: 3.1, difficulty: "red" },
  ],
  replacementMap: {
    p1: [
      { id: "r1", name: "Ollie Watkins", price: 8.1, xp: 6.8, xpDiff: 3.4 },
      { id: "r2", name: "Dominic Solanke", price: 7.2, xp: 6.1, xpDiff: 2.7 },
      { id: "r3", name: "Matheus Cunha", price: 6.6, xp: 5.5, xpDiff: 2.1 },
      { id: "r4", name: "Yoane Wissa", price: 6.2, xp: 5.2, xpDiff: 1.8 },
      { id: "r5", name: "Ivan Toney", price: 8.4, xp: 6.3, xpDiff: 2.9 },
    ],
    p2: [
      { id: "r6", name: "Cole Palmer", price: 10.6, xp: 7.3, xpDiff: 3.4 },
      { id: "r7", name: "Bukayo Saka", price: 9.8, xp: 6.7, xpDiff: 2.8 },
      { id: "r8", name: "Phil Foden", price: 9.2, xp: 6.4, xpDiff: 2.5 },
      { id: "r9", name: "Anthony Gordon", price: 6.4, xp: 5.1, xpDiff: 1.2 },
      { id: "r10", name: "Mbeumo", price: 7.1, xp: 5.5, xpDiff: 1.6 },
    ],
    p3: [
      { id: "r11", name: "Pedro Porro", price: 5.8, xp: 5.2, xpDiff: 2.4 },
      { id: "r12", name: "Gabriel", price: 5.0, xp: 4.8, xpDiff: 2.0 },
      { id: "r13", name: "Saliba", price: 5.6, xp: 5.0, xpDiff: 2.2 },
      { id: "r14", name: "Udogie", price: 4.9, xp: 4.6, xpDiff: 1.8 },
      { id: "r15", name: "Trippier", price: 6.3, xp: 5.1, xpDiff: 2.3 },
    ],
    p4: [
      { id: "r16", name: "Cole Palmer", price: 10.6, xp: 7.3, xpDiff: 2.7 },
      { id: "r17", name: "Luis Diaz", price: 7.5, xp: 5.8, xpDiff: 1.2 },
      { id: "r18", name: "Maddison", price: 7.9, xp: 5.9, xpDiff: 1.3 },
      { id: "r19", name: "Eze", price: 6.7, xp: 5.2, xpDiff: 0.6 },
      { id: "r20", name: "Mitoma", price: 6.6, xp: 5.1, xpDiff: 0.5 },
    ],
    p5: [
      { id: "r21", name: "Foden", price: 9.2, xp: 6.4, xpDiff: 2.3 },
      { id: "r22", name: "Mbeumo", price: 7.1, xp: 5.5, xpDiff: 1.4 },
      { id: "r23", name: "Gordon", price: 6.4, xp: 5.1, xpDiff: 1.0 },
      { id: "r24", name: "Bowen", price: 7.8, xp: 4.6, xpDiff: 0.5 },
      { id: "r25", name: "Elliot Anderson", price: 5.2, xp: 4.4, xpDiff: 0.3 },
    ],
    p6: [
      { id: "r26", name: "Branthwaite", price: 4.7, xp: 4.2, xpDiff: 1.1 },
      { id: "r27", name: "Kilman", price: 4.6, xp: 4.1, xpDiff: 1.0 },
      { id: "r28", name: "Colwill", price: 4.5, xp: 4.0, xpDiff: 0.9 },
      { id: "r29", name: "Dunk", price: 4.8, xp: 4.3, xpDiff: 1.2 },
      { id: "r30", name: "Maguire", price: 4.4, xp: 3.9, xpDiff: 0.8 },
    ],
  },
};

export const managerProfileMock: ManagerProfile = {
  initials: "NN",
  managerName: "Nicolas Suarez",
  teamName: "Midnight XI FC",
  formLabel: "Top 10% form",
  overallRank: "48,320",
  overallPopulation: "de 11.2M",
  privateLeagueRank: "#3",
  totalPoints: 1687,
  currentGameweekPoints: 67,
  currentCaptain: "Erling Haaland",
  currentCaptainNote: "Decision clave esta jornada",
  recentTransfers: [
    { inPlayer: "Ollie Watkins", outPlayer: "Darwin Nunez" },
    { inPlayer: "Cole Palmer", outPlayer: "Jarrod Bowen" },
    { inPlayer: "William Saliba", outPlayer: "Joachim Andersen" },
  ],
};

export interface RankingEvolutionEntry {
  gameweek: number;
  rank: number;
}

export interface RankingComparison {
  globalAverage: number;
  leagueAverage: number;
}

export interface ProfileRankingData {
  evolution: RankingEvolutionEntry[];
  percentile: string;
  comparison: RankingComparison;
  summaryNote: string;
}

export interface ProfileRankingMock {
  global: ProfileRankingData;
  league: ProfileRankingData;
}

export const profileRankingMock: ProfileRankingMock = {
  global: {
    evolution: [
      { gameweek: 27, rank: 81234 },
      { gameweek: 28, rank: 76890 },
      { gameweek: 29, rank: 70612 },
      { gameweek: 30, rank: 63420 },
      { gameweek: 31, rank: 51210 },
      { gameweek: 32, rank: 48320 },
    ],
    percentile: "Top 6%",
    comparison: {
      globalAverage: 54,
      leagueAverage: 62,
    },
    summaryNote: "2.3 pts por encima del promedio global",
  },
  league: {
    evolution: [
      { gameweek: 27, rank: 12 },
      { gameweek: 28, rank: 9 },
      { gameweek: 29, rank: 6 },
      { gameweek: 30, rank: 5 },
      { gameweek: 31, rank: 4 },
      { gameweek: 32, rank: 3 },
    ],
    percentile: "Top 15%",
    comparison: {
      globalAverage: 54,
      leagueAverage: 65,
    },
    summaryNote: "muy cerca del Top 3 en la liga privada",
  },
};

export interface GameweekHistoryEntry {
  gameweek: number;
  points: number;
  captain: string;
  hit?: string;
  benchPoints: number;
}

export const profileGameweeksMock: GameweekHistoryEntry[] = [
  { gameweek: 27, points: 48, captain: "Saka", benchPoints: 6, hit: "-4" },
  { gameweek: 28, points: 72, captain: "Haaland", benchPoints: 9 },
  { gameweek: 29, points: 39, captain: "Watkins", benchPoints: 4, hit: "-8" },
  { gameweek: 30, points: 61, captain: "Salah", benchPoints: 11 },
  { gameweek: 31, points: 82, captain: "Haaland", benchPoints: 7 },
  { gameweek: 32, points: 67, captain: "Foden", benchPoints: 5 },
];

export interface CaptainDecisionEntry {
  gameweek: number;
  captain: string;
  viceCaptain: string;
  captainPoints: number;
  bestOptionPoints: number;
  goodDecision: boolean;
}

export const profileCaptainMock: CaptainDecisionEntry[] = [
  {
    gameweek: 27,
    captain: "Saka",
    viceCaptain: "Haaland",
    captainPoints: 12,
    bestOptionPoints: 16,
    goodDecision: false,
  },
  {
    gameweek: 28,
    captain: "Haaland",
    viceCaptain: "Salah",
    captainPoints: 20,
    bestOptionPoints: 20,
    goodDecision: true,
  },
  {
    gameweek: 29,
    captain: "Watkins",
    viceCaptain: "Saka",
    captainPoints: 8,
    bestOptionPoints: 12,
    goodDecision: false,
  },
  {
    gameweek: 30,
    captain: "Salah",
    viceCaptain: "Haaland",
    captainPoints: 18,
    bestOptionPoints: 18,
    goodDecision: true,
  },
  {
    gameweek: 31,
    captain: "Haaland",
    viceCaptain: "Foden",
    captainPoints: 24,
    bestOptionPoints: 24,
    goodDecision: true,
  },
  {
    gameweek: 32,
    captain: "Foden",
    viceCaptain: "Haaland",
    captainPoints: 14,
    bestOptionPoints: 16,
    goodDecision: false,
  },
];

export interface ProfileTransferEntry {
  gameweek: number;
  outPlayer: string;
  inPlayer: string;
  cost: number;
  impact: number;
}

export const profileTransfersMock: ProfileTransferEntry[] = [
  { gameweek: 27, outPlayer: "Darwin Nunez", inPlayer: "Watkins", cost: 0, impact: 6 },
  { gameweek: 28, outPlayer: "Bowen", inPlayer: "Palmer", cost: -4, impact: 9 },
  { gameweek: 29, outPlayer: "Gordon", inPlayer: "Saka", cost: -8, impact: -2 },
  { gameweek: 30, outPlayer: "Trippier", inPlayer: "Porro", cost: 0, impact: 3 },
  { gameweek: 31, outPlayer: "Isak", inPlayer: "Haaland", cost: -4, impact: 12 },
  { gameweek: 32, outPlayer: "Mitoma", inPlayer: "Foden", cost: 0, impact: 4 },
];

export interface ProfileSettings {
  teamName: string;
  email: string;
  notifications: boolean;
  theme: "dark" | "light";
}

export const profileSettingsMock: ProfileSettings = {
  teamName: "Midnight XI FC",
  email: "nicolas.suarez@primexi.com",
  notifications: true,
  theme: "dark",
};
