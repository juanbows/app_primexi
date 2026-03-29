"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { CountdownTimer } from "@/components/primexi/CountdownTimer";
import { NewsIntelligence } from "@/components/primexi/NewsIntelligence";
import { RevelationPlayer } from "@/components/primexi/RevelationPlayer";
import { WeekSelector } from "@/components/primexi/WeekSelector";

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
  const [currentGameweek, setCurrentGameweek] = useState(24);

  return (
    <div className="space-y-6 py-2">
      <CountdownTimer gameweek={currentGameweek} />
      <WeekSelector
        currentGameweek={currentGameweek}
        onGameweekChange={setCurrentGameweek}
      />
      <TopPlayers gameweek={currentGameweek} />
      <RevelationPlayer gameweek={currentGameweek} />
      <NewsIntelligence />
    </div>
  );
}
