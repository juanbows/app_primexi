import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PrimexiHome } from "@/components/primexi/PrimexiHome";
import { getHomeContext } from "@/services/homeService";

export default async function InicioPage() {
  const homeContext = await getHomeContext();

  return (
    <PrimexiShell>
      <RequireAuth>
        <PrimexiHome initialHomeContext={homeContext} />
      </RequireAuth>
    </PrimexiShell>
  );
}
