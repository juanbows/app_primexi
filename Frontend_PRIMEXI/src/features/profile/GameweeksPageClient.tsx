"use client";

import { useMemo, useState } from "react";

import { profileGameweeksMock } from "@/lib/mocks/fpl";
import {
  Card,
  CardTitle,
  InsightBadge,
  SectionHeader,
  ToggleGroup,
} from "@/features/profile/components/ProfileUi";

const ranges = [
  { id: "last5", label: "Últimas 5" },
  { id: "last10", label: "Últimas 10" },
  { id: "all", label: "Todas" },
];

type RangeId = "last5" | "last10" | "all";

export function GameweeksPageClient() {
  const [range, setRange] = useState<RangeId>("last10");

  const gameweeks = useMemo(() => {
    const list = [...profileGameweeksMock];
    if (range === "all") {
      return list;
    }
    if (range === "last5") {
      return list.slice(-5);
    }
    return list.slice(-10);
  }, [range]);

  const best = useMemo(
    () => gameweeks.reduce((prev, current) => (current.points > prev.points ? current : prev)),
    [gameweeks],
  );
  const worst = useMemo(
    () => gameweeks.reduce((prev, current) => (current.points < prev.points ? current : prev)),
    [gameweeks],
  );

  return (
    <section className="space-y-6 pt-2">
      <Card>
        <SectionHeader
          title="Gameweeks"
          description="Historial por jornada"
          action={<ToggleGroup options={ranges} value={range} onChange={setRange} />}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#00ff85]/30 bg-[#00ff85]/10 p-3">
            <p className="text-xs text-white/60">Mejor GW</p>
            <p className="text-lg font-semibold">GW {best.gameweek}</p>
            <p className="text-xs text-[#00ff85]">{best.points} pts</p>
          </div>
          <div className="rounded-2xl border border-[#e90052]/30 bg-[#e90052]/10 p-3">
            <p className="text-xs text-white/60">Peor GW</p>
            <p className="text-lg font-semibold">GW {worst.gameweek}</p>
            <p className="text-xs text-[#e90052]">{worst.points} pts</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Detalle de puntos</CardTitle>
        <div className="space-y-2">
          {gameweeks.map((gw) => (
            <div
              key={gw.gameweek}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
            >
              <div>
                <p className="text-sm font-semibold">GW {gw.gameweek}</p>
                <p className="text-xs text-white/60">Capitán: {gw.captain}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold">{gw.points} pts</p>
                <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-white/60">
                  <span>Bench {gw.benchPoints}</span>
                  {gw.hit ? <InsightBadge label={`Hit ${gw.hit}`} good={false} /> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
