"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { navItems } from "@/components/primexi/navigation";

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-[#00ff85]/20 bg-[#38003c]/95 px-2 py-3 backdrop-blur-lg"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <motion.div
              key={item.id}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all"
              >
                {isActive ? (
                  <motion.div
                    className="absolute inset-0 rounded-xl border border-[#00ff85]/40 bg-[#00ff85]/20"
                    layoutId="activeTab"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                ) : null}

                <Icon
                  className={`relative z-10 h-6 w-6 transition-colors ${
                    isActive ? "text-[#00ff85]" : "text-white/50"
                  }`}
                />
                <span
                  className={`relative z-10 text-xs font-medium transition-colors ${
                    isActive ? "text-[#00ff85]" : "text-white/50"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.nav>
  );
}
