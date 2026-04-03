import type { Metadata } from "next";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { ProfilePageClient } from "@/features/profile/ProfilePageClient";

export const metadata: Metadata = {
  title: "Perfil",
};

export default function PerfilPage() {
  return (
    <PrimexiShell>
      <ProfilePageClient />
    </PrimexiShell>
  );
}
