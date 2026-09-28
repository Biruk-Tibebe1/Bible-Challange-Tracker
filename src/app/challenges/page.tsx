import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ChallengesDashboard } from "@/features/challenges/components/challenges-dashboard";

export const metadata: Metadata = {
  title: "Challenges | Bible Challenge",
};

export default function ChallengesPage() {
  return (
    <AppShell>
      <ChallengesDashboard />
    </AppShell>
  );
}