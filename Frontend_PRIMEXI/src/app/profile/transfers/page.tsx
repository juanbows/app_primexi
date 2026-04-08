import type { Metadata } from "next";

import { ProfileTransfersPageClient } from "@/features/profile/ProfileTransfersPageClient";

export const metadata: Metadata = {
  title: "Transfers",
};

export default function ProfileTransfersPage() {
  return <ProfileTransfersPageClient />;
}
