import { Search } from "lucide-react";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { SectionPlaceholder } from "@/components/primexi/SectionPlaceholder";

export default function NotFound() {
  return (
    <PrimexiShell>
      <SectionPlaceholder
        title="Pagina no encontrada"
        description="La ruta que intentaste abrir no existe dentro de PRIMEXI. Puedes volver a Inicio desde la barra inferior."
        icon={Search}
        highlights={[
          "Verifica la URL",
          "Regresa a Inicio para continuar navegando",
          "La estructura de rutas ya esta controlada por App Router",
        ]}
        statusLabel="404"
      />
    </PrimexiShell>
  );
}
