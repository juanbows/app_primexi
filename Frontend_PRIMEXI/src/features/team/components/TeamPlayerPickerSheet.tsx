"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useMemo, useState } from "react";

import {
  LoaderCircle,
  Search,
  SearchX,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  TeamPlayer,
  TeamPlayerPosition,
} from "@/features/team/teamTypes";

interface TeamPlayerPickerSheetProps {
  open: boolean;
  position: TeamPlayerPosition | null;
  currentPlayer: TeamPlayer | null;
  players: TeamPlayer[];
  loading: boolean;
  error: string | null;
  selectedPlayerIds: Set<string>;
  onClose: () => void;
  onSelect: (player: TeamPlayer) => void;
}

const positionLabels: Record<TeamPlayerPosition, string> = {
  GK: "Portero",
  DEF: "Defensa",
  MID: "Mediocampista",
  FWD: "Delantero",
};

const statusLabel = {
  fit: { text: "Disponible", color: "#00ff85" },
  normal: { text: "Seguimiento", color: "#04f5ff" },
  doubt: { text: "Alerta", color: "#e90052" },
} as const;

export function TeamPlayerPickerSheet({
  open,
  position,
  currentPlayer,
  players,
  loading,
  error,
  selectedPlayerIds,
  onClose,
  onSelect,
}: TeamPlayerPickerSheetProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Cerrar selector de jugadores"
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            key={`${position ?? "slot"}-${currentPlayer?.id ?? "empty"}`}
            className="relative z-10 flex max-h-[82vh] w-full max-w-lg flex-col rounded-t-[2rem] border border-white/10 bg-gradient-to-b from-[#1a0020] to-[#0d000f] px-4 pb-6 pt-4 shadow-[0_-20px_45px_-30px_rgba(0,0,0,0.9)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0.16, duration: 0.55 }}
          >
            <PickerSheetContent
              position={position}
              currentPlayer={currentPlayer}
              players={players}
              loading={loading}
              error={error}
              selectedPlayerIds={selectedPlayerIds}
              onClose={onClose}
              onSelect={onSelect}
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function PickerSheetContent({
  position,
  currentPlayer,
  players,
  loading,
  error,
  selectedPlayerIds,
  onClose,
  onSelect,
}: Omit<TeamPlayerPickerSheetProps, "open">) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filteredPlayers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) =>
      `${player.name} ${player.teamName} ${player.team}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [deferredSearch, players]);

  return (
    <>
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
            Editor de cancha
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {position ? `Elegir ${positionLabels[position]}` : "Elegir jugador"}
          </h3>
          <p className="mt-1 text-sm text-white/55">
            {currentPlayer
              ? `Cambias a ${currentPlayer.shortName} por otro jugador disponible en Supabase.`
              : "Selecciona un jugador real para este hueco del once."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 p-2 text-white/60 transition-colors hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-4 block">
        <span className="sr-only">Buscar jugador</span>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#120015] px-3 py-2.5">
          <Search className="h-4 w-4 text-[#04f5ff]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Busca por nombre o equipo"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-8 text-white/70">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#00ff85]" />
            <span className="text-sm">Cargando candidatos desde Supabase...</span>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-3xl border border-[#e90052]/20 bg-[#e90052]/10 px-4 py-5 text-sm text-white/75">
            <div className="mb-2 flex items-center gap-2 text-[#e90052]">
              <ShieldAlert className="h-4 w-4" />
              <span className="font-semibold">No pudimos cargar esta posicion</span>
            </div>
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && !error && filteredPlayers.length === 0 ? (
          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-white/70">
            <SearchX className="h-5 w-5 text-[#04f5ff]" />
            <span className="text-sm">No hay jugadores con esa busqueda.</span>
          </div>
        ) : null}

        {!loading && !error && filteredPlayers.length > 0 ? (
          <div className="space-y-3">
            {filteredPlayers.map((player, index) => {
              const status = statusLabel[player.status];
              const alreadySelectedElsewhere =
                selectedPlayerIds.has(player.id) &&
                player.id !== currentPlayer?.id;

              return (
                <motion.button
                  key={player.id}
                  type="button"
                  disabled={alreadySelectedElsewhere}
                  onClick={() => onSelect(player)}
                  className="glass-panel w-full rounded-3xl border border-white/10 p-4 text-left transition-colors hover:border-[#00ff85]/20 disabled:cursor-not-allowed disabled:opacity-55"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {player.name}
                      </p>
                      <p className="text-sm text-white/55">
                        {player.teamName} · {player.position}
                      </p>
                    </div>

                    <span
                      className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                      style={{
                        color: status.color,
                        borderColor: `${status.color}50`,
                        backgroundColor: `${status.color}18`,
                      }}
                    >
                      {status.text}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <MetricBadge
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      label="Precio"
                      value={`£${player.price.toFixed(1)}`}
                      color="#04f5ff"
                    />
                    <MetricBadge
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Prop."
                      value={`${player.ownership.toFixed(1)}%`}
                      color="#7c3aed"
                    />
                    <MetricBadge
                      label="Forma"
                      value={player.form.toFixed(1)}
                      color="#00ff85"
                    />
                    <MetricBadge
                      label="Puntos"
                      value={String(player.totalPoints)}
                      color="#f7b500"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-white/45">
                      Proximo:{" "}
                      <span className="font-medium text-white/70">
                        {player.nextFixture}
                      </span>
                    </span>

                    {alreadySelectedElsewhere ? (
                      <span className="font-semibold text-[#e90052]">
                        Ya esta en tu once
                      </span>
                    ) : (
                      <span className="font-semibold text-[#00ff85]">
                        Reemplazar
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}

function MetricBadge({
  icon,
  label,
  value,
  color,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border px-2.5 py-2"
      style={{
        borderColor: `${color}20`,
        backgroundColor: `${color}08`,
      }}
    >
      <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wide" style={{ color }}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
