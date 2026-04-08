"use client";

import { useMemo, useState } from "react";

import {
  type RankingEvolutionEntry,
  profileRankingMock,
} from "@/lib/mocks/fpl";
import {
  Card,
  CardTitle,
  InsightBadge,
  SectionHeader,
  StatBadge,
  ToggleGroup,
} from "@/features/profile/components/ProfileUi";

type RankingMode = "global" | "league";

const toggleOptions = [
  { id: "global", label: "Global" },
  { id: "league", label: "Liga privada" },
];

function buildChartPoints(entries: RankingEvolutionEntry[]) {
  const ranks = entries.map((entry) => entry.rank);
  const maxRank = Math.max(...ranks);
  const minRank = Math.min(...ranks);
  const spread = Math.max(maxRank - minRank, 1);

  return entries.map((entry, index) => {
    const x = (index / Math.max(entries.length - 1, 1)) * 100;
    const y = 40 - ((entry.rank - minRank) / spread) * 32 - 4;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
}

export function RankingPageClient() {
  const [mode, setMode] = useState<RankingMode>("global");
  const data = mode === "global" ? profileRankingMock.global : profileRankingMock.league;

  const evolutionPoints = useMemo(
    () => buildChartPoints(data.evolution),
    [data.evolution],
  );

  const current = data.evolution[data.evolution.length - 1];
  const previous = data.evolution[data.evolution.length - 2];
  const delta = previous ? previous.rank - current.rank : 0;
  const deltaLabel = delta === 0 ? "Sin cambio" : `${delta > 0 ? "+" : ""}${delta} posiciones`;

  return (
    <section className="space-y-6 pt-2">
      <Card>
        <SectionHeader
          title="Ranking"
          description="Detalle de ranking y evolución"
          action={<ToggleGroup options={toggleOptions} value={mode} onChange={setMode} />}
        />
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#110015] p-4">
          <div className="flex items-center justify-between">
            <CardTitle>Evolución por GW</CardTitle>
            <InsightBadge label={deltaLabel} good={delta >= 0} />
          </div>
          <div className="mt-3">
            <svg viewBox="0 0 100 40" className="h-28 w-full">
              <defs>
                <linearGradient id="rankingLine" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00ff85" />
                  <stop offset="100%" stopColor="#04f5ff" />
                </linearGradient>
              </defs>
              <polyline
                points={evolutionPoints.join(" ")}
                fill="none"
                stroke="url(#rankingLine)"
                strokeWidth="2.2"
              />
              {evolutionPoints.map((point, index) => (
                <circle
                  key={`${point}-${index}`}
                  cx={point.split(",")[0]}
                  cy={point.split(",")[1]}
                  r="1.6"
                  fill="#00ff85"
                />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-white/60">
            <span>GW {data.evolution[0].gameweek}</span>
            <span>GW {current.gameweek}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatBadge label="Ranking actual" value={`#${current.rank}`} accent="purple" />
        <StatBadge label="Percentil" value={data.percentile} accent="green" />
      </div>

      <Card className="space-y-4">
        <CardTitle>Comparación de puntos</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatBadge
            label="Promedio global"
            value={`${data.comparison.globalAverage} pts`}
            accent="purple"
          />
          <StatBadge
            label="Promedio liga"
            value={`${data.comparison.leagueAverage} pts`}
            accent="green"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#120015] p-3 text-sm text-white/70">
          Tu equipo está {data.summaryNote}.
        </div>
      </Card>
    </section>
  );
}
