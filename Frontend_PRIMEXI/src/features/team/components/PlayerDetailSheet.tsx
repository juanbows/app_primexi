"use client";

import type { ReactNode } from "react";

import Image from "next/image";
import { DollarSign, Flame, Swords, TrendingUp, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { TeamPlayer } from "@/lib/mocks/fpl";

interface PlayerDetailSheetProps {
  player: TeamPlayer | null;
  open: boolean;
  onClose: () => void;
}

const statusLabel = {
  fit: { text: "En Forma", color: "#00ff85" },
  normal: { text: "Normal", color: "#04f5ff" },
  doubt: { text: "Duda", color: "#e90052" },
} as const;

function difficultyColor(difficulty: number) {
  if (difficulty <= 2) return "#00ff85";
  if (difficulty === 3) return "#04f5ff";
  if (difficulty === 4) return "#f59e0b";
  return "#e90052";
}

export function PlayerDetailSheet({
  player,
  open,
  onClose,
}: PlayerDetailSheetProps) {
  if (!player) {
    return null;
  }

  const status = statusLabel[player.status];
  const maxLast5 = Math.max(...player.last5, 1);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Cerrar detalle del jugador"
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 w-full max-w-md rounded-t-[2rem] border border-white/10 bg-gradient-to-b from-[#1a0020] to-[#0d000f] px-4 pb-6 pt-4 shadow-[0_-20px_45px_-30px_rgba(0,0,0,0.9)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0.16, duration: 0.55 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

            <div className="flex items-start gap-4 pb-2">
              <div
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                style={{
                  border: `2px solid ${status.color}`,
                  background: "linear-gradient(135deg, #1a0020, #2a0035)",
                }}
              >
                {player.image ? (
                  <Image
                    src={player.image}
                    alt={player.name}
                    width={56}
                    height={56}
                    sizes="56px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-white/70">
                    {player.shortName.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg text-white">{player.name}</h3>
                    <p className="text-sm text-white/50">
                      {player.team} · {player.position}
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

                <span
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${status.color}20`,
                    color: status.color,
                    border: `1px solid ${status.color}40`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                  {status.text}
                </span>
              </div>

              {(player.isCaptain || player.isVice) && (
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: player.isCaptain
                      ? "linear-gradient(135deg, #00ff85, #04f5ff)"
                      : "linear-gradient(135deg, #04f5ff, #7c3aed)",
                    color: "#0b0b0b",
                  }}
                >
                  {player.isCaptain ? "C" : "V"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 py-2">
              <MetricCard
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="xP"
                value={player.xP.toFixed(1)}
                color="#00ff85"
                index={0}
              />
              <MetricCard
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="Precio"
                value={`£${player.price}`}
                color="#04f5ff"
                index={1}
              />
              <MetricCard
                icon={<Users className="h-3.5 w-3.5" />}
                label="Prop."
                value={`${player.ownership}%`}
                color="#7c3aed"
                index={2}
              />
              <MetricCard
                icon={<Flame className="h-3.5 w-3.5" />}
                label="Forma"
                value={player.form.toFixed(1)}
                color="#f59e0b"
                index={3}
              />
            </div>

            <div className="py-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                Ultimas 5 jornadas
              </p>
              <div className="flex h-16 items-end gap-2">
                {player.last5.map((points, index) => {
                  const height = Math.max((points / maxLast5) * 100, 12);
                  const barColor =
                    points >= 10
                      ? "#00ff85"
                      : points >= 6
                        ? "#04f5ff"
                        : points >= 3
                          ? "#f59e0b"
                          : "#e90052";

                  return (
                    <motion.div
                      key={index}
                      className="flex flex-1 flex-col items-center gap-1"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                      style={{ transformOrigin: "bottom" }}
                    >
                      <span className="text-[9px] font-bold" style={{ color: barColor }}>
                        {points}
                      </span>
                      <div
                        className="w-full rounded-lg"
                        style={{
                          height: `${height}%`,
                          backgroundColor: `${barColor}30`,
                          border: `1px solid ${barColor}50`,
                          background: `linear-gradient(to top, ${barColor}40, ${barColor}15)`,
                        }}
                      />
                      <span className="text-[8px] text-white/30">GW</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div
              className="flex items-center justify-between rounded-2xl border p-3"
              style={{
                backgroundColor: `${difficultyColor(player.fixtureDifficulty)}10`,
                borderColor: `${difficultyColor(player.fixtureDifficulty)}30`,
              }}
            >
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4" style={{ color: difficultyColor(player.fixtureDifficulty) }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Proximo rival</p>
                  <p className="text-sm font-semibold text-white">{player.nextFixture}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((difficulty) => (
                  <div
                    key={difficulty}
                    className="h-4 w-2 rounded-sm"
                    style={{
                      backgroundColor:
                        difficulty <= player.fixtureDifficulty
                          ? difficultyColor(player.fixtureDifficulty)
                          : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  index,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      className="rounded-xl border p-2.5 text-center"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}25`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06 }}
    >
      <div className="mb-1 flex justify-center" style={{ color }}>
        {icon}
      </div>
      <p className="text-[9px] uppercase text-white/40">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        {value}
      </p>
    </motion.div>
  );
}
