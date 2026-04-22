import type { Metadata } from "next";

import { GameweeksPageClient } from "@/features/profile/GameweeksPageClient";

export const metadata: Metadata = {
  title: "Gameweeks",
};

export default function GameweeksPage() {
  return <GameweeksPageClient />;
}
