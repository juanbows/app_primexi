"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/data";
import { Card, CardTitle, SectionHeader } from "@/features/profile/components/ProfileUi";

type ProfileRecord = {
  team_name?: string | null;
  email?: string | null;
};

export function ProfileSettingsPageClient() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("Mi equipo");
  const [savedTeamName, setSavedTeamName] = useState("Mi equipo");
  const [email, setEmail] = useState("-");
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const storedNotifications = window.localStorage.getItem("primexi-notifications");

    if (storedNotifications === "off") {
      setNotifications(false);
    }

    async function loadProfile() {
      try {
        const profile = (await getProfile()) as ProfileRecord | null;
        if (!mounted || !profile) return;

        const currentTeamName = profile.team_name ?? "Mi equipo";

        setTeamName(currentTeamName);
        setSavedTeamName(currentTeamName);
        setEmail(profile.email ?? "-");
      } catch (error) {
        if (mounted) {
          setError(
            error instanceof Error ? error.message : "No se pudo cargar el perfil.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setMessage(null);
    setError(null);

    try {
      const updatedProfile = (await updateProfile({ teamName })) as ProfileRecord;
      const nextTeamName = updatedProfile.team_name ?? (teamName.trim() || "Mi equipo");

      setTeamName(nextTeamName);
      setSavedTeamName(nextTeamName);
      setMessage("Nombre del equipo guardado.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el nombre del equipo.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function handleToggleNotifications() {
    setNotifications((current) => {
      const next = !current;
      window.localStorage.setItem("primexi-notifications", next ? "on" : "off");
      setMessage(next ? "Notificaciones activadas." : "Notificaciones desactivadas.");
      setError(null);
      return next;
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Sign out failed", error);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <section className="space-y-6 pt-2">
      <Card>
        <SectionHeader title="Configuración" description="Preferencias del perfil" />
        <div className="mt-4 space-y-4">
          <label className="text-xs text-white/60">
            Nombre del equipo
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={
              loading ||
              savingProfile ||
              teamName.trim().length === 0 ||
              teamName.trim() === savedTeamName.trim()
            }
            className="w-full rounded-2xl bg-[#00ff85] px-4 py-3 text-sm font-semibold text-[#0b0b0b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? "Guardando..." : "Guardar nombre"}
          </button>
          {message ? <p className="text-sm text-[#b6ffe2]">{message}</p> : null}
          {error ? <p className="text-sm text-[#f5a3c1]">{error}</p> : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Preferencias</CardTitle>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm">
          <div>
            <p className="font-semibold">Notificaciones</p>
            <p className="text-xs text-white/60">Alertas de deadline y noticias</p>
          </div>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`h-9 w-16 rounded-full border transition ${
              notifications
                ? "border-[#00ff85]/40 bg-[#00ff85]/20"
                : "border-white/10 bg-[#1a001c]"
            }`}
          >
            <span
              className={`block h-7 w-7 rounded-full bg-white transition ${
                notifications ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Cuenta</CardTitle>
        <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm">
          <p className="text-xs text-white/60">Email</p>
          <p className="mt-1 font-semibold">{loading ? "Cargando..." : email}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-2xl border border-[#e90052]/30 bg-[#e90052]/10 px-4 py-3 text-sm font-semibold text-[#f5a3c1] disabled:opacity-60"
        >
          {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </Card>
    </section>
  );
}
