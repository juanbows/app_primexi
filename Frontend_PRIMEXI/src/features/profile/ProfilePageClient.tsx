"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Award, Settings, Trophy } from "lucide-react";

import { getGameweeks, getProfile, getTransfers } from "@/lib/data";
import { useAuthUser } from "@/lib/useAuthUser";

type ProfileData = {
  id: string;
  team_name: string;
  email: string;
};

type GameweekData = {
  id: string;
  gameweek: number;
  points: number;
};

type TransferData = {
  id: string;
  gameweek: number;
  player_in: string;
  player_out: string;
};

function buildInitials(teamName: string) {
  return teamName
    .split(" ")
    .map((token) => token[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfilePageClient() {
  const { user, loading: authLoading } = useAuthUser({ required: true, redirectTo: "/" });
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [gameweeks, setGameweeks] = useState<GameweekData[]>([]);
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [profileData, gameweeksData, transfersData] = await Promise.all([
          getProfile(),
          getGameweeks(),
          getTransfers(),
        ]);

        if (!mounted) return;

        setProfile(profileData);
        setGameweeks(gameweeksData ?? []);
        setTransfers(transfersData ?? []);
      } catch (error) {
        console.error("Failed to load profile page data", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (user) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  const totalPoints = useMemo(
    () => gameweeks.reduce((sum, entry) => sum + Number(entry.points || 0), 0),
    [gameweeks],
  );

  const latestGameweek = gameweeks[0];
  const initials = buildInitials(profile?.team_name || "Mi equipo");

  if (authLoading || loading || !user) {
    return <section className="pt-8 text-sm text-white/70">Cargando perfil...</section>;
  }

  return (
    <section className="space-y-6 pt-2">
      <header className="glass-panel flex items-center gap-4 rounded-3xl border-[#00ff85]/20 p-4 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#00ff85] via-[#7c3aed] to-[#00d4ff] p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#140015] text-lg font-semibold">
              {initials || "PX"}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Manager</p>
          <h1 className="text-xl font-semibold">{profile?.team_name ?? "Mi equipo"}</h1>
          <p className="text-sm text-white/70">{profile?.email ?? user.email}</p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Award className="h-4 w-4 text-[#00ff85]" />
            Puntos
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#140015] p-3">
              <p className="text-xs text-white/60">Totales</p>
              <p className="text-2xl font-semibold">{totalPoints.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-2xl bg-[#140015] p-3">
              <p className="text-xs text-white/60">Última GW</p>
              <p className="text-2xl font-semibold text-[#00ff85]">
                {latestGameweek ? latestGameweek.points : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#7c3aed]/30 bg-[#220024]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Trophy className="h-4 w-4 text-[#7c3aed]" />
            Historial de gameweeks
          </div>
          <p className="mt-3 text-sm text-white/70">{gameweeks.length} jornadas registradas</p>
          <Link
            href="/profile/gameweeks"
            className="mt-3 inline-flex rounded-full border border-[#00ff85]/30 bg-[#00ff85]/10 px-3 py-1 text-xs font-semibold text-[#b6ffe2]"
          >
            Ver historial
          </Link>
        </div>

        <div className="rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <ArrowRightLeft className="h-4 w-4 text-[#00ff85]" />
            Transfers recientes
          </div>
          <div className="mt-3 space-y-3">
            {transfers.slice(0, 3).map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between rounded-2xl bg-[#140015] px-3 py-2 text-sm"
              >
                <span className="text-[#b6ffe2]">{transfer.player_in}</span>
                <span className="text-white/40">GW {transfer.gameweek}</span>
                <span className="text-[#f0b3ff]">{transfer.player_out}</span>
              </div>
            ))}
            {transfers.length === 0 ? (
              <div className="rounded-2xl bg-[#140015] px-3 py-2 text-sm text-white/60">
                Aún no tienes transfers.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#18001f]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Accesos rápidos</p>
            <Link
              href="/profile/settings"
              className="inline-flex items-center gap-2 rounded-full border border-[#00ff85]/30 bg-[#00ff85]/10 px-3 py-1 text-[11px] font-semibold text-[#b6ffe2]"
            >
              <Settings className="h-3 w-3" />
              Ajustes
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Link
              href="/profile/gameweeks"
              className="rounded-2xl border border-white/10 bg-[#120015] px-3 py-3 text-left transition hover:border-[#00ff85]/30"
            >
              <p className="text-xs text-white/60">Puntos</p>
              <p className="mt-1 font-semibold">Historial GW</p>
            </Link>
            <Link
              href="/profile/transfers"
              className="rounded-2xl border border-white/10 bg-[#120015] px-3 py-3 text-left transition hover:border-[#00ff85]/30"
            >
              <p className="text-xs text-white/60">Transfers</p>
              <p className="mt-1 font-semibold">Historial</p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
