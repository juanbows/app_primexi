"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { navItems } from "@/components/primexi/navigation";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/perfil") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/profile")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname() ?? "/";

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-4 pt-2">
      <motion.nav
        className="glass-panel mx-auto max-w-md rounded-3xl border-[#00ff85]/25 px-2 py-2"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="mx-auto flex items-center justify-around">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="relative flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-3 py-2.5 transition-all"
              >
                <motion.div
                  className="relative flex min-w-[72px] flex-col items-center gap-1 rounded-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  {isActive ? (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border border-[#00ff85]/40 bg-gradient-to-br from-[#00ff85]/28 to-[#04f5ff]/20"
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
                      isActive ? "text-[#c9ffe9]" : "text-white/55"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
