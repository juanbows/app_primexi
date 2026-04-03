"use client";

import { useEffect, useState } from "react";

import { Clock } from "lucide-react";
import { motion } from "motion/react";
import type { CountdownData } from "@/lib/mocks/fpl";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type CountdownTimerProps = {
  countdown: CountdownData;
};

const emptyTimeLeft: TimeLeft = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function computeTimeLeft(deadlineTime: string): TimeLeft {
  const diff = new Date(deadlineTime).getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / (24 * 60 * 60)),
    hours: Math.floor((totalSeconds % (24 * 60 * 60)) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <motion.span
        key={value}
        className="text-4xl font-bold text-[#e90052]"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {String(value).padStart(2, "0")}
      </motion.span>
      <span className="text-lg text-[#e90052]/80">{label}</span>
    </div>
  );
}

export function CountdownTimer({ countdown }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(emptyTimeLeft);
  const deadlineLabel = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(countdown.deadlineTime));

  useEffect(() => {
    const updateTimeLeft = () => {
      setTimeLeft(computeTimeLeft(countdown.deadlineTime));
    };

    const initialTimer = window.setTimeout(updateTimeLeft, 0);

    const timer = window.setInterval(() => {
      updateTimeLeft();
    }, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [countdown.deadlineTime]);

  return (
    <motion.div
      className="rounded-2xl border-2 border-[#00ff85]/30 bg-gradient-to-r from-[#38003c]/80 to-[#38003c]/60 p-6 backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="mb-3 flex items-center justify-center gap-2">
        <Clock className="h-5 w-5 text-[#04f5ff]" />
        <h2 className="text-sm font-medium text-white">
          Deadline Countdown GW{countdown.gameweek}:
        </h2>
      </div>

      <div className="flex items-center justify-center gap-3">
        <TimeUnit value={timeLeft.days} label="d" />
        <span className="text-2xl font-bold text-[#e90052]">:</span>
        <TimeUnit value={timeLeft.hours} label="h" />
        <span className="text-2xl font-bold text-[#e90052]">:</span>
        <TimeUnit value={timeLeft.minutes} label="m" />
        <span className="text-2xl font-bold text-[#e90052]">:</span>
        <TimeUnit value={timeLeft.seconds} label="s" />
      </div>

      <p className="mt-3 text-center text-xs text-white/60">
        Tiempo restante para GW{countdown.gameweek}
      </p>
      <p className="mt-1 text-center text-[11px] text-white/45">
        Deadline COT: {deadlineLabel}
      </p>
    </motion.div>
  );
}
