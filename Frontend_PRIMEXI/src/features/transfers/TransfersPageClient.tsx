"use client";

import { FormEvent, useEffect, useState } from "react";

import { addTransfer, getTransfers } from "@/lib/data";
import { useAuthUser } from "@/lib/useAuthUser";

type TransferItem = {
  id: string;
  gameweek: number;
  player_in: string;
  player_out: string;
};

export default function TransfersPageClient() {
  const { user, loading: authLoading } = useAuthUser({ required: true, redirectTo: "/login" });
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [gameweek, setGameweek] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTransfers() {
      try {
        const data = await getTransfers();
        if (mounted) {
          setTransfers(data ?? []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar transfers.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (user) {
      loadTransfers();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const created = await addTransfer({
        gameweek: Number(gameweek),
        playerIn: playerIn.trim(),
        playerOut: playerOut.trim(),
      });

      setTransfers((current) => [created, ...current]);
      setGameweek("");
      setPlayerIn("");
      setPlayerOut("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo agregar transfer.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <section className="pt-8 text-sm text-white/70">Validando sesión...</section>;
  }

  return (
    <div className="space-y-6 pt-2 pb-44">
      <header className="glass-panel rounded-3xl border-[#00ff85]/20 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Transfers</p>
        <h1 className="text-xl font-semibold">Historial manual</h1>
      </header>

      <section className="rounded-3xl border border-white/10 bg-[#150018] p-4">
        <h2 className="text-base font-semibold">Agregar transfer</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-xs text-white/60">
            Gameweek
            <input
              type="number"
              min={1}
              value={gameweek}
              onChange={(event) => setGameweek(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-white/60">
            Player IN
            <input
              type="text"
              value={playerIn}
              onChange={(event) => setPlayerIn(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-white/60">
            Player OUT
            <input
              type="text"
              value={playerOut}
              onChange={(event) => setPlayerOut(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
            />
          </label>

          {error ? <p className="text-sm text-[#f5a3c1]">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-[#00ff85] px-4 py-3 text-sm font-semibold text-[#0b0b0b] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Agregar transfer"}
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Tus transfers</h2>

        {loading ? <p className="text-sm text-white/60">Cargando historial...</p> : null}

        {!loading && transfers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-5 text-sm text-white/60">
            No hay transfers registrados.
          </div>
        ) : null}

        {transfers.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
          >
            <div>
              <p className="font-semibold">GW {entry.gameweek}</p>
              <p className="text-xs text-white/60">
                {entry.player_out} → {entry.player_in}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
