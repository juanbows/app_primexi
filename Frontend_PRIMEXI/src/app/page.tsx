import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { PrimexiHome } from "@/components/primexi/PrimexiHome";
import { getHomeContext } from "@/services/homeService";

export default async function Page() {
  const homeContext = await getHomeContext();

  return (
    <PrimexiShell>
      <PrimexiHome initialHomeContext={homeContext} />
    </PrimexiShell>
  );
}
