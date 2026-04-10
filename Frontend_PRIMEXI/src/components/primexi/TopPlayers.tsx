"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Trophy, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import Slider from "react-slick";
import type { Settings } from "react-slick";
import { getTopPlayers, type PlayerRecord } from "@/services/homeService";

type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
  achievement: string;
  position: number;
  image: string;
};

type TopPlayersProps = {
  gameweek: number;
};

const positionColors = {
  1: {
    border: "border-[#04f5ff]",
    shadow: "shadow-[#04f5ff]/50",
    badge: "bg-gradient-to-br from-[#04f5ff] to-[#00ff85]",
    glow: "shadow-2xl shadow-[#04f5ff]/60",
  },
  2: {
    border: "border-[#00ff85]",
    shadow: "shadow-[#00ff85]/50",
    badge: "bg-gradient-to-br from-[#00ff85] to-[#04f5ff]",
    glow: "shadow-xl shadow-[#00ff85]/50",
  },
  3: {
    border: "border-[#e90052]",
    shadow: "shadow-[#e90052]/50",
    badge: "bg-gradient-to-br from-[#e90052] to-[#04f5ff]",
    glow: "shadow-xl shadow-[#e90052]/40",
  },
  4: {
    border: "border-[#04f5ff]/60",
    shadow: "shadow-[#04f5ff]/30",
    badge: "bg-gradient-to-br from-[#38003c] to-[#04f5ff]/80",
    glow: "shadow-lg shadow-[#04f5ff]/30",
  },
  5: {
    border: "border-[#00ff85]/60",
    shadow: "shadow-[#00ff85]/30",
    badge: "bg-gradient-to-br from-[#38003c] to-[#00ff85]/80",
    glow: "shadow-lg shadow-[#00ff85]/30",
  },
} as const;

const positionImages: Record<string, string> = {
  FWD: "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
  MID: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=400",
  DEF: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
  GK: "https://images.unsplash.com/photo-1765046876564-aa4034b6c71a?w=400",
};

function buildGameweekAchievement(player: PlayerRecord) {
  const metrics = [];

  if ((player.goals_scored ?? 0) > 0) {
    metrics.push(`${player.goals_scored}G`);
  }

  if ((player.assists ?? 0) > 0) {
    metrics.push(`${player.assists}A`);
  }

  if ((player.clean_sheets ?? 0) > 0) {
    metrics.push(`${player.clean_sheets}CS`);
  }

  metrics.push(`${player.minutes ?? 0} min`);

  return metrics.join(" | ");
}

function mapPlayerToCard(player: PlayerRecord, rank: number): Player {
  return {
    id: player.id,
    name: player.name,
    team: player.team,
    points: player.total_points ?? 0,
    achievement: buildGameweekAchievement(player),
    position: rank,
    image:
      player.photo ??
      positionImages[player.position] ??
      "https://images.unsplash.com/photo-1632300873131-1dd749c83f97?w=400",
  };
}

function PlayerCard({ player }: { player: Player }) {
  const colors = positionColors[player.position as keyof typeof positionColors];
  const isFirst = player.position === 1;

  return (
    <motion.div
      className="px-4 py-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`absolute left-1/2 top-4 z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full ${colors.badge} ${colors.shadow} shadow-lg`}
      >
        <span className="text-2xl font-bold text-white">{player.position}</span>
      </div>

      <motion.div
        className={`relative overflow-hidden rounded-3xl border-2 bg-gradient-to-b from-[#38003c]/90 to-[#38003c]/70 backdrop-blur-sm ${colors.border} ${colors.glow} ${isFirst ? "scale-105" : "scale-100"}`}
        whileHover={{ scale: isFirst ? 1.08 : 1.03 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative h-64 overflow-hidden">
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#38003c]" />
          <Image
            src={player.image}
            alt={player.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 420px"
          />
        </div>

        <div className="space-y-4 p-6">
          <div className="text-center">
            <h3 className="mb-2 text-3xl font-bold text-white">{player.name}</h3>
            <p className="text-lg text-white/70">({player.team})</p>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#00ff85]/40 bg-[#00ff85]/20 px-6 py-4">
            <TrendingUp className="h-7 w-7 text-[#00ff85]" />
            <span className="text-5xl font-bold text-[#00ff85]">{player.points}</span>
            <span className="text-xl text-[#00ff85]">PTS</span>
          </div>

          <p className="flex min-h-[3rem] items-center justify-center px-4 text-center text-base text-white/90">
            {player.achievement}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function TopPlayers({ gameweek }: TopPlayersProps) {
  const sliderRef = useRef<Slider | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTopPlayers() {
      setIsLoading(true);
      setErrorMessage(null);
      setPlayers([]);

      try {
        const topPlayers = await getTopPlayers(gameweek);

        if (!isMounted) {
          return;
        }

        setPlayers(
          topPlayers.map((player, index) => mapPlayerToCard(player, index + 1)),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los jugadores.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTopPlayers();

    return () => {
      isMounted = false;
    };
  }, [gameweek]);

  const settings: Settings = {
    dots: true,
    infinite: players.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    centerMode: true,
    centerPadding: "40px",
    dotsClass: "slick-dots !bottom-0",
    customPaging: () => (
      <div className="mt-4 h-2 w-2 rounded-full bg-white/30 transition-all hover:bg-[#00ff85]" />
    ),
  };

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      key={gameweek}
    >
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-[#04f5ff]" />
        <h2 className="text-xl font-bold text-white">Top 5 de la Jornada</h2>
      </div>

      {isLoading ? (
        <div className="h-[28rem] rounded-3xl border-2 border-white/10 bg-[#38003c]/50" />
      ) : errorMessage ? (
        <div className="rounded-3xl border-2 border-[#e90052]/30 bg-[#38003c]/70 p-6 text-center text-sm text-white/80">
          {errorMessage}
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-3xl border-2 border-white/10 bg-[#38003c]/50 p-6 text-center text-sm text-white/80">
          No hay jugadores disponibles para la jornada.
        </div>
      ) : (
        <div className="relative">
          <motion.button
            type="button"
            aria-label="Ver jugador anterior"
            onClick={() => sliderRef.current?.slickPrev()}
            className="absolute left-0 top-1/2 z-20 rounded-full border-2 border-[#00ff85] bg-[#00ff85]/90 p-3 text-[#38003c] shadow-lg shadow-[#00ff85]/50"
            whileHover={{ scale: 1.15, backgroundColor: "rgba(0, 255, 133, 1)" }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>

          <div className="relative -mx-4">
            <Slider ref={sliderRef} {...settings}>
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </Slider>
          </div>

          <motion.button
            type="button"
            aria-label="Ver siguiente jugador"
            onClick={() => sliderRef.current?.slickNext()}
            className="absolute right-0 top-1/2 z-20 rounded-full border-2 border-[#00ff85] bg-[#00ff85]/90 p-3 text-[#38003c] shadow-lg shadow-[#00ff85]/50"
            whileHover={{ scale: 1.15, backgroundColor: "rgba(0, 255, 133, 1)" }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        </div>
      )}
    </motion.section>
  );
}
