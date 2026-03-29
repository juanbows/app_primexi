"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { motion } from "motion/react";

export function Header() {
  return (
    <motion.header
      className="flex items-center justify-between p-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/brand/primexi-logo.png"
          alt="PRIME XI"
          width={188}
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>

      <motion.button
        type="button"
        aria-label="Abrir perfil"
        className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#00ff85] to-[#04f5ff]"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <User className="h-6 w-6 text-[#38003c]" />
      </motion.button>
    </motion.header>
  );
}
