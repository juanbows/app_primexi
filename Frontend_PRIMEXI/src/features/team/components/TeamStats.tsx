"use client";

import { Flame, Wallet, Zap } from "lucide-react";
import { motion } from "motion/react";

interface TeamStatsProps {
  totalXP: number;
  teamValue: number;
  last5Form: number[];
}

function formDotColor(points: number) {
  if (points >= 60) return "#00ff85";
  if (points >= 40) return "#04f5ff";
  if (points >= 25) return "#f59e0b";
  return "#e90052";
}

export function TeamStats({ totalXP, teamValue, last5Form }: TeamStatsProps) {
  return (
    <motion.div
      className="grid grid-cols-3 gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <motion.div
        className="glass-panel rounded-2xl border-[#00ff85]/25 p-3 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Zap className="mx-auto mb-1 h-4 w-4 text-[#00ff85]" />
        <p className="text-[10px] uppercase tracking-wider text-white/50">xP Total</p>
        <p className="text-xl font-bold text-[#00ff85]">{totalXP.toFixed(1)}</p>
      </motion.div>

      <motion.div
        className="glass-panel rounded-2xl border-[#04f5ff]/25 p-3 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <Wallet className="mx-auto mb-1 h-4 w-4 text-[#04f5ff]" />
        <p className="text-[10px] uppercase tracking-wider text-white/50">Valor</p>
        <p className="text-xl font-bold text-[#04f5ff]">£{teamValue.toFixed(1)}</p>
      </motion.div>

      <motion.div
        className="glass-panel rounded-2xl border-[#7c3aed]/25 p-3 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Flame className="mx-auto mb-1 h-4 w-4 text-[#7c3aed]" />
        <p className="text-[10px] uppercase tracking-wider text-white/50">Forma</p>
        <div className="mt-1.5 flex items-center justify-center gap-1">
          {last5Form.map((points, index) => (
            <motion.div
              key={index}
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: formDotColor(points) }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.08, type: "spring", bounce: 0.5 }}
              title={`GW: ${points} pts`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
