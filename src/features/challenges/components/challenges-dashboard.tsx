"use client";

import Link from "next/link";
import { useAuth } from "@/features/authentication/auth-provider";
import { getBibleBookById } from "@/features/bible-books/bible-data";
import { useSavedChallenges } from "../use-saved-challenges";

function ChallengeList({ title, challenges }: {
  title: string;
  challenges: ReturnType<typeof useSavedChallenges>["challenges"];
}) {
  if (!challenges.length) return null;

  return (
    <section aria-label={title} className="mt-9">
      <h2 className="font-serif text-2xl text-[var(--ink)]">{title}</h2>
      <ul className="mt-4 divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-white/50 px-4 sm:px-6">
        {challenges.map((challenge) => {
          const startBook = getBibleBookById(challenge.startLocation.bookId)?.name ?? challenge.startLocation.bookId;
          const endBook = getBibleBookById(challenge.endLocation.bookId)?.name ?? challenge.endLocation.bookId;
          const percentage = Math.round((challenge.completedDays / challenge.totalDays) * 100);
          const title = challenge.challengeType === "predefined" ? "The Full Bible" : challenge.name;
          return (
            <li key={challenge.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-[var(--ink)]">{title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {startBook} {challenge.startLocation.chapterNumber} – {endBook} {challenge.endLocation.chapterNumber}
                  <span className="px-1.5" aria-hidden="true">·</span>{challenge.totalDays} days
                </p>
                <div aria-label={`${percentage}% complete`} className="mt-3 h-1.5 max-w-sm overflow-hidden rounded-full bg-[#e7ebe4]">
                  <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${percentage}%` }} />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{challenge.completedDays} of {challenge.totalDays} days complete</p>
              </div>
              <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--forest-deep)] hover:bg-[var(--sage)]" href="/challenge">Open</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ChallengesDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { challenges, error, isLoading } = useSavedChallenges();
  const active = challenges.filter((challenge) => challenge.completedDays < challenge.totalDays);
  const completed = challenges.filter((challenge) => challenge.completedDays >= challenge.totalDays);
  const isLoadingData = isAuthLoading || isLoading;

  return (
    <main className="mx-auto max-w-5xl py-4 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Reading plans</p>
          <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">Challenges</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Choose a reading plan or build a schedule around the passages you want to read.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" href="/challenge#custom-challenge-tab">Create custom challenge</Link>
      </header>

      {error && <p className="mt-5 rounded-md border border-[#e4c8c1] bg-[#fff7f4] p-3 text-sm text-[#8c3f32]" role="alert">{error}</p>}

      <ChallengeList title="Active challenges" challenges={active} />
      {isLoadingData && <p aria-live="polite" className="mt-7 text-sm text-[var(--muted)]">Loading your challenges…</p>}
      {!isLoadingData && !user && (
        <div className="mt-7 rounded-md border border-dashed border-[var(--line)] bg-white/45 p-5">
          <h2 className="font-serif text-xl text-[var(--ink)]">Your saved plans will appear here</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">You can explore a plan now. Sign in to save challenges and sync progress across devices.</p>
          <Link className="mt-3 inline-block text-sm font-medium text-[var(--forest)] underline underline-offset-4" href="/auth/sign-in">Sign in</Link>
        </div>
      )}
      {!isLoadingData && user && active.length === 0 && completed.length === 0 && (
        <div className="mt-7 rounded-md border border-dashed border-[var(--line)] bg-white/45 p-5">
          <h2 className="font-serif text-xl text-[var(--ink)]">A plan for the next passage</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Start with a passage you have in mind, or explore the full-Bible plan below.</p>
          <Link className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--forest)] underline underline-offset-4" href="/challenge#custom-challenge-tab">Create a challenge</Link>
        </div>
      )}
      <ChallengeList title="Completed challenges" challenges={completed} />

      <section aria-labelledby="available-title" className="mt-10 border-t border-[var(--line)] pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Available to explore</p>
        <h2 id="available-title" className="mt-1 font-serif text-2xl text-[var(--ink)]">Featured plan</h2>
        <article className="mt-4 flex flex-wrap items-center justify-between gap-5 rounded-md border border-[var(--line)] bg-[#edf1e9] p-5 sm:p-6">
          <div>
            <h3 className="font-serif text-xl text-[var(--ink)]">The Full Bible</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">A 365-day Ethiopian-calendar plan through all 66 books.</p>
            <p className="mt-2 text-xs text-[var(--muted)]">Genesis 1 – Revelation 22 · 1,189 chapters</p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--forest)] px-4 text-sm font-medium text-[var(--forest-deep)] hover:bg-white/70" href="/challenge">Explore plan</Link>
        </article>
      </section>
    </main>
  );
}