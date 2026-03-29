"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

type WeekSelectorProps = {
  currentGameweek: number;
  onGameweekChange: (gw: number) => void;
};

export function WeekSelector({
  currentGameweek,
  onGameweekChange,
}: WeekSelectorProps) {
  const handlePrevious = () => {
    if (currentGameweek > 1) {
      onGameweekChange(currentGameweek - 1);
    }
  };

  const handleNext = () => {
    if (currentGameweek < 38) {
      onGameweekChange(currentGameweek + 1);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <motion.button
        type="button"
        aria-label="Ir a la jornada anterior"
        onClick={handlePrevious}
        disabled={currentGameweek === 1}
        className={`rounded-xl p-3 transition-all ${
          currentGameweek === 1
            ? "cursor-not-allowed bg-[#38003c]/30 text-white/30"
            : "border border-[#00ff85]/30 bg-[#38003c]/60 text-[#00ff85] hover:bg-[#38003c]/80"
        }`}
        whileHover={currentGameweek > 1 ? { scale: 1.05 } : undefined}
        whileTap={currentGameweek > 1 ? { scale: 0.95 } : undefined}
      >
        <ChevronLeft className="h-6 w-6" />
      </motion.button>

      <motion.div
        className="flex-1 rounded-2xl bg-gradient-to-r from-[#00ff85] to-[#04f5ff] p-4 text-center"
        key={currentGameweek}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="mb-1 text-sm font-medium text-[#38003c]">Jornada</p>
        <p className="text-3xl font-bold text-[#38003c]">GW {currentGameweek}</p>
      </motion.div>

      <motion.button
        type="button"
        aria-label="Ir a la jornada siguiente"
        onClick={handleNext}
        disabled={currentGameweek === 38}
        className={`rounded-xl p-3 transition-all ${
          currentGameweek === 38
            ? "cursor-not-allowed bg-[#38003c]/30 text-white/30"
            : "border border-[#00ff85]/30 bg-[#38003c]/60 text-[#00ff85] hover:bg-[#38003c]/80"
        }`}
        whileHover={currentGameweek < 38 ? { scale: 1.05 } : undefined}
        whileTap={currentGameweek < 38 ? { scale: 0.95 } : undefined}
      >
        <ChevronRight className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
