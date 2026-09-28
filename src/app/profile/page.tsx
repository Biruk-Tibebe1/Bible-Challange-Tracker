import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProfileDashboard } from "@/features/authentication/components/profile-dashboard";

export const metadata: Metadata = {
  title: "Profile | Bible Challenge",
};

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileDashboard />
    </AppShell>
  );
}