"use client";

import type { ReactNode } from "react";

import { useAuthUser } from "@/lib/useAuthUser";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuthUser({ required: true, redirectTo: "/" });

  if (loading || !user) {
    return <section className="pt-8 text-sm text-white/70">Validando sesión...</section>;
  }

  return <>{children}</>;
}
