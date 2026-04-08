"use client";

import { useMemo, useState } from "react";

import { profileTransfersMock } from "@/lib/mocks/fpl";
import {
  Card,
  CardTitle,
  InsightBadge,
  SectionHeader,
} from "@/features/profile/components/ProfileUi";

export function ProfileTransfersPageClient() {
  const [playerFilter, setPlayerFilter] = useState("all");
  const [gwFilter, setGwFilter] = useState("all");

  const playerOptions = useMemo(() => {
    const names = new Set<string>();
    profileTransfersMock.forEach((entry) => {
      names.add(entry.inPlayer);
      names.add(entry.outPlayer);
    });
    return ["all", ...Array.from(names)];
  }, []);

  const gwOptions = useMemo(
    () => ["all", ...profileTransfersMock.map((entry) => `GW ${entry.gameweek}`)],
    [],
  );

  const filtered = useMemo(() => {
    return profileTransfersMock.filter((entry) => {
      const matchesPlayer =
        playerFilter === "all" ||
        entry.inPlayer === playerFilter ||
        entry.outPlayer === playerFilter;
      const matchesGw = gwFilter === "all" || gwFilter === `GW ${entry.gameweek}`;
      return matchesPlayer && matchesGw;
    });
  }, [playerFilter, gwFilter]);

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
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={`${entry.gameweek}-${entry.inPlayer}-${entry.outPlayer}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
            >
              <div>
                <p className="text-sm font-semibold">GW {entry.gameweek}</p>
                <p className="text-xs text-white/60">
                  {entry.outPlayer} → {entry.inPlayer}
                </p>
                <p className="text-[11px] text-white/50">Costo: {entry.cost} pts</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{entry.impact > 0 ? "+" : ""}{entry.impact} pts</p>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <InsightBadge
                    label={entry.impact >= 0 ? "Buen transfer" : "Mal transfer"}
                    good={entry.impact >= 0}
                  />
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-6 text-center text-sm text-white/60">
              No hay transfers con esos filtros.
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
