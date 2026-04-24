import type { Metadata } from "next";

import { RankingPageClient } from "@/features/profile/RankingPageClient";

export const metadata: Metadata = {
  title: "Ranking",
};

export default function RankingPage() {
  return <RankingPageClient />;
}
