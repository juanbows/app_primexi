import type { Metadata } from "next";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import TransfersPageClient from "@/features/transfers/TransfersPageClient";

export const metadata: Metadata = {
  title: "Traspasos",
};

export default function TraspasosPage() {
  return (
    <PrimexiShell>
      <TransfersPageClient />
    </PrimexiShell>
  );
}
