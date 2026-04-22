"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { Card, CardTitle, SectionHeader } from "@/features/profile/components/ProfileUi";

export function ProfileSettingsPageClient() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("Mi equipo");
  const [email, setEmail] = useState("-");
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (!mounted || !profile) return;

        setTeamName(profile.team_name ?? "Mi equipo");
        setEmail(profile.email ?? "-");
      } catch (error) {
        console.error("Failed to load settings profile", error);
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
            onClick={() => setNotifications((current) => !current)}
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

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm">
          <div>
            <p className="font-semibold">Tema</p>
            <p className="text-xs text-white/60">Ajusta el modo visual</p>
          </div>
          <div className="flex rounded-full border border-white/10 bg-[#1a001c] p-1 text-xs">
            {["dark", "light"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value as "dark" | "light")}
                className={`rounded-full px-3 py-1.5 font-semibold ${
                  theme === value ? "bg-[#00ff85] text-[#0b0b0b]" : "text-white/60"
                }`}
              >
                {value === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
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
