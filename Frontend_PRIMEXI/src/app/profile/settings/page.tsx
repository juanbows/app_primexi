import type { Metadata } from "next";

import { ProfileSettingsPageClient } from "@/features/profile/ProfileSettingsPageClient";

export const metadata: Metadata = {
  title: "Configuración",
};

export default function ProfileSettingsPage() {
  return <ProfileSettingsPageClient />;
}
