"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { addGameweek, getGameweeks } from "@/lib/data";
import { useAuthUser } from "@/lib/useAuthUser";
import { Card, CardTitle, SectionHeader } from "@/features/profile/components/ProfileUi";

type GameweekItem = {
  id: string;
  gameweek: number;
  points: number;
};

export function GameweeksPageClient() {
  const { user, loading: authLoading } = useAuthUser({ required: true, redirectTo: "/login" });
  const [gameweeks, setGameweeks] = useState<GameweekItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameweek, setGameweek] = useState("");
  const [points, setPoints] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadGameweeks() {
      try {
        const data = await getGameweeks();
        if (mounted) {
          setGameweeks(data ?? []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar gameweeks.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (user) {
      loadGameweeks();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  const best = useMemo(() => {
    if (!gameweeks.length) return null;
    return gameweeks.reduce((prev, current) => (current.points > prev.points ? current : prev));
  }, [gameweeks]);

  const worst = useMemo(() => {
    if (!gameweeks.length) return null;
    return gameweeks.reduce((prev, current) => (current.points < prev.points ? current : prev));
  }, [gameweeks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = await addGameweek({
        gameweek: Number(gameweek),
        points: Number(points),
      });

      setGameweeks((current) => [created, ...current]);
      setGameweek("");
      setPoints("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo agregar la jornada.");
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
        <SectionHeader title="Gameweeks" description="Historial por jornada" />
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-white/60">
              Jornada
              <input
                type="number"
                min={1}
                value={gameweek}
                onChange={(event) => setGameweek(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/60">
              Puntos
              <input
                type="number"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
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
            {saving ? "Guardando..." : "Agregar jornada"}
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#00ff85]/30 bg-[#00ff85]/10 p-3">
            <p className="text-xs text-white/60">Mejor GW</p>
            <p className="text-lg font-semibold">{best ? `GW ${best.gameweek}` : "-"}</p>
            <p className="text-xs text-[#00ff85]">{best ? `${best.points} pts` : "Sin datos"}</p>
          </div>
          <div className="rounded-2xl border border-[#e90052]/30 bg-[#e90052]/10 p-3">
            <p className="text-xs text-white/60">Peor GW</p>
            <p className="text-lg font-semibold">{worst ? `GW ${worst.gameweek}` : "-"}</p>
            <p className="text-xs text-[#e90052]">{worst ? `${worst.points} pts` : "Sin datos"}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Detalle de puntos</CardTitle>
        {loading ? <p className="text-sm text-white/60">Cargando...</p> : null}
        {!loading && gameweeks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-6 text-center text-sm text-white/60">
            No hay jornadas registradas.
          </div>
        ) : null}
        <div className="space-y-2">
          {gameweeks.map((gw) => (
            <div
              key={gw.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
            >
              <div>
                <p className="text-sm font-semibold">GW {gw.gameweek}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold">{gw.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
