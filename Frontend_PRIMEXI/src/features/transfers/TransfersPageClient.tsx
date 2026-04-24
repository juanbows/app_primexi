"use client";

import { ArrowLeftRight } from "lucide-react";

import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export default function TransfersPageClient() {
  return (
    <SectionPlaceholder
      title="Traspasos"
      description="Estamos preparando esta seccion para que puedas seguir movimientos, cambios sugeridos y decisiones clave de tu plantilla."
      highlights={[
        "Seguimiento de movimientos de mercado",
        "Sugerencias de entrada y salida por jornada",
        "Historial y analisis de traspasos",
      ]}
      statusLabel="Coming Soon"
      icon={ArrowLeftRight}
    />
  );
}
