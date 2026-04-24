"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";

import type {
  TeamPlayer,
  TeamPlayerPosition,
  TeamPlayerStatus,
} from "@/features/team/teamTypes";

interface PlayerNodeProps {
  player: TeamPlayer | null;
  position: TeamPlayerPosition;
  index: number;
  disabled?: boolean;
  onTap: () => void;
}

const statusRingColor: Record<TeamPlayerStatus, string> = {
  fit: "#00ff85",
  normal: "#04f5ff",
  doubt: "#e90052",
};

export function PlayerNode({
  player,
  position,
  index,
  disabled = false,
  onTap,
}: PlayerNodeProps) {
  if (!player) {
    return (
      <motion.button
        type="button"
        disabled={disabled}
        className="relative flex min-h-[80px] min-w-[64px] flex-col items-center gap-1 text-white/70 disabled:cursor-not-allowed disabled:opacity-60"
        initial={{ opacity: 0, y: 16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.15 + index * 0.06,
          type: "spring",
          bounce: 0.3,
        }}
        whileTap={disabled ? undefined : { scale: 0.92 }}
        onClick={onTap}
      >
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/25 bg-[#15001a]/85">
          <Plus className="h-4 w-4 text-[#04f5ff]" />
        </div>

        <span className="max-w-[72px] text-center text-[10px] font-semibold leading-tight text-white/80">
          Anadir {position}
        </span>

        <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/50">
          Seleccionar
        </span>
      </motion.button>
    );
  }

  const ringColor = statusRingColor[player.status];
  return (
    <motion.button
      type="button"
      disabled={disabled}
      className="relative flex min-h-[80px] min-w-[64px] cursor-pointer flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: 0.15 + index * 0.06,
        type: "spring",
        bounce: 0.3,
      }}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      onClick={onTap}
    >
      {(player.isCaptain || player.isVice) && (
        <motion.span
          className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
          style={{
            background: player.isCaptain
              ? "linear-gradient(135deg, #00ff85, #04f5ff)"
              : "linear-gradient(135deg, #04f5ff, #7c3aed)",
            color: "#0b0b0b",
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {player.isCaptain ? "C" : "V"}
        </motion.span>
      )}

      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1a0020] to-[#2a0035]">
        <span className="text-xs font-bold text-white/80">
          {player.shortName.slice(0, 3).toUpperCase()}
        </span>
      </div>

      <span className="max-w-[64px] truncate text-center text-[10px] font-semibold leading-tight text-white/90">
        {player.shortName}
      </span>

      <motion.span
        className="rounded-lg border px-2 py-0.5 text-[9px] font-bold"
        style={{
          background: `${ringColor}18`,
          borderColor: `${ringColor}50`,
          color: ringColor,
          backdropFilter: "blur(4px)",
        }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {player.xP.toFixed(1)} xP
      </motion.span>

      <span className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/35">
        Cambiar
      </span>
    </motion.button>
  );
}
