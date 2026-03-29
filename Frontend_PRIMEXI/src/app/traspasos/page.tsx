import type { Metadata } from "next";

import { ArrowLeftRight } from "lucide-react";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Traspasos",
};

export default function TraspasosPage() {
  return (
    <PrimexiShell>
      <SectionPlaceholder
        title="Traspasos"
        description="Esta pagina ya quedo separada del mock original para que podamos integrar watchlists, sugerencias IA y flujo de cambios de plantilla."
        icon={ArrowLeftRight}
        highlights={[
          "Panel de altas y bajas con presupuesto",
          "Sugerencias IA segun forma, fixture y valor",
          "Ruta preparada para filtros y comparadores",
        ]}
        statusLabel="Migracion aplicada"
      />
    </PrimexiShell>
  );
}
