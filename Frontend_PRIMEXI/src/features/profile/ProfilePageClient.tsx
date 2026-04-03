"use client";

import { ArrowRightLeft, Award, Shield, Star, Trophy, Users } from "lucide-react";

import { managerProfileMock } from "@/lib/mocks/fpl";

export function ProfilePageClient() {
  const totalPointsLabel = managerProfileMock.totalPoints.toLocaleString("es-CO");

  return (
    <section className="space-y-6 pt-2">
      <header className="glass-panel flex items-center gap-4 rounded-3xl border-[#00ff85]/20 p-4 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#00ff85] via-[#7c3aed] to-[#00d4ff] p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#140015] text-lg font-semibold">
              {managerProfileMock.initials}
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-[#00ff85] px-2 py-0.5 text-[10px] font-semibold text-[#0b0b0b]">
            ACTIVE
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Manager</p>
          <h1 className="text-xl font-semibold">{managerProfileMock.managerName}</h1>
          <p className="text-sm text-white/70">{managerProfileMock.teamName}</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#00ff85]/40 bg-[#00ff85]/10 px-2 py-1 text-[11px] font-medium text-[#b6ffe2]">
            <Star className="h-3 w-3" />
            {managerProfileMock.formLabel}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="rounded-3xl border border-[#7c3aed]/30 bg-[#220024]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Trophy className="h-4 w-4 text-[#7c3aed]" />
              Ranking global
            </div>
            <span className="rounded-full bg-[#7c3aed]/20 px-2 py-1 text-xs text-[#d9b7ff]">
              Elite
            </span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-3xl font-semibold">{managerProfileMock.overallRank}</p>
            <p className="text-xs text-white/60">{managerProfileMock.overallPopulation}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
            <Users className="h-4 w-4 text-[#00ff85]" />
            Liga privada: <span className="text-white">{managerProfileMock.privateLeagueRank}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Award className="h-4 w-4 text-[#00ff85]" />
            Puntos
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#140015] p-3">
              <p className="text-xs text-white/60">Totales</p>
              <p className="text-2xl font-semibold">{totalPointsLabel}</p>
            </div>
            <div className="rounded-2xl bg-[#140015] p-3">
              <p className="text-xs text-white/60">GW actual</p>
              <p className="text-2xl font-semibold text-[#00ff85]">
                {managerProfileMock.currentGameweekPoints}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#7c3aed]/30 bg-[#220024]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Shield className="h-4 w-4 text-[#7c3aed]" />
            Capitan actual
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#111827] to-[#1f2937] p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#140015] text-xs text-white/60">
                IMG
              </div>
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">{managerProfileMock.currentCaptain}</p>
              <p className="text-xs text-white/60">{managerProfileMock.currentCaptainNote}</p>
            </div>
            <span className="rounded-full bg-[#00ff85]/20 px-2 py-1 text-xs text-[#b6ffe2]">C</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#00ff85]/20 bg-[#1b001c]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <ArrowRightLeft className="h-4 w-4 text-[#00ff85]" />
            Transfers recientes
          </div>
          <div className="mt-3 space-y-3">
            {managerProfileMock.recentTransfers.map((transfer) => (
              <div
                key={`${transfer.inPlayer}-${transfer.outPlayer}`}
                className="flex items-center justify-between rounded-2xl bg-[#140015] px-3 py-2 text-sm"
              >
                <span className="text-[#b6ffe2]">{transfer.inPlayer}</span>
                <span className="text-white/40">→</span>
                <span className="text-[#f0b3ff]">{transfer.outPlayer}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
