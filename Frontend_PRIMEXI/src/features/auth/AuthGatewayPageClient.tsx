"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { signInWithGoogle } from "@/lib/auth";
import { useAuthUser } from "@/lib/useAuthUser";

function getReadableError(error: unknown) {
  if (!error) return "No se pudo procesar la solicitud.";

  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [maybeError.message, maybeError.details, maybeError.hint]
      .filter(Boolean)
      .join(" ");

    if (parts) return parts;
    if (maybeError.code) return `Error ${maybeError.code}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo procesar la solicitud.";
}

export function AuthGatewayPageClient() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/inicio");
    }
  }, [loading, router, user]);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmittingGoogle(true);

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      await signInWithGoogle(redirectTo);
    } catch (googleError) {
      setError(getReadableError(googleError));
      setSubmittingGoogle(false);
    }
  }

  if (loading) {
    return (
      <PrimexiShell showNavigation={false}>
        <section className="pt-8 text-sm text-white/70">Cargando sesión...</section>
      </PrimexiShell>
    );
  }

  return (
    <PrimexiShell showNavigation={false}>
      <section className="space-y-6 pt-6">
        <header className="rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Bienvenido</p>
          <h1 className="mt-2 text-2xl font-semibold">PRIME XI</h1>
          <p className="mt-2 text-sm text-white/70">
            Inicia sesión para acceder al sistema.
          </p>
        </header>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-[#140015] p-4">
          <Link
            href="/login?mode=login"
            className="block w-full rounded-2xl bg-[#00ff85] px-4 py-3 text-center text-sm font-semibold text-[#0b0b0b]"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/login?mode=register"
            className="block w-full rounded-2xl border border-white/15 bg-[#1a001c] px-4 py-3 text-center text-sm font-medium text-white/90"
          >
            Registrarse
          </Link>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submittingGoogle}
            className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submittingGoogle ? "Redirigiendo..." : "Continuar con Google"}
          </button>

          {error ? <p className="text-sm text-[#f5a3c1]">{error}</p> : null}
        </div>
      </section>
    </PrimexiShell>
  );
}
