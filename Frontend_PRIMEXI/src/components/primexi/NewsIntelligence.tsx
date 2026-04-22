"use client";

import { useEffect, useState } from "react";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowUpDown,
  Newspaper,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { getNewsInsights, type HomeInsight } from "@/services/homeService";

type NewsItem = {
  id: string;
  type: HomeInsight["type"];
  title: string;
  description: string;
  probability?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
};

type NewsIntelligenceProps = {
  gameweek: number;
};

const insightStyleMap: Record<HomeInsight["type"], Omit<NewsItem, "id" | "type" | "title" | "description" | "probability">> =
  {
    availability: {
      icon: AlertTriangle,
      color: "#e90052",
      bgColor: "from-[#e90052]/20 to-[#e90052]/5",
      borderColor: "border-[#e90052]/40",
    },
    form: {
      icon: Sparkles,
      color: "#04f5ff",
      bgColor: "from-[#04f5ff]/20 to-[#04f5ff]/5",
      borderColor: "border-[#04f5ff]/40",
    },
    market_in: {
      icon: TrendingUp,
      color: "#00ff85",
      bgColor: "from-[#00ff85]/20 to-[#00ff85]/5",
      borderColor: "border-[#00ff85]/40",
    },
    market_out: {
      icon: ArrowUpDown,
      color: "#f7b500",
      bgColor: "from-[#f7b500]/20 to-[#f7b500]/5",
      borderColor: "border-[#f7b500]/40",
    },
  };

function mapInsightToCard(insight: HomeInsight): NewsItem {
  return {
    ...insight,
    ...insightStyleMap[insight.type],
  };
}

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

export function NewsIntelligence({ gameweek }: NewsIntelligenceProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInsights() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const insights = await getNewsInsights(gameweek);

        if (!isMounted) {
          return;
        }

        setNews(insights.map(mapInsightToCard));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los insights de la jornada.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInsights();

    return () => {
      isMounted = false;
    };
  }, [gameweek]);

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="flex items-center gap-2">
        <Newspaper className="h-6 w-6 text-[#04f5ff]" />
        <h2 className="text-xl font-bold text-white">Radar De Jornada</h2>
      </div>

      <p className="text-sm text-white/60">
        Disponibilidad, forma y movimientos reales del mercado para GW{gameweek}
      </p>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-2xl border-2 border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <p className="rounded-2xl border border-white/10 bg-[#38003c]/30 px-4 py-3 text-sm text-white/70">
          {errorMessage}
        </p>
      ) : news.length > 0 ? (
        <div className="grid gap-3">
          {news.map((item, index) => (
            <NewsCard key={item.id} item={item} index={index} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-[#38003c]/30 px-4 py-3 text-sm text-white/70">
          Aun no hay suficientes datos para construir el radar de esta jornada.
        </p>
      )}
    </motion.section>
  );
}
