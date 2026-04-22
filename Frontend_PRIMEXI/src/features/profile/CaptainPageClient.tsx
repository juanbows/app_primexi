"use client";

import { useMemo } from "react";

import { profileCaptainMock } from "@/lib/mocks/fpl";
import {
  Card,
  CardTitle,
  InsightBadge,
  SectionHeader,
  StatBadge,
} from "@/features/profile/components/ProfileUi";

export function CaptainPageClient() {
  const successRate = useMemo(() => {
    const total = profileCaptainMock.length;
    const good = profileCaptainMock.filter((entry) => entry.goodDecision).length;
    return total ? Math.round((good / total) * 100) : 0;
  }, []);

  const totalCaptainPoints = useMemo(
    () => profileCaptainMock.reduce((sum, entry) => sum + entry.captainPoints, 0),
    [],
  );

  return (
    <section className="space-y-6 pt-2">
      <Card>
        <SectionHeader title="Capitanes" description="Decisiones clave por GW" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatBadge label="% acierto" value={`${successRate}%`} accent="green" />
          <StatBadge label="Pts de capitanes" value={`${totalCaptainPoints}`} accent="purple" />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Detalle por jornada</CardTitle>
        <div className="space-y-2">
          {profileCaptainMock.map((entry) => (
            <div
              key={entry.gameweek}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm"
            >
              <div>
                <p className="text-sm font-semibold">GW {entry.gameweek}</p>
                <p className="text-xs text-white/60">
                  C: {entry.captain} · VC: {entry.viceCaptain}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold">{entry.captainPoints} pts</p>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <InsightBadge
                    label={entry.goodDecision ? "Buena decisión" : "Mala decisión"}
                    good={entry.goodDecision}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
