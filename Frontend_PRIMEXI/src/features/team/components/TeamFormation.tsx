"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  LoaderCircle,
  RefreshCcw,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { motion } from "motion/react";

import { PlayerNode } from "@/features/team/components/PlayerNode";
import { TeamPlayerPickerSheet } from "@/features/team/components/TeamPlayerPickerSheet";
import { TeamStats } from "@/features/team/components/TeamStats";
import {
  buildEmptyTeamSlots,
  FPL_BUDGET_CAP,
  TEAM_FORMATION,
  teamFormationRows,
} from "@/features/team/teamTypes";
import type {
  TeamPlayer,
  TeamPlayerPosition,
  TeamSlot,
} from "@/features/team/teamTypes";

type InitialSquadPayload = {
  formation?: string;
  budgetCap?: number;
  squad?: TeamPlayer[];
  error?: string;
};

type PositionPlayersPayload = {
  players?: TeamPlayer[];
  budgetCap?: number;
  error?: string;
};

function applyLeadershipToSlots(slots: TeamSlot[]) {
  const rankedSlots = slots
    .map((slot, index) => ({
      index,
      player: slot.player,
    }))
    .filter(
      (
        slot,
      ): slot is {
        index: number;
        player: TeamPlayer;
      } => slot.player !== null,
    )
    .sort((left, right) => right.player.xP - left.player.xP);

  const captainSlotIndex = rankedSlots[0]?.index ?? null;
  const viceSlotIndex = rankedSlots[1]?.index ?? null;

  return slots.map((slot, index) => ({
    ...slot,
    player: slot.player
      ? {
          ...slot.player,
          isCaptain: captainSlotIndex === index,
          isVice: viceSlotIndex === index,
        }
      : null,
  }));
}

function buildSlotsFromSquad(squad: TeamPlayer[]) {
  const slots = buildEmptyTeamSlots();
  const playersByPosition = new Map<TeamPlayerPosition, TeamPlayer[]>();

  squad.forEach((player) => {
    const currentPlayers = playersByPosition.get(player.position) ?? [];
    currentPlayers.push(player);
    playersByPosition.set(player.position, currentPlayers);
  });

  const hydratedSlots = slots.map((slot) => {
    const nextPlayer = playersByPosition.get(slot.position)?.shift() ?? null;
    return {
      ...slot,
      player: nextPlayer,
    };
  });

  return applyLeadershipToSlots(hydratedSlots);
}

function buildLast5TeamForm(slots: TeamSlot[]) {
  const filledPlayers = slots
    .map((slot) => slot.player)
    .filter((player): player is TeamPlayer => player !== null);

  return Array.from({ length: 5 }, (_, index) =>
    filledPlayers.reduce(
      (total, player) => total + (player.last5[index] ?? 0),
      0,
    ),
  );
}

