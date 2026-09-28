import { AppShell } from "@/components/app-shell";
import { HomeDashboard } from "@/features/dashboard/home-dashboard";

export default function HomePage() {
  return (
    <AppShell>
      <HomeDashboard />
    </AppShell>
  );
}