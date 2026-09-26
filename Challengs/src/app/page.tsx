import { AppShell } from "@/components/app-shell";
import { ChallengeOverview } from "@/components/challenge-overview";
import { ProgressPlaceholder } from "@/components/progress-placeholder";
import { StartChallengeButton } from "@/components/start-challenge-button";

export default function HomePage() {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-4xl flex-col justify-center gap-12 py-12 sm:gap-16 sm:py-16">
        <ChallengeOverview />
        <div className="max-w-2xl">
          <ProgressPlaceholder />
          <div className="mt-7">
            <StartChallengeButton />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-[9%] top-[16%] -z-10 hidden h-56 w-56 rounded-full border border-[var(--line)] lg:block">
          <div className="absolute inset-7 rounded-full border border-[var(--line)]" />
          <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--sunlight)]" />
        </div>
      </main>
    </AppShell>
  );
}