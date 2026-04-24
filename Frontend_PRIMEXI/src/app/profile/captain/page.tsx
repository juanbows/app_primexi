import type { Metadata } from "next";

import { CaptainPageClient } from "@/features/profile/CaptainPageClient";

export const metadata: Metadata = {
  title: "Capitán",
};

export default function CaptainPage() {
  return <CaptainPageClient />;
}
