import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { ProfilePageClient } from "@/features/profile/ProfilePageClient";

export const metadata: Metadata = {
  title: "Perfil",
};

export default function PerfilPage() {
  return (
    <PrimexiShell>
      <RequireAuth>
        <ProfilePageClient />
      </RequireAuth>
    </PrimexiShell>
  );
}
