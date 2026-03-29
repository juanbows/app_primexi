"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Info, Newspaper, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

type NewsItem = {
  id: number;
  type: "injury" | "form" | "prediction" | "confirmed";
  title: string;
  description: string;
  probability?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
};

const news: NewsItem[] = [
  {
    id: 1,
    type: "prediction",
    title: "De Bruyne - Alta Probabilidad de Jugar",
    description: "IA predice 90% de probabilidad de titular",
    probability: "90%",
    icon: Activity,
    color: "#04f5ff",
    bgColor: "from-[#04f5ff]/20 to-[#04f5ff]/5",
    borderColor: "border-[#04f5ff]/40",
  },
  {
    id: 2,
    type: "confirmed",
    title: "Solanke Confirmado",
    description: "+135 managers lo ficharon en las ultimas 24h",
    icon: TrendingUp,
    color: "#00ff85",
    bgColor: "from-[#00ff85]/20 to-[#00ff85]/5",
    borderColor: "border-[#00ff85]/40",
  },
  {
    id: 3,
    type: "injury",
    title: "Alerta: Salah Duda",
    description: "Posible rotacion segun analisis del equipo",
    icon: Info,
    color: "#e90052",
    bgColor: "from-[#e90052]/20 to-[#e90052]/5",
    borderColor: "border-[#e90052]/40",
  },
  {
    id: 4,
    type: "form",
    title: "Palmer en Racha",
    description: "4 goles en los ultimos 3 partidos",
    icon: Sparkles,
    color: "#04f5ff",
    bgColor: "from-[#04f5ff]/20 to-[#04f5ff]/5",
    borderColor: "border-[#04f5ff]/40",
  },
];

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const Icon = item.icon;

  return (
    <motion.div
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-5 backdrop-blur-sm ${item.bgColor} ${item.borderColor}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
      whileHover={{ scale: 1.02, y: -3 }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${item.color}15, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-lg"
          style={{
            backgroundColor: `${item.color}20`,
            border: `2px solid ${item.color}40`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: item.color }} />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm leading-tight font-bold text-white">
              {item.title}
            </h3>
            {item.probability ? (
              <motion.span
                className="flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `${item.color}30`,
                  color: item.color,
                  border: `1px solid ${item.color}60`,
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {item.probability}
              </motion.span>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-white/70">{item.description}</p>
        </div>
      </div>

      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-20"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{
          background: `linear-gradient(45deg, transparent 40%, ${item.color} 50%, transparent 60%)`,
          backgroundSize: "200% 200%",
        }}
      />
    </motion.div>
  );
}

export function NewsIntelligence() {
  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="flex items-center gap-2">
        <Newspaper className="h-6 w-6 text-[#04f5ff]" />
        <h2 className="text-xl font-bold text-white">Noticias Inteligentes</h2>
      </div>

      <p className="text-sm text-white/60">
        Actualizaciones en tiempo real impulsadas por IA
      </p>

      <div className="grid gap-3">
        {news.map((item, index) => (
          <NewsCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </motion.section>
  );
}
