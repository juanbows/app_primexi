"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { createUserProfile, signIn, signInWithGoogle, signUp } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
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

function getTeamNameFromUser(user: User) {
  return (
    (user.user_metadata?.team_name as string) ||
    (user.user_metadata?.full_name as string) ||
    "Mi equipo"
  );
}

async function ensureProfile(authUser: User | null) {
  if (!authUser?.id || !authUser.email) {
    return;
  }

  await createUserProfile({
    id: authUser.id,
    email: authUser.email,
    teamName: getTeamNameFromUser(authUser),
  });
}

// 🔹 CONTENIDO REAL
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("Mi equipo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function syncAuthenticatedUser() {
      if (authLoading || !user) {
        return;
      }

      await ensureProfile(user);

      if (active) {
        router.replace("/inicio");
      }
    }

    syncAuthenticatedUser();

    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (requestedMode === "login" || requestedMode === "register") {
      setMode(requestedMode);
    }

    const code = searchParams.get("code");
    const authErrorDescription = searchParams.get("error_description");

    if (authErrorDescription) {
      setError(decodeURIComponent(authErrorDescription));
      return;
    }

    if (!code) return;

    let active = true;

    async function handleAuthCallback() {
      try {
        const safeCode = code;
        if (!safeCode) return;

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(safeCode);
        if (exchangeError) throw exchangeError;

        const {
          data: { user: callbackUser },
        } = await supabase.auth.getUser();

        await ensureProfile(callbackUser);
      } catch (callbackError) {
        if (active) {
          setError(getReadableError(callbackError));
        }
      }
    }

    handleAuthCallback();

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const signInData = await signIn(email, password);
        const currentUser = signInData.user;

        await ensureProfile(currentUser);

        router.replace("/inicio");
        return;
      }

      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

      const data = await signUp(
        email,
        password,
        teamName.trim() || "Mi equipo",
        emailRedirectTo,
      );

      const newUser = data.user;
      const hasSession = Boolean(data.session);

      // Always try to create the profile (fire-and-forget fallback; the DB trigger is primary)
      await ensureProfile(
        newUser
          ? {
              ...newUser,
              user_metadata: {
                ...newUser.user_metadata,
                team_name: teamName.trim() || "Mi equipo",
              },
            }
          : null,
      );

      if (hasSession) {
        router.replace("/inicio");
        return;
      }

      setMessage(
        "¡Registro exitoso! Revisa tu correo (incluida la carpeta de spam) para confirmar tu cuenta.",
      );
      setMode("login");
    } catch (submitError) {
      setError(getReadableError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      await signInWithGoogle(redirectTo);
    } catch (googleError) {
      setError(getReadableError(googleError));
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <PrimexiShell showNavigation={false}>
        <section className="pt-8 text-sm text-white/70">Cargando sesión...</section>
      </PrimexiShell>
    );
  }

  return (
    <PrimexiShell showNavigation={false}>
      <section className="space-y-5 pt-3">
        {/* ── Header ── */}
        <header className="relative overflow-hidden rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-5">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#00ff85]/8 blur-2xl" />
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#00ff85]/70">
            Acceso
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">
            {mode === "login"
              ? "Ingresa para ver tu perfil e historial real."
              : "Registra tu cuenta para empezar con PRIME XI."}
          </p>
        </header>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a0020]/90 to-[#120015]/95 p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
        >
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08] active:scale-[0.98] disabled:opacity-50"
          >
            {/* Google "G" logo – official colors */}
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.002 24.002 0 0 0 0 21.56l7.98-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {submitting ? "Redirigiendo…" : "Continuar con Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-0.5 text-[11px] text-white/35">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            o con correo
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>

          {/* Email */}
          <label className="block space-y-2">
            <span className="text-xs font-medium text-white/50">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="tu@correo.com"
              className="w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-[#00ff85]/40 focus:outline-none focus:ring-1 focus:ring-[#00ff85]/20"
            />
          </label>

          {/* Password */}
          <label className="block space-y-2">
            <span className="text-xs font-medium text-white/50">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-[#00ff85]/40 focus:outline-none focus:ring-1 focus:ring-[#00ff85]/20"
            />
          </label>

          {/* Team name (register only) */}
          {mode === "register" ? (
            <label className="block space-y-2">
              <span className="text-xs font-medium text-white/50">Nombre del equipo</span>
              <input
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Mi equipo"
                className="w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-[#7c3aed]/40 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/20"
              />
            </label>
          ) : null}

          {/* Feedback */}
          {error ? (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-[#f5a3c1]">{error}</p>
          ) : null}
          {message ? (
            <p className="rounded-xl bg-[#00ff85]/10 px-3 py-2 text-sm text-[#b6ffe2]">{message}</p>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[#00ff85] to-[#00e077] px-4 py-3.5 text-sm font-bold text-[#0b0b0b] shadow-[0_0_24px_-6px_rgba(0,255,133,0.4)] transition-all duration-200 hover:shadow-[0_0_32px_-4px_rgba(0,255,133,0.55)] active:scale-[0.98] disabled:opacity-50"
          >
            {submitting
              ? "Procesando…"
              : mode === "login"
                ? "Entrar"
                : "Crear cuenta"}
          </button>

          {/* Toggle mode */}
          <button
            type="button"
            onClick={() =>
              setMode((current) => (current === "login" ? "register" : "login"))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white/90 active:scale-[0.98]"
          >
            {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
          </button>
        </form>
      </section>
    </PrimexiShell>
  );
}

// 🔹 SUSPENSE WRAPPER
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white p-4">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
