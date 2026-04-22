import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PrimexiHome } from "@/components/primexi/PrimexiHome";

export default function InicioPage() {
  return (
    <PrimexiShell>
      <RequireAuth>
        <PrimexiHome />
      </RequireAuth>
    </PrimexiShell>
  );
}
