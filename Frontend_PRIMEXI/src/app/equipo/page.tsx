import type { Metadata } from "next";

import { Shield } from "lucide-react";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Equipo",
};

export default function EquipoPage() {
  return (
    <PrimexiShell>
      <SectionPlaceholder
        title="Tu Equipo"
        description="Esta seccion ya esta preparada como ruta real para montar el once titular, banca, capitan y metricas de rendimiento."
        icon={Shield}
        highlights={[
          "Resumen del XI inicial y suplentes",
          "Capitan, vicecapitan y alertas previas al deadline",
          "Espacio listo para conectar datos reales desde API o Supabase",
        ]}
        statusLabel="Ruta lista para desarrollo"
      />
    </PrimexiShell>
  );
}
