import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Home, User, Users } from "lucide-react";

export type NavItem = {
  id: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

export const navItems: NavItem[] = [
  { id: "inicio", href: "/", icon: Home, label: "Inicio" },
  { id: "equipo", href: "/equipo", icon: Users, label: "Equipo" },
  {
    id: "traspasos",
    href: "/traspasos",
    icon: ArrowLeftRight,
    label: "Traspasos",
  },
  { id: "perfil", href: "/perfil", icon: User, label: "Perfil" },
];
