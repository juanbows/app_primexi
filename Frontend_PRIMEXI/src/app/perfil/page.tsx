import type { Metadata } from "next";

import { UserCircle2 } from "lucide-react";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Perfil",
};

export default function PerfilPage() {
  return (
    <PrimexiShell>
      <SectionPlaceholder
        title="Perfil"
        description="Perfil ya existe como pagina independiente para conectar autenticacion, preferencias y seguimiento historico del manager."
        icon={UserCircle2}
        highlights={[
          "Datos del usuario y preferencias",
          "Historial de jornadas y rendimiento",
          "Espacio listo para login y personalizacion",
        ]}
        statusLabel="Preparado para auth"
      />
    </PrimexiShell>
  );
}
