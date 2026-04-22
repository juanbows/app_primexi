import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import TransfersPageClient from "@/features/transfers/TransfersPageClient";

export const metadata: Metadata = {
  title: "Traspasos",
};

export default function TraspasosPage() {
  return (
    <PrimexiShell>
      <RequireAuth>
        <TransfersPageClient />
      </RequireAuth>
    </PrimexiShell>
  );
}
