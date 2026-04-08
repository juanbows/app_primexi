"use client";

import { useState } from "react";

import { profileSettingsMock } from "@/lib/mocks/fpl";
import { Card, CardTitle, SectionHeader } from "@/features/profile/components/ProfileUi";

export function ProfileSettingsPageClient() {
  const [teamName, setTeamName] = useState(profileSettingsMock.teamName);
  const [notifications, setNotifications] = useState(profileSettingsMock.notifications);
  const [theme, setTheme] = useState(profileSettingsMock.theme);

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
          <div className="rounded-2xl border border-white/10 bg-[#120015] px-4 py-3 text-sm text-white/70">
            Avatar actual
            <div className="mt-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#00ff85] via-[#7c3aed] to-[#00d4ff] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#140015] text-xs text-white/70">
                  IMG
                </div>
              </div>
              <button
                type="button"
                className="rounded-2xl border border-[#00ff85]/30 bg-[#00ff85]/10 px-3 py-2 text-xs font-semibold text-[#b6ffe2]"
              >
                Cambiar avatar
              </button>
            </div>
          </div>
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
          <p className="mt-1 font-semibold">{profileSettingsMock.email}</p>
        </div>
        <button
          type="button"
          className="w-full rounded-2xl border border-[#e90052]/30 bg-[#e90052]/10 px-4 py-3 text-sm font-semibold text-[#f5a3c1]"
        >
          Cerrar sesión
        </button>
      </Card>
    </section>
  );
}
