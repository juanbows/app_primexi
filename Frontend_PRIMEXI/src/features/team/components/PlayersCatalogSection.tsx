"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Filter, LoaderCircle, SearchX, ShieldAlert, Trophy } from "lucide-react";

type PositionFilter = "GK" | "DEF" | "MID" | "FWD";

type TeamCatalogPlayer = {
  id: string;
  fplId: number;
  name: string;
  fullName: string;
  team: string;
  teamName: string;
  position: string;
  positionLabel: string;
  price: number | null;
  totalPoints: number;
  form: number | null;
  ownership: number | null;
  status: string | null;
  photo: string | null;
};

type TeamCatalogTeam = {
  id: string;
  name: string;
  shortName: string;
};

function getTeamLabel(team: TeamCatalogTeam) {
  return team.name || team.shortName || "Equipo";
}

const positionFilters: Array<{ value: PositionFilter; label: string }> = [
  { value: "GK", label: "Porteros" },
  { value: "DEF", label: "Defensas" },
  { value: "MID", label: "Mediocampistas" },
  { value: "FWD", label: "Delanteros" },
];

function formatDecimal(value: number | null, digits = 1) {
  if (value === null) {
    return "--";
  }

  return value.toFixed(digits);
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "a":
      return { text: "Disponible", styles: "border-[#00ff85]/30 bg-[#00ff85]/10 text-[#00ff85]" };
    case "d":
      return { text: "Duda", styles: "border-[#f7b500]/30 bg-[#f7b500]/10 text-[#f7b500]" };
    case "i":
      return { text: "Lesionado", styles: "border-[#e90052]/30 bg-[#e90052]/10 text-[#e90052]" };
    case "s":
      return { text: "Suspendido", styles: "border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]" };
    default:
      return { text: "Sin dato", styles: "border-white/15 bg-white/5 text-white/60" };
  }
}

