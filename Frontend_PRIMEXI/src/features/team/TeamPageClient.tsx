"use client";

import { TeamFormation } from "@/features/team/components/TeamFormation";
import { teamFormationMock } from "@/lib/mocks/fpl";

export function TeamPageClient() {
  return (
    <section className="space-y-4 pt-2">
      <TeamFormation
        formation={teamFormationMock.formation}
        squad={teamFormationMock.squad}
        last5Form={teamFormationMock.last5Form}
      />
    </section>
  );
}
