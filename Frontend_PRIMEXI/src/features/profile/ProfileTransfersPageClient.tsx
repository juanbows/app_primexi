"use client";

import { ArrowLeftRight } from "lucide-react";

import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export function ProfileTransfersPageClient() {
  return (
    <SectionPlaceholder
      title="Transfers"
      description="Esta vista quedara conectada a tu actividad para revisar movimientos, decisiones y oportunidades de mercado."
      highlights={[
        "Resumen de cambios por jornada",
        "Contexto de movimientos recientes",
        "Herramientas para planear el siguiente transfer",
      ]}
      statusLabel="Coming Soon"
      icon={ArrowLeftRight}
    />
  );
}
