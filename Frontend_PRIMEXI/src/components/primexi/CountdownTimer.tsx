"use client";

import { useEffect, useState } from "react";

import { Clock } from "lucide-react";
import { motion } from "motion/react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type CountdownTimerProps = {
  gameweek: number;
};

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

export function CountdownTimer({ gameweek }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 2,
    hours: 14,
    minutes: 35,
    seconds: 42,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds -= 1;
        } else if (minutes > 0) {
          minutes -= 1;
          seconds = 59;
        } else if (hours > 0) {
          hours -= 1;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days -= 1;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }

        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
          Deadline Countdown GW{gameweek}:
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
        Tiempo restante para GW{gameweek}
      </p>
    </motion.div>
  );
}
