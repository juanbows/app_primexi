"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { addCaptain, getCaptains } from "@/lib/data";
import { useAuthUser } from "@/lib/useAuthUser";
import {
  Card,
  CardTitle,
  InsightBadge,
  SectionHeader,
  StatBadge,
} from "@/features/profile/components/ProfileUi";

type CaptainEntry = {
  id: string;
  gameweek: number;
  captain: string;
  vice_captain: string;
  captain_points: number;
  best_option_points: number;
};

export function CaptainPageClient() {
  const { user, loading: authLoading } = useAuthUser({ required: true, redirectTo: "/" });
  const [captains, setCaptains] = useState<CaptainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameweek, setGameweek] = useState("");
  const [captain, setCaptain] = useState("");
  const [viceCaptain, setViceCaptain] = useState("");
  const [captainPoints, setCaptainPoints] = useState("");
  const [bestOptionPoints, setBestOptionPoints] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCaptains() {
      try {
        const data = (await getCaptains()) as CaptainEntry[];
        if (mounted) {
          setCaptains(data ?? []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el historial de capitanes.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (user) {
      loadCaptains();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  const successRate = useMemo(() => {
    const total = captains.length;
    const good = captains.filter(
      (entry) => entry.captain_points >= entry.best_option_points,
    ).length;
    return total ? Math.round((good / total) * 100) : 0;
  }, [captains]);

  const totalCaptainPoints = useMemo(
    () => captains.reduce((sum, entry) => sum + Number(entry.captain_points || 0), 0),
    [captains],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = (await addCaptain({
        gameweek: Number(gameweek),
        captain: captain.trim(),
        viceCaptain: viceCaptain.trim(),
        captainPoints: Number(captainPoints),
        bestOptionPoints: Number(bestOptionPoints),
      })) as CaptainEntry;

      setCaptains((currentCaptains) => {
        const withoutUpdated = currentCaptains.filter(
          (entry) => entry.gameweek !== created.gameweek,
        );
        return [created, ...withoutUpdated].sort(
          (left, right) => right.gameweek - left.gameweek,
        );
      });
      setGameweek("");
      setCaptain("");
      setViceCaptain("");
      setCaptainPoints("");
      setBestOptionPoints("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el capitán.",
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
        <SectionHeader title="Capitanes" description="Decisiones manuales por GW" />
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-white/60">
              Capitán
              <input
                value={captain}
                onChange={(event) => setCaptain(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/60">
              Vice
              <input
                value={viceCaptain}
                onChange={(event) => setViceCaptain(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-white/60">
              Pts capitán
              <input
                type="number"
                value={captainPoints}
                onChange={(event) => setCaptainPoints(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/60">
              Mejor opción
              <input
                type="number"
                value={bestOptionPoints}
                onChange={(event) => setBestOptionPoints(event.target.value)}
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
            {saving ? "Guardando..." : "Guardar capitán"}
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatBadge label="% acierto" value={`${successRate}%`} accent="green" />
        <StatBadge label="Pts capitanes" value={`${totalCaptainPoints}`} accent="purple" />
      </div>

      <Card className="space-y-3">
        <CardTitle>Detalle por jornada</CardTitle>
        {loading ? <p className="text-sm text-white/60">Cargando...</p> : null}
        {!loading && captains.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-6 text-center text-sm text-white/60">
            No hay capitanes registrados.
          </div>
        ) : null}
        <div className="space-y-2">
          {captains.map((entry) => {
            const goodDecision = entry.captain_points >= entry.best_option_points;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-sm font-semibold">GW {entry.gameweek}</p>
                  <p className="text-xs text-white/60">
                    C: {entry.captain} · VC: {entry.vice_captain}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold">{entry.captain_points} pts</p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <InsightBadge
                      label={goodDecision ? "Buena decisión" : "Mejorable"}
                      good={goodDecision}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
