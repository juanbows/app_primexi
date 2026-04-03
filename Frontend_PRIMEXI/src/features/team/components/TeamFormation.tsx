"use client";

import { useState } from "react";

import { Shield } from "lucide-react";
import { motion } from "motion/react";

import { PlayerDetailSheet } from "@/features/team/components/PlayerDetailSheet";
import { PlayerNode } from "@/features/team/components/PlayerNode";
import { TeamStats } from "@/features/team/components/TeamStats";
import type { TeamPlayer } from "@/lib/mocks/fpl";

interface TeamFormationProps {
  formation: string;
  squad: TeamPlayer[];
  last5Form: number[];
}

const formationRows = [
  { label: "GK", count: 1, top: 87, start: 0 },
  { label: "DEF", count: 4, top: 67, start: 1 },
  { label: "MID", count: 3, top: 42, start: 5 },
  { label: "FWD", count: 3, top: 17, start: 8 },
];

export function TeamFormation({
  formation,
  squad,
  last5Form,
}: TeamFormationProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const totalXP = squad.reduce((sum, player) => sum + player.xP, 0);
  const teamValue = squad.reduce((sum, player) => sum + player.price, 0);

  const rows = formationRows.map((row) => ({
    ...row,
    players: squad.slice(row.start, row.start + row.count),
  }));

  return (
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

      <TeamStats totalXP={totalXP} teamValue={teamValue} last5Form={last5Form} />

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
            {row.players.map((player, index) => (
              <div key={player.id} className="flex flex-1 justify-center">
                <PlayerNode
                  player={player}
                  index={index + row.start}
                  onTap={(pickedPlayer) => {
                    setSelectedPlayer(pickedPlayer);
                    setSheetOpen(true);
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        <motion.div
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#00ff85]/20 bg-[#0a3d1a]/80 px-3 py-1.5 backdrop-blur-sm"
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
            {squad.filter((player) => player.status === "fit").length}/{squad.length} en forma
          </span>
        </motion.div>
      </motion.div>

      <PlayerDetailSheet
        player={selectedPlayer}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </motion.div>
  );
}
