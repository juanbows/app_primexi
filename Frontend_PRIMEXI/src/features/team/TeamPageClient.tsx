"use client";

import { PlayersCatalogSection } from "@/features/team/components/PlayersCatalogSection";
import { TeamFormation } from "@/features/team/components/TeamFormation";
import { teamFormationMock } from "@/lib/mocks/fpl";

export function TeamPageClient() {
  return (
    <section className="space-y-6 pt-2 pb-24">
      <TeamFormation
        formation={teamFormationMock.formation}
        squad={teamFormationMock.squad}
        last5Form={teamFormationMock.last5Form}
      />
      <PlayersCatalogSection />
    </section>
  );
}
