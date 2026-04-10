"use client";

import { useState } from "react";

import { BrainCircuit, Crosshair, ShieldCheck, Swords } from "lucide-react";
import { motion } from "motion/react";

type TeamModeId = "control" | "agresivo" | "diferencial";

interface TeamMode {
  id: TeamModeId;
  label: string;
  badge: string;
  title: string;
  description: string;
  focus: string;
  icon: typeof ShieldCheck;
  accent: string;
}

const teamModes: TeamMode[] = [
  {
    id: "control",
    label: "Modo control",
    badge: "Equilibrado",
    title: "Prioriza estabilidad y lectura del partido",
    description:
      "Pensado para proteger ventaja, reducir errores no forzados y sostener una estructura fiable durante todo el encuentro.",
    focus: "Posesiones seguras, vigilancia defensiva y toma de decisiones conservadora.",
    icon: ShieldCheck,
    accent: "#00ff85",
  },
  {
    id: "agresivo",
    label: "Modo agresivo",
    badge: "Presion alta",
    title: "Activa un plan de maxima intensidad",
    description:
      "Busca romper el partido con ritmo, recuperacion inmediata y mas volumen ofensivo en zonas de remate.",
    focus: "Presion adelantada, verticalidad y mayor riesgo para generar ventajas rapidas.",
    icon: Swords,
    accent: "#ff7a00",
  },
  {
    id: "diferencial",
    label: "Modo diferencial",
    badge: "Factor sorpresa",
    title: "Explora ajustes menos previsibles",
    description:
      "Orientado a detectar espacios poco obvios, variar alturas y activar decisiones que cambien la dinamica del rival.",
    focus: "Rotaciones inesperadas, patrones mixtos y busqueda de ventaja competitiva.",
    icon: Crosshair,
    accent: "#04f5ff",
  },
];

export function TeamModelModes() {
  const [activeMode, setActiveMode] = useState<TeamModeId>("control");
  const selectedMode = teamModes.find((mode) => mode.id === activeMode) ?? teamModes[0];
  const SelectedIcon = selectedMode.icon;

  return (
    <motion.section
      className="glass-panel overflow-hidden rounded-[28px] p-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.45 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
            <BrainCircuit className="h-3.5 w-3.5 text-[#00ff85]" />
            Modelo tactico
          </div>
          <h2 className="font-[family:var(--font-display)] text-lg font-bold text-white">
            Modos del modelo
          </h2>
          <p className="max-w-md text-sm leading-6 text-white/68">
            Cambia el enfoque del equipo segun el contexto del partido y la respuesta que quieras priorizar.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Modo activo</p>
          <p className="mt-1 text-sm font-semibold text-white">{selectedMode.badge}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {teamModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === activeMode;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActiveMode(mode.id)}
              className="rounded-[22px] border px-4 py-3 text-left transition duration-200"
              style={{
                borderColor: isActive ? `${mode.accent}66` : "rgba(255,255,255,0.08)",
                background: isActive
                  ? `linear-gradient(145deg, ${mode.accent}22, rgba(9, 11, 21, 0.92))`
                  : "rgba(255,255,255,0.04)",
                boxShadow: isActive ? `0 10px 30px -20px ${mode.accent}` : "none",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: isActive ? `${mode.accent}22` : "rgba(255,255,255,0.06)" }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: isActive ? mode.accent : "rgba(255,255,255,0.75)" }}
                  />
                </span>
                <span
                  className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    borderColor: isActive ? `${mode.accent}55` : "rgba(255,255,255,0.08)",
                    color: isActive ? mode.accent : "rgba(255,255,255,0.5)",
                  }}
                >
                  {mode.badge}
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-white">{mode.label}</p>
              <p className="mt-1 text-xs leading-5 text-white/58">{mode.focus}</p>
            </button>
          );
        })}
      </div>

      <motion.div
        key={selectedMode.id}
        className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${selectedMode.accent}22` }}
          >
            <SelectedIcon className="h-5 w-5" style={{ color: selectedMode.accent }} />
          </div>

          <div className="space-y-2">
            <p
              className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: `${selectedMode.accent}44`, color: selectedMode.accent }}
            >
              {selectedMode.badge}
            </p>
            <h3 className="font-[family:var(--font-display)] text-base font-bold text-white">
              {selectedMode.title}
            </h3>
            <p className="text-sm leading-6 text-white/70">{selectedMode.description}</p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
