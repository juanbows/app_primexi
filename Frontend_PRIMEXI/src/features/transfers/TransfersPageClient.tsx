"use client";

import { useMemo, useState } from "react";

import { transfersViewMock } from "@/lib/mocks/fpl";

const difficultyStyles = {
  green: "border-[#00ff85]/40 bg-[#00ff85]/15 text-[#00ff85]",
  amber: "border-[#f7b500]/40 bg-[#f7b500]/15 text-[#f7b500]",
  red: "border-[#e90052]/40 bg-[#e90052]/15 text-[#e90052]",
} as const;

export default function TransfersPageClient() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | null>(null);
  const { baselineXp, budget, freeTransfers, recommended, replacementMap, sellCandidates } =
    transfersViewMock;

  const selectedPlayer = useMemo(
    () => sellCandidates.find((player) => player.id === selectedPlayerId) ?? null,
    [selectedPlayerId, sellCandidates],
  );

  const replacements = useMemo(
    () => (selectedPlayer ? replacementMap[selectedPlayer.id] : []),
    [replacementMap, selectedPlayer],
  );

  const selectedReplacement = useMemo(
    () => replacements.find((replacement) => replacement.id === selectedReplacementId) ?? null,
    [replacements, selectedReplacementId],
  );

  const updatedXp = selectedReplacement
    ? (selectedReplacement.xp + baselineXp).toFixed(1)
    : baselineXp.toFixed(1);

  const remainingBudget = selectedReplacement
    ? (budget - Math.max(selectedReplacement.price - recommended.outPlayer.price, 0)).toFixed(1)
    : budget.toFixed(1);

  return (
    <div className="space-y-6 pt-2 pb-44">
      <header className="glass-panel flex items-center justify-between gap-4 rounded-3xl border-[#00ff85]/20 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Transfers</p>
          <h1 className="text-xl font-semibold">Traspasos</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60">Budget</p>
          <p className="text-lg font-semibold">£{budget.toFixed(1)}m</p>
          <p className="mt-1 text-xs text-white/60">{freeTransfers} FT</p>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#00ff85]" />
          <h2 className="text-lg font-semibold">Recommended Transfer</h2>
        </div>
        <div className="rounded-3xl border border-[#00ff85]/30 bg-[#1b001c]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Player OUT</p>
              <p className="text-base font-semibold">{recommended.outPlayer.name}</p>
              <p className="text-xs text-white/60">
                {recommended.outPlayer.team} · £{recommended.outPlayer.price}m
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#00ff85]/40 bg-[#00ff85]/10 text-center text-xs font-semibold leading-10 text-[#00ff85]">
              OUT
            </div>
          </div>
          <div className="my-4 border-t border-white/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Player IN</p>
              <p className="text-base font-semibold">{recommended.inPlayer.name}</p>
              <p className="text-xs text-white/60">
                {recommended.inPlayer.team} · £{recommended.inPlayer.price}m
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#00ff85]/40 bg-[#00ff85]/10 text-center text-xs font-semibold leading-10 text-[#00ff85]">
              IN
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-[#00ff85]/30 bg-[#0f0012] p-3">
              <p className="text-xs text-white/60">xP gain</p>
              <p className="text-lg font-semibold text-[#00ff85]">+{recommended.xpGain}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0f0012] p-3">
              <p className="text-xs text-white/60">Price diff</p>
              <p className="text-lg font-semibold">+£{recommended.priceDiff}m</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#7c3aed]" />
          <h2 className="text-lg font-semibold">Players to Sell</h2>
        </div>
        <div className="space-y-2">
          {sellCandidates.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => {
                setSelectedPlayerId(player.id);
                setSelectedReplacementId(null);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#150018] px-4 py-3 text-left transition-colors hover:border-[#00ff85]/30"
            >
              <div>
                <p className="text-sm font-semibold">{player.name}</p>
                <p className="text-xs text-white/60">{player.team}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{player.xp} xP</p>
                  <p className="text-xs text-white/60">Next GW</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${difficultyStyles[player.difficulty]}`}
                >
                  {player.difficulty.toUpperCase()}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedPlayer ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#120015] px-4 pb-6 pt-5 shadow-[0_-20px_45px_-30px_rgba(0,0,0,0.9)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Replace</p>
                <p className="text-base font-semibold">{selectedPlayer.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayerId(null)}
                className="text-xs text-white/60"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {replacements.slice(0, 5).map((replacement) => {
                const isSelected = replacement.id === selectedReplacementId;
                return (
                  <button
                    key={replacement.id}
                    type="button"
                    onClick={() => setSelectedReplacementId(replacement.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-[#00ff85]/50 bg-[#00ff85]/10"
                        : "border-white/10 bg-[#1a001c]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{replacement.name}</p>
                      <p className="text-xs text-white/60">£{replacement.price}m</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{replacement.xp} xP</p>
                      <p className="text-xs text-[#00ff85]">+{replacement.xpDiff} xP</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="safe-bottom fixed left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="glass-panel flex items-center justify-between gap-4 rounded-3xl border-white/10 px-4 py-3">
          <div>
            <p className="text-xs text-white/60">Updated xP</p>
            <p className="text-sm font-semibold">{updatedXp}</p>
            <p className="mt-1 text-xs text-white/60">Remaining £{remainingBudget}m</p>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-[#00ff85] px-5 py-3 text-sm font-semibold text-[#0b0b0b]"
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
