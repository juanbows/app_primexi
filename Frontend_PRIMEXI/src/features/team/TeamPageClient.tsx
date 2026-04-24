"use client";

import { PlayersCatalogSection } from "@/features/team/components/PlayersCatalogSection";
import { TeamFormation } from "@/features/team/components/TeamFormation";
import { TeamModelModes } from "@/features/team/components/TeamModelModes";

export function TeamPageClient() {
  return (
    <section className="space-y-6 pt-2 pb-24">
      <TeamModelModes />
      <TeamFormation />
      <PlayersCatalogSection />
    </section>
  );
}