export function PlayersCatalogSection() {
  const [selectedPosition, setSelectedPosition] = useState<PositionFilter | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [players, setPlayers] = useState<TeamCatalogPlayer[]>([]);
  const [teams, setTeams] = useState<TeamCatalogTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const teamsRef = useRef<HTMLDivElement | null>(null);
  const hasActiveFilters = selectedPosition !== null || selectedTeamId !== null;

  function scrollFilters(
    container: HTMLDivElement | null,
    direction: "left" | "right",
    amount = 180,
  ) {
    container?.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    let ignore = false;

    async function loadTeams() {
      setTeamsError(null);

      try {
        const response = await fetch("/api/equipo/equipos", {
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          teams?: TeamCatalogTeam[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar los equipos.");
        }

        if (!ignore) {
          setTeams(payload.teams ?? []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setTeams([]);
          setTeamsError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudieron cargar los equipos.",
          );
        }
      }
    }

    void loadTeams();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadPlayers() {
      if (!hasActiveFilters) {
        if (!ignore) {
          setPlayers([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();

        if (selectedPosition) {
          searchParams.set("position", selectedPosition);
        }

        if (selectedTeamId) {
          searchParams.set("teamId", selectedTeamId);
        }

        const queryString = searchParams.toString();
        const response = await fetch(`/api/equipo/jugadores${queryString ? `?${queryString}` : ""}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          players?: TeamCatalogPlayer[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar los jugadores.");
        }

        if (!ignore) {
          setPlayers(payload.players ?? []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setPlayers([]);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudieron cargar los jugadores.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadPlayers();

    return () => {
      ignore = true;
    };
  }, [hasActiveFilters, selectedPosition, selectedTeamId]);

  const selectedTeam =
    selectedTeamId === null
      ? null
      : teams.find((team) => team.id === selectedTeamId) ?? null;
  const selectedTeamDisplayName = selectedTeam?.name ?? selectedTeam?.shortName ?? null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Filter className="h-5 w-5 text-[#00ff85]" />
        <h2 className="text-lg font-bold text-white">Jugadores</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Posicion
          </p>
          <p className="text-xs text-white/45">
            {selectedPosition ? "Pulsa de nuevo para quitar el filtro" : "Mostrando todas las posiciones"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollFilters(filtersRef.current, "left")}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#00ff85]/30 hover:text-[#00ff85]"
            aria-label="Ver posiciones anteriores"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={filtersRef}
            className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {positionFilters.map((filter) => {
              const isActive = filter.value === selectedPosition;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setSelectedPosition((currentPosition) =>
                      currentPosition === filter.value ? null : filter.value,
                    )
                  }
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-[#00ff85]/40 bg-[#00ff85]/15 text-[#00ff85]"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollFilters(filtersRef.current, "right")}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#00ff85]/30 hover:text-[#00ff85]"
            aria-label="Ver mas posiciones"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Equipo
          </p>
          {selectedTeam ? (
            <button
              type="button"
              onClick={() => setSelectedTeamId(null)}
              className="text-xs font-medium text-[#04f5ff] transition-colors hover:text-white"
            >
              Limpiar equipo
            </button>
          ) : (
            <p className="text-xs text-white/45">Filtra por un club concreto</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollFilters(teamsRef.current, "left", 220)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#04f5ff]/30 hover:text-[#04f5ff]"
            aria-label="Ver equipos anteriores"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={teamsRef}
            className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {teams.map((team) => {
              const isActive = team.id === selectedTeamId;

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() =>
                    setSelectedTeamId((currentTeamId) =>
                      currentTeamId === team.id ? null : team.id,
                    )
                  }
                  aria-pressed={isActive}
                  title={`${team.name} · ${team.shortName}`}
                  className={`min-w-[6.75rem] flex-shrink-0 rounded-full border px-5 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-[#04f5ff]/40 bg-[#04f5ff]/15 text-[#04f5ff]"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {getTeamLabel(team)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollFilters(teamsRef.current, "right", 220)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#04f5ff]/30 hover:text-[#04f5ff]"
            aria-label="Ver mas equipos"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {selectedTeam ? (
          <p className="px-1 text-xs text-white/55">
            Mostrando jugadores de {selectedTeamDisplayName}.
          </p>
        ) : null}

        {teamsError ? (
          <p className="px-1 text-xs text-[#e90052]/75">{teamsError}</p>
        ) : null}
      </div>

      {hasActiveFilters && loading ? (
        <div className="glass-panel flex items-center justify-center gap-3 rounded-3xl border-white/10 px-4 py-8 text-white/70">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#00ff85]" />
          <span className="text-sm">Cargando jugadores...</span>
        </div>
      ) : null}

      {hasActiveFilters && !loading && error ? (
        <div className="glass-panel rounded-3xl border-[#e90052]/20 px-4 py-5 text-sm text-white/75">
          <div className="mb-2 flex items-center gap-2 text-[#e90052]">
            <ShieldAlert className="h-4 w-4" />
            <span className="font-semibold">No pudimos traer los jugadores</span>
          </div>
          <p>{error}</p>
          <p className="mt-2 text-xs text-white/55">
            Revisa que el entorno local tenga `NEXT_PUBLIC_SUPABASE_URL` y
            `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
          </p>
        </div>
      ) : null}

      {hasActiveFilters && !loading && !error && players.length === 0 ? (
        <div className="glass-panel flex items-center gap-3 rounded-3xl border-white/10 px-4 py-6 text-white/70">
          <SearchX className="h-5 w-5 text-[#04f5ff]" />
          <span className="text-sm">No hay jugadores para la combinacion de filtros actual.</span>
        </div>
      ) : null}

      {hasActiveFilters && !loading && !error && players.length > 0 ? (
        <div className="space-y-3">
          {players.map((player, index) => {
            const status = getStatusLabel(player.status);

            return (
              <article
                key={player.id}
                className="glass-panel rounded-3xl border-white/10 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                        #{index + 1}
                      </p>
                      <h3 className="truncate text-base font-semibold text-white">
                        {player.fullName}
                      </h3>
                      <p className="text-sm text-white/55">
                        {player.teamName} · {player.position}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status.styles}`}
                    >
                      {status.text}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <StatBadge
                      label="Precio"
                      value={player.price === null ? "--" : `£${player.price.toFixed(1)}`}
                      accent="text-[#04f5ff]"
                    />
                    <StatBadge
                      label="Puntos"
                      value={String(player.totalPoints)}
                      accent="text-[#00ff85]"
                      icon={<Trophy className="h-3.5 w-3.5" />}
                    />
                    <StatBadge
                      label="Forma"
                      value={formatDecimal(player.form)}
                      accent="text-[#f7b500]"
                    />
                    <StatBadge
                      label="Ownership"
                      value={player.ownership === null ? "--" : `${player.ownership.toFixed(1)}%`}
                      accent="text-white"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function StatBadge({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#140016] px-3 py-2">
      <div className={`mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide ${accent}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
