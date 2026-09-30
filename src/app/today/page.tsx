import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TodayExperience } from "@/features/dashboard/today-experience";

export const metadata: Metadata = {
  title: "Today | Bible Challenge",
};

export default function TodayPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl py-4 sm:py-8">
        <header className="mb-6 border-b border-[var(--line)] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Daily reading</p>
          <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">Today</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Continue your active challenge or return to an earlier scheduled reading.</p>
        </header>
        <TodayExperience mode="full" />
      </main>
    </AppShell>
  );
}