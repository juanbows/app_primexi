"use client";

import Image from "next/image";
import { motion } from "motion/react";

import type { TeamPlayer, TeamPlayerStatus } from "@/lib/mocks/fpl";

interface PlayerNodeProps {
  player: TeamPlayer;
  index: number;
  onTap: (player: TeamPlayer) => void;
}

const statusRingColor: Record<TeamPlayerStatus, string> = {
  fit: "#00ff85",
  normal: "#04f5ff",
  doubt: "#e90052",
};

const statusGlow: Record<TeamPlayerStatus, string> = {
  fit: "drop-shadow(0 0 8px rgba(0,255,133,0.6))",
  normal: "drop-shadow(0 0 6px rgba(4,245,255,0.4))",
  doubt: "drop-shadow(0 0 8px rgba(233,0,82,0.6))",
};

export function PlayerNode({ player, index, onTap }: PlayerNodeProps) {
  const ringColor = statusRingColor[player.status];
  const glow = statusGlow[player.status];

  return (
    <motion.button
      type="button"
      className="relative flex min-h-[80px] min-w-[64px] cursor-pointer flex-col items-center gap-1"
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: 0.15 + index * 0.06,
        type: "spring",
        bounce: 0.3,
      }}
      whileTap={{ scale: 0.88 }}
      onClick={() => onTap(player)}
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

      <div className="relative" style={{ filter: glow }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2.5px solid ${ringColor}`, borderRadius: "50%" }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{
            duration: player.status === "doubt" ? 1.2 : 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div
          className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full"
          style={{
            border: `2.5px solid ${ringColor}`,
            background: "linear-gradient(135deg, #1a0020, #2a0035)",
          }}
        >
          {player.image ? (
            <Image
              src={player.image}
              alt={player.shortName}
              width={48}
              height={48}
              sizes="48px"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-white/80">
              {player.shortName.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>
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
    </motion.button>
  );
}
