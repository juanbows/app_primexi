import type { Metadata } from "next";

import { Trophy } from "lucide-react";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Ligas",
};

export default function LigasPage() {
  return (
    <PrimexiShell>
      <SectionPlaceholder
        title="Ligas"
        description="La seccion de ligas ya funciona como pagina propia en Next y queda lista para rankings, mini ligas privadas y comparativas entre managers."
        icon={Trophy}
        highlights={[
          "Tabla general y cambios de posicion por jornada",
          "Mini ligas privadas con invitaciones",
          "Comparativas de puntos, capitanes y diferenciales",
        ]}
        statusLabel="Base preparada"
      />
    </PrimexiShell>
  );
}
