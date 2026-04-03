"use client";

import dynamic from "next/dynamic";
import { startTransition, useState } from "react";

import { CountdownTimer } from "@/components/primexi/CountdownTimer";
import { NewsIntelligence } from "@/components/primexi/NewsIntelligence";
import { RevelationPlayer } from "@/components/primexi/RevelationPlayer";
import { WeekSelector } from "@/components/primexi/WeekSelector";
import {
  countdownData,
  getHomeSummaryForGameweek,
  initialGameweek,
  type StatusLevel,
} from "@/lib/mocks/fpl";

const TopPlayers = dynamic(
  () =>
    import("@/components/primexi/TopPlayers").then((module) => module.TopPlayers),
  {
    ssr: false,
    loading: () => (
      <section className="space-y-4">
        <div className="h-7 w-48 rounded-full bg-white/10" />
        <div className="h-[28rem] rounded-3xl border-2 border-white/10 bg-[#38003c]/50" />
      </section>
    ),
  },
);

export function PrimexiHome() {
  const [currentGameweek, setCurrentGameweek] = useState(initialGameweek);
  const summary = getHomeSummaryForGameweek(currentGameweek);

  return (
    <div className="space-y-6 py-2">
      <CountdownTimer countdown={countdownData} />
      <WeekSelector
        currentGameweek={currentGameweek}
        onGameweekChange={(nextGameweek) => {
          startTransition(() => {
            setCurrentGameweek(nextGameweek);
          });
        }}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#00ff85]" />
          <h2 className="text-lg font-bold text-white">Resumen GW</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatusChip label="Calendario" status={summary.fixture} />
          <StatusChip label="Rotacion" status={summary.rotation} />
          <StatusChip label="Lesiones" status={summary.injuries} />
        </div>
      </section>

      <TopPlayers gameweek={currentGameweek} />
      <RevelationPlayer gameweek={currentGameweek} />
      <NewsIntelligence />
    </div>
  );
}

const statusClassMap: Record<StatusLevel, string> = {
  high: "border-[#e90052]/40 bg-[#e90052]/15 text-[#e90052]",
  medium: "border-[#04f5ff]/40 bg-[#04f5ff]/15 text-[#04f5ff]",
  low: "border-[#00ff85]/40 bg-[#00ff85]/15 text-[#00ff85]",
};

function StatusChip({
  label,
  status,
}: {
  label: string;
  status: StatusLevel;
}) {
  return (
    <span
      className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${statusClassMap[status]}`}
    >
      {label}
    </span>
  );
}
