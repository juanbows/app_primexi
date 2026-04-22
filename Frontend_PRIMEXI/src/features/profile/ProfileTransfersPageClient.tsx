"use client";

import { useEffect, useMemo, useState } from "react";

import { getTransfers } from "@/lib/data";
import { Card, CardTitle, SectionHeader } from "@/features/profile/components/ProfileUi";

type TransferItem = {
  id: string;
  gameweek: number;
  player_in: string;
  player_out: string;
};

export function ProfileTransfersPageClient() {
  const [playerFilter, setPlayerFilter] = useState("all");
  const [gwFilter, setGwFilter] = useState("all");
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTransfers() {
      try {
        const data = await getTransfers();
        if (mounted) {
          setTransfers(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load profile transfers", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTransfers();

    return () => {
      mounted = false;
    };
  }, []);

  const playerOptions = useMemo(() => {
    const names = new Set<string>();
    transfers.forEach((entry) => {
      names.add(entry.player_in);
      names.add(entry.player_out);
    });
    return ["all", ...Array.from(names)];
  }, [transfers]);

  const gwOptions = useMemo(
    () => ["all", ...transfers.map((entry) => `GW ${entry.gameweek}`)],
    [transfers],
  );

  const filtered = useMemo(() => {
    return transfers.filter((entry) => {
      const matchesPlayer =
        playerFilter === "all" ||
        entry.player_in === playerFilter ||
        entry.player_out === playerFilter;
      const matchesGw = gwFilter === "all" || gwFilter === `GW ${entry.gameweek}`;
      return matchesPlayer && matchesGw;
    });
  }, [gwFilter, playerFilter, transfers]);

  return (
    <section className="space-y-6 pt-2">
      <Card>
        <SectionHeader title="Transfers" description="Historial completo" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-white/60">
            Jugador
            <select
              value={playerFilter}
              onChange={(event) => setPlayerFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-3 py-2 text-sm text-white"
            >
              {playerOptions.map((name) => (
                <option key={name} value={name}>
                  {name === "all" ? "Todos" : name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/60">
            Gameweek
            <select
              value={gwFilter}
              onChange={(event) => setGwFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-3 py-2 text-sm text-white"
            >
              {gwOptions.map((gw) => (
                <option key={gw} value={gw}>
                  {gw === "all" ? "Todas" : gw}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Movimientos</CardTitle>
        {loading ? <p className="text-sm text-white/60">Cargando...</p> : null}
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
            >
              <div>
                <p className="text-sm font-semibold">GW {entry.gameweek}</p>
                <p className="text-xs text-white/60">
                  {entry.player_out} → {entry.player_in}
                </p>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-6 text-center text-sm text-white/60">
              No hay transfers con esos filtros.
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
