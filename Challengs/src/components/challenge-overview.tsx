import { challengeConfig, formatChallengeDate } from "@/features/challenge-days/challenge-config";

export function ChallengeOverview() {
  return (
    <section aria-labelledby="challenge-title" className="max-w-2xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--forest)]">
        A year in the Word
      </p>
      <h1 id="challenge-title" className="text-5xl leading-[1.05] text-[var(--ink)] sm:text-6xl">
        Bible Challenge
      </h1>
      <p className="mt-3 text-lg text-[var(--forest)]">{challengeConfig.year} E.C.</p>
      <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
        Read together from Genesis through Revelation. This {challengeConfig.durationDays}-day journey starts on {formatChallengeDate(challengeConfig.start)} and ends on {formatChallengeDate(challengeConfig.end)} (inclusive).
      </p>
    </section>
  );
}