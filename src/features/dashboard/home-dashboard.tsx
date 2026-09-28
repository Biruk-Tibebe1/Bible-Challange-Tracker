"use client";

import Link from "next/link";
import { useAuth } from "@/features/authentication/auth-provider";
import { calculateCurrentStreak, hasCompletedOnDate } from "@/features/progress/progress-model";
import { useSavedChallenges } from "@/features/challenges/use-saved-challenges";

function getGreetingName(email: string | undefined, metadata: Record<string, unknown> | undefined): string {
  const preferredName = metadata?.full_name ?? metadata?.name;
  if (typeof preferredName === "string" && preferredName.trim()) return preferredName.trim().split(/\s+/)[0]!;
  return email?.split("@")[0] || "there";
}

function ChallengeProgress({ name, completedDays, totalDays }: { name: string; completedDays: number; totalDays: number }) {
  const percentage = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;
  return (
    <li className="border-b border-[var(--line)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium text-[var(--ink)]">{name}</h3>
        <p className="text-sm text-[var(--muted)]">{completedDays} of {totalDays} days</p>
      </div>
      <div aria-label={`${percentage}% complete`} className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7ebe4]">
        <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${percentage}%` }} />
      </div>
    </li>
  );
}

export function HomeDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { challenges, completedAt, error, isLoading } = useSavedChallenges();
  const activeChallenges = challenges.filter((challenge) => challenge.completedDays < challenge.totalDays);
  const completedChallenges = challenges.filter((challenge) => challenge.completedDays >= challenge.totalDays);
  const completedToday = hasCompletedOnDate(completedAt);
  const streak = calculateCurrentStreak(completedAt);
  const userMetadata = user?.user_metadata as Record<string, unknown> | undefined;

  return (
    <main className="mx-auto max-w-5xl py-4 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Your reading space</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
            {user ? `Welcome, ${getGreetingName(user.email, userMetadata)}` : "Welcome to your Bible"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Make room for Scripture, one reading at a time.</p>
        </div>
        {!isAuthLoading && !user && (
          <Link className="text-sm font-medium text-[var(--forest)] underline underline-offset-4" href="/auth/sign-in">Sign in to sync progress</Link>
        )}
      </header>

      <section aria-labelledby="today-title" className="mt-7 grid gap-5 rounded-lg border border-[var(--line)] bg-white/70 p-5 sm:p-7 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Today</p>
          <h2 id="today-title" className="mt-2 font-serif text-2xl text-[var(--ink)]">Today&apos;s reading</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {user && !isLoading
              ? completedToday ? "A reading was recorded today. Continue whenever you're ready." : "Choose a passage to begin. Your daily reading is yours to set." 
              : "Choose a passage from the Bible and begin at your own pace."}
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--forest-deep)]" role="status">
            {user && !isLoading ? completedToday ? "Reading recorded today" : "Not yet recorded today" : "Daily completion will appear here when available"}
          </p>
        </div>
        <Link className="inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--forest)] px-6 text-sm font-semibold text-white hover:bg-[var(--forest-deep)]" href="/bible">Read now</Link>
      </section>

      <section aria-label="Reading statistics" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-[var(--line)] bg-white/50 p-4">
          <p className="text-xs text-[var(--muted)]">Active challenges</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user && !isLoading ? activeChallenges.length : "—"}</p>
        </div>
        <div className="rounded-md border border-[var(--line)] bg-white/50 p-4">
          <p className="text-xs text-[var(--muted)]">Completed challenges</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user && !isLoading ? completedChallenges.length : "—"}</p>
        </div>
        <div className="col-span-2 rounded-md border border-[var(--line)] bg-white/50 p-4 sm:col-span-1">
          <p className="text-xs text-[var(--muted)]">Current streak</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user && !isLoading ? `${streak} ${streak === 1 ? "day" : "days"}` : "—"}</p>
        </div>
      </section>

      {error && <p className="mt-5 rounded-md border border-[#e4c8c1] bg-[#fff7f4] p-3 text-sm text-[#8c3f32]" role="alert">{error}</p>}

      <section aria-labelledby="active-challenges-title" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Your plans</p>
            <h2 id="active-challenges-title" className="mt-1 font-serif text-2xl text-[var(--ink)]">Active challenges</h2>
          </div>
          <Link className="text-sm font-medium text-[var(--forest)] underline underline-offset-4" href="/challenges">View all</Link>
        </div>
        {isLoading || isAuthLoading ? (
          <p aria-live="polite" className="mt-4 text-sm text-[var(--muted)]">Loading your reading plans…</p>
        ) : activeChallenges.length ? (
          <ul className="mt-3 divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-white/45 px-4 sm:px-5">
            {activeChallenges.slice(0, 3).map((challenge) => <ChallengeProgress key={challenge.id} {...challenge} />)}
          </ul>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-[var(--line)] bg-white/40 p-5 sm:p-6">
            <h3 className="font-medium text-[var(--ink)]">{completedChallenges.length ? "Ready for your next reading plan?" : "A reading plan can help you begin"}</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">Create a schedule for a passage or explore a full-Bible reading plan. Your progress stays yours.</p>
            <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" href="/challenge">Create challenge</Link>
          </div>
        )}
      </section>

      {completedChallenges.length > 0 && (
        <section aria-labelledby="completed-challenges-title" className="mt-9">
          <h2 id="completed-challenges-title" className="font-serif text-2xl text-[var(--ink)]">Completed challenges</h2>
          <ul className="mt-3 divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-white/45 px-4 sm:px-5">
            {completedChallenges.slice(0, 3).map((challenge) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={challenge.id}>
                <span className="font-medium text-[var(--ink)]">{challenge.challengeType === "predefined" ? "The Full Bible" : challenge.name}</span>
                <span className="text-sm text-[var(--muted)]">{challenge.totalDays} days complete</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="featured-title" className="mt-10 border-t border-[var(--line)] pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Explore</p>
            <h2 id="featured-title" className="mt-1 font-serif text-2xl text-[var(--ink)]">Featured challenge</h2>
          </div>
          <Link className="text-sm font-medium text-[var(--forest)] underline underline-offset-4" href="/challenges">Browse challenges</Link>
        </div>
        <article className="mt-4 flex flex-wrap items-center justify-between gap-5 rounded-md border border-[var(--line)] bg-[#edf1e9] p-5 sm:p-6">
          <div>
            <h3 className="font-serif text-xl text-[var(--ink)]">The Full Bible</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">A 365-day Ethiopian-calendar reading plan · Genesis to Revelation</p>
            <p className="mt-2 text-xs text-[var(--muted)]">66 books · 1,189 chapters</p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--forest)] px-4 text-sm font-medium text-[var(--forest-deep)] hover:bg-white/70" href="/challenge">Explore plan</Link>
        </article>
      </section>
    </main>
  );
}