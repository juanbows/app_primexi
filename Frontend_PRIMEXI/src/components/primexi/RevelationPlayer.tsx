"use client";

import { useEffect, useState } from "react";

import { Sparkles, Zap } from "lucide-react";
import { motion } from "motion/react";
import {
  getRevelationPlayer,
  type PlayerRecord,
} from "@/services/homeService";

type RevelationPlayerProps = {
  gameweek: number;
};

type RevelationCardData = {
  name: string;
  team: string;
  points: number;
  achievement: string;
};

function formatPrice(price: number | string) {
  return Number(price).toFixed(1);
}

function buildRevelationAchievement(player: PlayerRecord) {
  const metrics = [`Forma ${Number(player.form ?? 0).toFixed(1)}`];
  metrics.push(`${Number(player.selected_by_percent ?? 0).toFixed(1)}% sel`);
  metrics.push(`Precio ${formatPrice(player.price)}m`);

  if (
    player.chance_of_playing_next_round !== null &&
    player.chance_of_playing_next_round < 100
  ) {
    metrics.push(`${player.chance_of_playing_next_round}% juega`);
  }

  return metrics.join(" | ");
}

function mapRevelationPlayer(player: PlayerRecord): RevelationCardData {
  return {
    name: player.name,
    team: player.team,
    points: player.event_points ?? 0,
    achievement: buildRevelationAchievement(player),
  };
}

export function RevelationPlayer({ gameweek }: RevelationPlayerProps) {
  const [revelation, setRevelation] = useState<RevelationCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRevelationPlayer() {
      setIsLoading(true);
      setErrorMessage(null);
      setRevelation(null);

      try {
        const player = await getRevelationPlayer(gameweek);

        if (!isMounted) {
          return;
        }

        setRevelation(player ? mapRevelationPlayer(player) : null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el jugador revelacion.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRevelationPlayer();

    return () => {
      isMounted = false;
    };
  }, [gameweek]);

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      key={gameweek}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-[#e90052]" />
        <h2 className="text-xl font-bold text-white">Jugador Revelacion</h2>
      </div>

      <motion.div
        className="relative overflow-hidden rounded-3xl border-2 border-[#e90052]/50 bg-gradient-to-br from-[#e90052]/20 via-[#38003c] to-[#e90052]/20 p-6"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#e90052]/10 to-[#04f5ff]/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute right-4 top-4"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-6 w-6 text-[#00ff85]" />
        </motion.div>

        <motion.div
          className="absolute bottom-4 left-4"
          animate={{ scale: [1, 1.3, 1], rotate: [360, 180, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-5 w-5 text-[#04f5ff]" />
        </motion.div>

        <div className="relative z-10 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="mx-auto h-10 w-44 rounded-full bg-white/10" />
              <div className="mx-auto h-16 w-40 rounded-2xl bg-white/10" />
              <div className="mx-auto h-5 w-56 rounded-full bg-white/10" />
            </div>
          ) : errorMessage ? (
            <p className="text-center text-sm text-white/80">{errorMessage}</p>
          ) : revelation ? (
            <>
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <h3 className="mb-1 text-3xl font-bold text-white">
                    {revelation.name}
                  </h3>
                  <p className="text-sm text-[#04f5ff]">({revelation.team})</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#e90052]/40 bg-gradient-to-r from-[#e90052]/30 to-[#04f5ff]/30 px-6 py-4 shadow-lg shadow-[#e90052]/30">
                <Zap className="h-8 w-8 text-[#00ff85]" />
                <span className="bg-gradient-to-r from-[#00ff85] to-[#04f5ff] bg-clip-text text-5xl font-bold text-transparent">
                  {revelation.points}
                </span>
                <span className="text-xl text-[#00ff85]">PTS</span>
              </div>

              <div className="flex items-center justify-center gap-2 text-center">
                <Sparkles className="h-4 w-4 text-[#00ff85]" />
                <p className="text-sm font-medium text-white">
                  {revelation.achievement}
                </p>
                <Sparkles className="h-4 w-4 text-[#00ff85]" />
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-white/80">
              No hay jugador revelacion disponible.
            </p>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}
