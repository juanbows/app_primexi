import type { Metadata } from "next";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { TeamPageClient } from "@/features/team/TeamPageClient";

export const metadata: Metadata = {
  title: "Equipo",
};

export default function EquipoPage() {
  return (
    <PrimexiShell>
      <TeamPageClient />
    </PrimexiShell>
  );
}
