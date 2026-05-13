"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { addTransfer, getTransfers } from "@/lib/data";
import { useAuthUser } from "@/lib/useAuthUser";
import { Card, CardTitle, SectionHeader, StatBadge } from "@/features/profile/components/ProfileUi";

type TransferItem = {
  id: string;
  gameweek: number;
  player_in: string;
  player_out: string;
};

export function ProfileTransfersPageClient() {
  const { user, loading: authLoading } = useAuthUser({ required: true, redirectTo: "/" });
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameweek, setGameweek] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [playerOut, setPlayerOut] = useState("");

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
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el historial de transfers.",
          );
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

  const latestGameweek = useMemo(() => transfers[0]?.gameweek ?? null, [transfers]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = (await addTransfer({
        gameweek: Number(gameweek),
        playerIn: playerIn.trim(),
        playerOut: playerOut.trim(),
      })) as TransferItem;

      setTransfers((current) => [created, ...current]);
      setGameweek("");
      setPlayerIn("");
      setPlayerOut("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo agregar el transfer.",
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
          title="Transfers"
          description="Historial de movimientos"
          action={<ArrowLeftRight className="h-5 w-5 text-[#00ff85]" />}
        />
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
              Entra
              <input
                value={playerIn}
                onChange={(event) => setPlayerIn(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/60">
              Sale
              <input
                value={playerOut}
                onChange={(event) => setPlayerOut(event.target.value)}
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
            {saving ? "Guardando..." : "Agregar transfer"}
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatBadge label="Movimientos" value={`${transfers.length}`} accent="green" />
        <StatBadge
          label="Última GW"
          value={latestGameweek ? `GW ${latestGameweek}` : "-"}
          accent="purple"
        />
      </div>

      <Card className="space-y-3">
        <CardTitle>Detalle</CardTitle>
        {loading ? <p className="text-sm text-white/60">Cargando...</p> : null}
        {!loading && transfers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-6 text-center text-sm text-white/60">
            No hay transfers registrados.
          </div>
        ) : null}
        <div className="space-y-2">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>GW {transfer.gameweek}</span>
                <ArrowLeftRight className="h-4 w-4 text-[#00ff85]" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-semibold text-[#b6ffe2]">{transfer.player_in}</span>
                <span className="text-right font-semibold text-[#f0b3ff]">
                  {transfer.player_out}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
