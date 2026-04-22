"use client";

import dynamic from "next/dynamic";
import { startTransition, useState } from "react";

import { CountdownTimer } from "@/components/primexi/CountdownTimer";
import { NewsIntelligence } from "@/components/primexi/NewsIntelligence";
import { RevelationPlayer } from "@/components/primexi/RevelationPlayer";
import { WeekSelector } from "@/components/primexi/WeekSelector";
import type { HomeContext } from "@/services/homeService";

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

type PrimexiHomeProps = {
  initialHomeContext: HomeContext;
};

export function PrimexiHome({ initialHomeContext }: PrimexiHomeProps) {
  const latestSyncedGameweek = initialHomeContext.latestSyncedGameweek;
  const initialDisplayGameweek =
    latestSyncedGameweek ?? initialHomeContext.currentGameweek;
  const [currentGameweek, setCurrentGameweek] = useState(
    initialDisplayGameweek,
  );
  const countdown = initialHomeContext.countdown;

  return (
    <div className="space-y-6 py-2">
      <CountdownTimer countdown={countdown} />

      <WeekSelector
        currentGameweek={currentGameweek}
        maxGameweek={latestSyncedGameweek ?? initialHomeContext.currentGameweek}
        onGameweekChange={(nextGameweek) => {
          startTransition(() => {
            setCurrentGameweek(nextGameweek);
          });
        }}
      />

      {currentGameweek !== null ? (
        <>
          <TopPlayers gameweek={currentGameweek} />
          <RevelationPlayer gameweek={currentGameweek} />
          <NewsIntelligence gameweek={currentGameweek} />
        </>
      ) : null}
    </div>
  );
}
