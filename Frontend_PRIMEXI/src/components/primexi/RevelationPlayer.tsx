"use client";

import { Sparkles, Zap } from "lucide-react";
import { motion } from "motion/react";

type RevelationPlayerProps = {
  gameweek: number;
};

const revelations = [
  {
    name: "Gordon",
    team: "NEW",
    points: 12,
    achievement: "Impacto Sorpresivo y xG Alto",
  },
  {
    name: "Mbeumo",
    team: "BRE",
    points: 13,
    achievement: "Doblete inesperado",
  },
  {
    name: "Paqueta",
    team: "WHU",
    points: 11,
    achievement: "Gol y dominio del medio",
  },
] as const;

function getRevelationForGameweek(gameweek: number) {
  const index = (gameweek - 23) % revelations.length;
  return index >= 0 ? revelations[index] : revelations[0];
}

export function RevelationPlayer({ gameweek }: RevelationPlayerProps) {
  const revelation = getRevelationForGameweek(gameweek);

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
        </div>
      </motion.div>
    </motion.section>
  );
}
