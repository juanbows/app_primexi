"use client";

import Image from "next/image";
import { motion } from "motion/react";

export function Header() {
  return (
    <motion.header
      className="safe-top px-4 pt-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass-panel flex items-center justify-center rounded-3xl px-4 py-3">
        <div className="flex items-center">
          <Image
            src="/brand/primexi-logo.png"
            alt="PRIME XI"
            width={188}
            height={48}
            className="h-11 w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
            priority
          />
        </div>
      </div>
    </motion.header>
  );
}
