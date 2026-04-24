"use client";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { useAuthUser } from "@/lib/useAuthUser";

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuthUser({ required: true, redirectTo: "/" });

  return (
    <PrimexiShell>
      {loading || !user ? (
        <section className="pt-8 text-sm text-white/70">Validando sesión...</section>
      ) : (
        children
      )}
    </PrimexiShell>
  );
}
