"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { addRanking, getRankings } from "@/lib/data";
import { useAuthUser } from "@/lib/useAuthUser";
import {
  Card,
  CardTitle,
  InsightBadge,
  SectionHeader,
  StatBadge,
  ToggleGroup,
} from "@/features/profile/components/ProfileUi";

type RankingMode = "global" | "league";

type RankingEntry = {
  id: string;
  gameweek: number;
  mode: RankingMode;
  rank: number;
};

const toggleOptions = [
  { id: "global", label: "Global" },
  { id: "league", label: "Liga privada" },
];

function buildChartPoints(entries: RankingEntry[]) {
  if (entries.length === 0) {
    return [];
  }

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
  const { user, loading: authLoading } = useAuthUser({ required: true, redirectTo: "/" });
  const [mode, setMode] = useState<RankingMode>("global");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameweek, setGameweek] = useState("");
  const [rank, setRank] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadRankings() {
      setLoading(true);
      setError(null);

      try {
        const data = (await getRankings(mode)) as RankingEntry[];
        if (mounted) {
          setRankings(data ?? []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el ranking.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (user) {
      loadRankings();
    }

    return () => {
      mounted = false;
    };
  }, [mode, user]);

  const evolutionPoints = useMemo(() => buildChartPoints(rankings), [rankings]);
  const current = rankings[rankings.length - 1] ?? null;
  const previous = rankings[rankings.length - 2] ?? null;
  const delta = current && previous ? previous.rank - current.rank : 0;
  const deltaLabel =
    !current || !previous
      ? "Sin tendencia"
      : delta === 0
        ? "Sin cambio"
        : `${delta > 0 ? "+" : ""}${delta} posiciones`;
  const best = useMemo(() => {
    if (!rankings.length) return null;
    return rankings.reduce((prev, entry) => (entry.rank < prev.rank ? entry : prev));
  }, [rankings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = (await addRanking({
        gameweek: Number(gameweek),
        mode,
        rank: Number(rank),
      })) as RankingEntry;

      setRankings((currentRankings) => {
        const withoutUpdated = currentRankings.filter(
          (entry) => entry.gameweek !== created.gameweek,
        );
        return [...withoutUpdated, created].sort(
          (left, right) => left.gameweek - right.gameweek,
        );
      });
      setGameweek("");
      setRank("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el ranking.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <section className="pt-8 text-sm text-white/70">Validando sesión...</section>;
  }

  return (
    <section className="space-y-6 pt-2">
      <Card>
        <SectionHeader
          title="Ranking"
          description="Evolución manual por jornada"
          action={
            <ToggleGroup
              options={toggleOptions}
              value={mode}
              onChange={(next) => setMode(next as RankingMode)}
            />
          }
        />
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-white/60">
              Jornada
              <input
                type="number"
                min={1}
                max={38}
                value={gameweek}
                onChange={(event) => setGameweek(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/60">
              Posición
              <input
                type="number"
                min={1}
                value={rank}
                onChange={(event) => setRank(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
          </div>

          {error ? <p className="text-sm text-[#f5a3c1]">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-[#00ff85] px-4 py-3 text-sm font-semibold text-[#0b0b0b] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar ranking"}
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Evolución por GW</CardTitle>
          <InsightBadge label={deltaLabel} good={delta >= 0} />
        </div>
        {loading ? <p className="mt-3 text-sm text-white/60">Cargando...</p> : null}
        {!loading && rankings.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#120015] px-4 py-6 text-center text-sm text-white/60">
            No hay rankings registrados.
          </div>
        ) : (
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
            <div className="mt-3 flex items-center justify-between text-xs text-white/60">
              <span>GW {rankings[0]?.gameweek ?? "-"}</span>
              <span>GW {current?.gameweek ?? "-"}</span>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatBadge
          label="Ranking actual"
          value={current ? `#${current.rank.toLocaleString("es-CO")}` : "-"}
          accent="purple"
        />
        <StatBadge
          label="Mejor ranking"
          value={best ? `#${best.rank.toLocaleString("es-CO")}` : "-"}
          accent="green"
        />
      </div>
    </section>
  );
}
