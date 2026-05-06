"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, Shield, Trash2, UserPlus } from "lucide-react";
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

type PositionPlayersPayload = {
  players?: TeamPlayer[];
  budgetCap?: number;
  error?: string;
};

const USER_TEAM_STORAGE_KEY = "primexi:user-team-slots";

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

function isStoredTeamPlayer(
  player: TeamPlayer | null | undefined,
  position: TeamPlayerPosition,
): player is TeamPlayer {
  return Boolean(
    player &&
      player.position === position &&
      typeof player.id === "string" &&
      Array.isArray(player.last5),
  );
}

function buildSlotsFromStoredSlots(storedSlots: TeamSlot[]) {
  const slots = buildEmptyTeamSlots();

  const hydratedSlots = slots.map((slot, index) => {
    const nextPlayer = storedSlots[index]?.player ?? null;
    return {
      ...slot,
      player: isStoredTeamPlayer(nextPlayer, slot.position) ? nextPlayer : null,
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
  const [budgetCap, setBudgetCap] = useState(FPL_BUDGET_CAP);
  const [slots, setSlots] = useState<TeamSlot[]>(() => buildEmptyTeamSlots());
  const [storageReady, setStorageReady] = useState(false);
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
  const filledSlotCount = useMemo(
    () => slots.filter((slot) => slot.player !== null).length,
    [slots],
  );
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

      if (payload.budgetCap !== undefined) {
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
    try {
      const storedTeam = window.localStorage.getItem(USER_TEAM_STORAGE_KEY);

      if (!storedTeam) {
        return;
      }

      const parsedSlots = JSON.parse(storedTeam) as TeamSlot[];

      if (Array.isArray(parsedSlots)) {
        setSlots(buildSlotsFromStoredSlots(parsedSlots));
      }
    } catch {
      try {
        window.localStorage.removeItem(USER_TEAM_STORAGE_KEY);
      } catch {
        // Ignore storage failures; the team builder still works in memory.
      }
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    try {
      window.localStorage.setItem(USER_TEAM_STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // Local storage can be unavailable in private browsing modes.
    }
  }, [slots, storageReady]);

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

  function handleClearActiveSlot() {
    if (activeSlotIndex === null) {
      return;
    }

    setSlots((currentSlots) =>
      applyLeadershipToSlots(
        currentSlots.map((slot, index) =>
          index === activeSlotIndex
            ? {
                ...slot,
                player: null,
              }
            : slot,
        ),
      ),
    );
    setPickerOpen(false);
  }

  function handleClearTeam() {
    setSlots(buildEmptyTeamSlots());
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
            {TEAM_FORMATION}
          </span>
        </motion.div>

        <TeamStats
          totalXP={totalXP}
          teamValue={teamValue}
          last5Form={last5Form}
          budgetCap={budgetCap}
          budgetExceeded={budgetExceeded}
          filledPlayersCount={filledSlotCount}
        />

        <motion.div
          className="glass-panel flex items-start gap-3 rounded-2xl border border-[#04f5ff]/20 bg-[#04f5ff]/10 px-4 py-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[#04f5ff]/25 bg-[#04f5ff]/10">
            <UserPlus className="h-4 w-4 text-[#04f5ff]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {filledSlotCount === 0
                    ? "Tu once aun esta vacio"
                    : `${filledSlotCount}/${slots.length} puestos elegidos`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  {filledSlotCount === 0
                    ? "Toca cualquier puesto de la cancha para elegir jugadores reales y armar tu equipo."
                    : "Sigue completando los puestos que faltan o toca un jugador para cambiarlo."}
                </p>
              </div>

              {filledSlotCount > 0 ? (
                <button
                  type="button"
                  onClick={handleClearTeam}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/65 transition-colors hover:border-[#e90052]/30 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>

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
                    onTap={() => openPicker(index + row.start)}
                  />
                </div>
              ))}
            </div>
          ))}
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
          <span className="text-[10px] font-medium text-white/70">Equipo</span>
          <span className="text-[10px] font-bold text-[#00ff85]">
            {filledSlotCount}/{slots.length} elegidos
          </span>
          {filledSlotCount > 0 ? (
            <span className="text-[10px] font-medium text-white/45">
              {fitPlayersCount} disponibles
            </span>
          ) : null}
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
        onClear={handleClearActiveSlot}
      />
    </>
  );
}