export function TeamFormation() {
  const [formation, setFormation] = useState(TEAM_FORMATION);
  const [budgetCap, setBudgetCap] = useState(FPL_BUDGET_CAP);
  const [slots, setSlots] = useState<TeamSlot[]>(() => buildEmptyTeamSlots());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [candidateCache, setCandidateCache] = useState<
    Partial<Record<TeamPlayerPosition, TeamPlayer[]>>
  >({});

  const rows = useMemo(
    () =>
      teamFormationRows.map((row) => ({
        ...row,
        slots: slots.slice(row.start, row.start + row.count),
      })),
    [slots],
  );

  const totalXP = useMemo(
    () =>
      slots.reduce(
        (sum, slot) => sum + (slot.player?.xP ?? 0),
        0,
      ),
    [slots],
  );
  const teamValue = useMemo(
    () =>
      slots.reduce(
        (sum, slot) => sum + (slot.player?.price ?? 0),
        0,
      ),
    [slots],
  );
  const last5Form = useMemo(() => buildLast5TeamForm(slots), [slots]);
  const fitPlayersCount = useMemo(
    () =>
      slots.filter((slot) => slot.player?.status === "fit").length,
    [slots],
  );
  const budgetExceeded = teamValue > budgetCap;
  const budgetOverflow = Math.max(teamValue - budgetCap, 0);
  const activeSlot = activeSlotIndex === null ? null : slots[activeSlotIndex] ?? null;
  const pickerPlayers = activeSlot
    ? candidateCache[activeSlot.position] ?? []
    : [];
  const selectedPlayerIds = useMemo(
    () =>
      new Set(
        slots
          .map((slot) => slot.player?.id)
          .filter((playerId): playerId is string => Boolean(playerId)),
      ),
    [slots],
  );

  async function loadInitialSquad() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/equipo/plantilla", {
        cache: "no-store",
      });
      const payload = (await response.json()) as InitialSquadPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo cargar tu equipo.");
      }

      setFormation(payload.formation ?? TEAM_FORMATION);
      setBudgetCap(payload.budgetCap ?? FPL_BUDGET_CAP);
      setSlots(buildSlotsFromSquad(payload.squad ?? []));
    } catch (fetchError) {
      setSlots(buildEmptyTeamSlots());
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "No se pudo cargar tu equipo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCandidates(position: TeamPlayerPosition) {
    setPickerLoading(true);
    setPickerError(null);

    try {
      const response = await fetch(`/api/equipo/plantilla?position=${position}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as PositionPlayersPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar los jugadores.");
      }

      setCandidateCache((currentCache) => ({
        ...currentCache,
        [position]: payload.players ?? [],
      }));

      if (payload.budgetCap) {
        setBudgetCap(payload.budgetCap);
      }
    } catch (fetchError) {
      setPickerError(
        fetchError instanceof Error
          ? fetchError.message
          : "No se pudieron cargar los jugadores.",
      );
    } finally {
      setPickerLoading(false);
    }
  }

  useEffect(() => {
    loadInitialSquad();
  }, []);

  function openPicker(slotIndex: number) {
    const slot = slots[slotIndex];

    if (!slot) {
      return;
    }

    setActiveSlotIndex(slotIndex);
    setPickerOpen(true);

    if (!candidateCache[slot.position]) {
      void loadCandidates(slot.position);
    } else {
      setPickerError(null);
      setPickerLoading(false);
    }
  }

  function handlePickPlayer(player: TeamPlayer) {
    if (activeSlotIndex === null) {
      return;
    }

    setSlots((currentSlots) =>
      applyLeadershipToSlots(
        currentSlots.map((slot, index) =>
          index === activeSlotIndex
            ? {
                ...slot,
                player,
              }
            : slot,
        ),
      ),
    );
    setPickerOpen(false);
  }

  return (
    <>
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="flex items-center gap-2 px-1"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Shield className="h-5 w-5 text-[#04f5ff]" />
          <h2 className="text-lg font-bold text-white">Mi Equipo</h2>
          <span className="ml-auto rounded-lg border border-white/10 px-2 py-0.5 text-xs text-white/40">
            {formation}
          </span>
        </motion.div>

        <TeamStats
          totalXP={totalXP}
          teamValue={teamValue}
          last5Form={last5Form}
          budgetCap={budgetCap}
          budgetExceeded={budgetExceeded}
        />

        {budgetExceeded ? (
          <motion.div
            className="glass-panel flex items-start gap-3 rounded-2xl border border-[#e90052]/25 bg-[#e90052]/10 px-4 py-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#e90052]" />
            <div>
              <p className="text-sm font-semibold text-white">
                Te pasaste del presupuesto FPL
              </p>
              <p className="text-xs text-white/65">
                Tu once vale £{teamValue.toFixed(1)} y supera el maximo de £
                {budgetCap.toFixed(1)} por £{budgetOverflow.toFixed(1)}.
              </p>
            </div>
          </motion.div>
        ) : null}

        {error ? (
          <div className="glass-panel rounded-2xl border border-[#e90052]/20 bg-[#e90052]/10 px-4 py-4 text-sm text-white/75">
            <div className="mb-2 flex items-center gap-2 text-[#e90052]">
              <ShieldAlert className="h-4 w-4" />
              <span className="font-semibold">No pudimos montar tu once</span>
            </div>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadInitialSquad()}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:text-white"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        ) : null}

        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[#00ff85]/15"
          style={{
            background:
              "linear-gradient(180deg, #0a3d1a 0%, #0d4f22 30%, #0a3d1a 60%, #0d4f22 100%)",
            aspectRatio: "3/4.2",
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <svg
            className="absolute inset-0 h-full w-full opacity-15"
            viewBox="0 0 300 420"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="10" y="10" width="280" height="400" rx="4" stroke="white" strokeWidth="1.5" />
            <line x1="10" y1="210" x2="290" y2="210" stroke="white" strokeWidth="1.5" />
            <circle cx="150" cy="210" r="45" stroke="white" strokeWidth="1.5" />
            <circle cx="150" cy="210" r="3" fill="white" />
            <rect x="60" y="10" width="180" height="75" stroke="white" strokeWidth="1.5" />
            <rect x="100" y="10" width="100" height="30" stroke="white" strokeWidth="1.5" />
            <path d="M 100 85 Q 150 110 200 85" stroke="white" strokeWidth="1.5" fill="none" />
            <rect x="60" y="335" width="180" height="75" stroke="white" strokeWidth="1.5" />
            <rect x="100" y="380" width="100" height="30" stroke="white" strokeWidth="1.5" />
            <path d="M 100 335 Q 150 310 200 335" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M 10 20 Q 20 10 30 10" stroke="white" strokeWidth="1" fill="none" />
            <path d="M 270 10 Q 280 10 290 20" stroke="white" strokeWidth="1" fill="none" />
            <path d="M 10 400 Q 20 410 30 410" stroke="white" strokeWidth="1" fill="none" />
            <path d="M 270 410 Q 280 410 290 400" stroke="white" strokeWidth="1" fill="none" />
          </svg>

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(180deg, transparent, transparent 24.5%, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.02) 25.5%, transparent 26%)",
            }}
          />

          {rows.map((row) => (
            <div
              key={row.label}
              className="absolute left-0 right-0 flex items-center justify-center gap-1"
              style={{
                top: `${row.top}%`,
                transform: "translateY(-50%)",
                padding: "0 8px",
              }}
            >
              {row.slots.map((slot, index) => (
                <div key={slot.id} className="flex flex-1 justify-center">
                  <PlayerNode
                    player={slot.player}
                    position={slot.position}
                    index={index + row.start}
                    disabled={loading}
                    onTap={() => openPicker(index + row.start)}
                  />
                </div>
              ))}
            </div>
          ))}

          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#041309]/30 backdrop-blur-[2px]">
              <div className="rounded-3xl border border-white/10 bg-[#120015]/80 px-5 py-4 text-center text-white/75">
                <LoaderCircle className="mx-auto mb-3 h-5 w-5 animate-spin text-[#00ff85]" />
                <p className="text-sm font-semibold text-white">Cargando once real</p>
                <p className="mt-1 text-xs text-white/55">
                  Estamos trayendo jugadores disponibles desde Supabase.
                </p>
              </div>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          className="mx-auto -mt-1 flex w-fit items-center gap-2 rounded-full border border-[#00ff85]/20 bg-[#0a3d1a]/80 px-3 py-1.5 backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            className="h-2 w-2 rounded-full bg-[#00ff85]"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[10px] font-medium text-white/70">Pulso del Equipo</span>
          <span className="text-[10px] font-bold text-[#00ff85]">
            {fitPlayersCount}/{slots.length} disponibles
          </span>
        </motion.div>
      </motion.div>

      <TeamPlayerPickerSheet
        open={pickerOpen}
        position={activeSlot?.position ?? null}
        currentPlayer={activeSlot?.player ?? null}
        players={pickerPlayers}
        loading={pickerLoading}
        error={pickerError}
        selectedPlayerIds={selectedPlayerIds}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickPlayer}
      />
    </>
  );
}
