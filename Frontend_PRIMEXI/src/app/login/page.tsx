"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PrimexiShell } from "@/components/primexi/PrimexiShell";
import { createUserProfile, signIn, signUp } from "@/lib/auth";
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
    if (!authLoading && user) {
      router.replace("/perfil");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    const code = searchParams.get("code");
    const authErrorDescription = searchParams.get("error_description");

    if (authErrorDescription) {
      setError(decodeURIComponent(authErrorDescription));
      return;
    }

    if (!code) return;

    let active = true;

    async function handleEmailCallback() {
      try {
        const safeCode = code;
        if (!safeCode) return;

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(safeCode);
        if (exchangeError) throw exchangeError;
      } catch (callbackError) {
        if (active) {
          setError(getReadableError(callbackError));
        }
      }
    }

    handleEmailCallback();

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

        if (currentUser?.id && currentUser.email) {
          await createUserProfile({
            id: currentUser.id,
            email: currentUser.email,
            teamName: (currentUser.user_metadata?.team_name as string) || "Mi equipo",
          });
        }

        router.replace("/perfil");
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

      if (newUser?.id && newUser.email && hasSession) {
        await createUserProfile({
          id: newUser.id,
          email: newUser.email,
          teamName: teamName.trim() || "Mi equipo",
        });
        router.replace("/perfil");
        return;
      }

      setMessage(
        "Registro completado. Revisa tu correo para confirmar la cuenta y luego inicia sesión.",
      );
      setMode("login");
    } catch (submitError) {
      setError(getReadableError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <PrimexiShell>
        <section className="pt-8 text-sm text-white/70">Cargando sesión...</section>
      </PrimexiShell>
    );
  }

  return (
    <PrimexiShell>
      <section className="space-y-6 pt-3">
        <header className="rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Acceso</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {mode === "login"
              ? "Ingresa para ver tu perfil e historial real."
              : "Registra tu cuenta para empezar con PRIME XI."}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-[#140015] p-4">
          <label className="block text-xs text-white/60">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
            />
          </label>

          <label className="block text-xs text-white/60">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
            />
          </label>

          {mode === "register" ? (
            <label className="block text-xs text-white/60">
              Nombre del equipo
              <input
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-[#f5a3c1]">{error}</p> : null}
          {message ? <p className="text-sm text-[#b6ffe2]">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#00ff85] px-4 py-3 text-sm font-semibold text-[#0b0b0b] disabled:opacity-60"
          >
            {submitting
              ? "Procesando..."
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
          </button>

          <button
            type="button"
            onClick={() =>
              setMode((current) => (current === "login" ? "register" : "login"))
            }
            className="w-full rounded-2xl border border-white/15 bg-[#1a001c] px-4 py-3 text-sm font-medium text-white/80"
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