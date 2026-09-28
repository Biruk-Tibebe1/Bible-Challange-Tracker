import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ChallengeExperience } from "@/features/challenges/components/challenge-experience";

export const metadata: Metadata = {
  title: "Challenge | Bible Challenge",
};

export default function ChallengePage() {
  return (
    <AppShell>
      <ChallengeExperience />
    </AppShell>
  );
}