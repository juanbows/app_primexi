"use client";

import { PlayersCatalogSection } from "@/features/team/components/PlayersCatalogSection";
import { TeamFormation } from "@/features/team/components/TeamFormation";

export function TeamPageClient() {
  return (
    <section className="space-y-6 pt-2 pb-24">
      <TeamFormation />
      <PlayersCatalogSection />
    </section>
  );
}
