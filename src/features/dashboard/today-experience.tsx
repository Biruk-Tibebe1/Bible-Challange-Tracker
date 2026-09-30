"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/authentication/auth-provider";
import { useChallengeDetails } from "@/features/challenges/use-challenge-details";
import { getBibleBookById } from "@/features/bible-books/bible-data";
import type { SavedChallengeDetail } from "@/lib/supabase/challenge-repository";
import { saveDayCompletion } from "@/lib/supabase/challenge-repository";
import {
  getChallengeCompletionDate,
  selectTodayChallenge,
} from "@/features/challenges/today-model";

function formatEthiopianDate(date: { year: number; month: string; day: number }): string {
  return `${date.month} ${date.day}, ${date.year} E.C.`;
}

function formatCompletionDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getDayRecords(challenge: SavedChallengeDetail) {
  return challenge.completedDayRecords;
}

export function TodayExperience({ mode = "full" }: { mode?: "home" | "full" }) {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const { challenges, error, isLoading, reload } = useChallengeDetails();
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [recoveryDayNumber, setRecoveryDayNumber] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const timeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  })();
  const decorated = challenges.map((challenge) => ({
    challenge,
    today: selectTodayChallenge({
      id: challenge.id,
      name: challenge.name,
      challengeType: challenge.challengeType,
      schedule: challenge.schedule,
      completedDayRecords: challenge.completedDayRecords,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    }, new Date(), timeZone),
  }));
  const active = decorated.filter(({ today }) => !today.isComplete);
  const completed = decorated.filter(({ today }) => today.isComplete);
  const selected = active.find(({ challenge }) => challenge.id === selectedChallengeId) ?? active[0] ?? null;
  const fallbackActiveChallengeId = active[0]?.challenge.id ?? "";
  const isSelectedChallengeActive = active.some(({ challenge }) => challenge.id === selectedChallengeId);

  useEffect(() => {
    if (!isSelectedChallengeActive) setSelectedChallengeId(fallbackActiveChallengeId);
  }, [fallbackActiveChallengeId, isSelectedChallengeActive]);

  useEffect(() => {
    setRecoveryDayNumber(null);
    setActionError("");
    setNotice("");
  }, [selectedChallengeId]);

  if (isAuthLoading || isLoading) {
    return <p aria-live="polite" className="text-sm text-[var(--muted)]">Loading today&apos;s reading…</p>;
  }

  if (!user) {
    return (
      <section aria-labelledby="today-heading" className="rounded-md border border-[var(--line)] bg-white/65 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Today</p>
        <h2 id="today-heading" className="mt-1 font-serif text-2xl text-[var(--ink)]">Your reading</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sign in to see saved challenge readings. You can still explore a plan and track progress for this session.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {isConfigured && <Link className="inline-flex min-h-11 items-center rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--forest-deep)]" href="/auth/sign-in">Sign in</Link>}
          <Link className="inline-flex min-h-11 items-center rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white" href="/challenge">Open challenge</Link>
        </div>
      </section>
    );
  }

  const selectedChallenge = selected?.challenge ?? null;
  const today = selected?.today ?? null;
  const visibleDayNumber = recoveryDayNumber ?? today?.scheduledDayNumber ?? null;
  const visibleDay = selectedChallenge && visibleDayNumber
    ? selectedChallenge.schedule.days[visibleDayNumber - 1]
    : null;
  const visibleDayComplete = visibleDay
    ? today?.completedDayNumbers.includes(visibleDay.dayNumber) ?? false
    : false;
  const completionDate = selectedChallenge && today?.isComplete
    ? formatCompletionDate(getChallengeCompletionDate(getDayRecords(selectedChallenge), selectedChallenge.totalDays))
    : null;

  async function toggleDay(dayNumber: number, isComplete: boolean) {
    if (!selectedChallenge || isSaving) return;
    setIsSaving(true);
    setActionError("");
    setNotice("");
    try {
      await saveDayCompletion(selectedChallenge.id, dayNumber, !isComplete);
      setNotice(!isComplete ? `Day ${dayNumber} marked complete.` : `Day ${dayNumber} marked incomplete.`);
      await reload();
      setRecoveryDayNumber(null);
    } catch {
      setActionError("Unable to save this day. Your progress has not changed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="today-heading" className="rounded-md border border-[var(--line)] bg-white/65 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Today</p>
          <h2 id="today-heading" className="mt-1 font-serif text-2xl text-[var(--ink)]">{mode === "home" ? "Today&apos;s reading" : "Your daily challenge"}</h2>
        </div>
        {active.length > 1 && (
          <label className="w-full max-w-sm text-xs text-[var(--muted)] sm:w-auto">
            Active challenge
            <select aria-label="Select active challenge" className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" value={selectedChallenge?.id ?? ""} onChange={(event) => setSelectedChallengeId(event.target.value)}>
              {active.map(({ challenge }) => <option key={challenge.id} value={challenge.id}>{challenge.challengeType === "predefined" ? "The Full Bible" : challenge.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-[#8c3f32]" role="alert">{error}</p>}

      {!selectedChallenge || !today ? (
        <div className="mt-4 rounded-md border border-dashed border-[var(--line)] p-5">
          {completed.length ? (
            <>
              <h3 className="font-medium text-[var(--ink)]">All saved challenges are complete</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Your completed plans remain in your challenge history.</p>
              <ul className="mt-3 space-y-2">
                {completed.map(({ challenge }) => {
                  const date = formatCompletionDate(getChallengeCompletionDate(getDayRecords(challenge), challenge.totalDays));
                  return <li className="text-sm text-[var(--ink)]" key={challenge.id}>{challenge.challengeType === "predefined" ? "The Full Bible" : challenge.name}{date ? <span className="text-[var(--muted)]"> · completed {date}</span> : null}</li>;
                })}
              </ul>
            </>
          ) : (
            <>
              <h3 className="font-medium text-[var(--ink)]">No active challenge yet</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Create a reading schedule to see your assigned passages and daily progress here.</p>
            </>
          )}
          <Link className="mt-4 inline-flex min-h-10 items-center rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white" href="/challenge">{completed.length ? "Explore another challenge" : "Create a challenge"}</Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="font-serif text-xl text-[var(--ink)]">{selectedChallenge.challengeType === "predefined" ? "The Full Bible" : selectedChallenge.name}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {today.isScheduledToday
                  ? "Scheduled for today"
                  : today.isUpcoming ? "Challenge begins soon" : selectedChallenge.startDate ? "Past scheduled reading · continue at your pace" : "Next incomplete scheduled reading"}
                {visibleDayNumber ? ` · Day ${visibleDayNumber} of ${today.totalDays}` : ""}
              </p>
              {today.ethiopianToday && <p className="mt-1 text-xs text-[var(--muted)]">{formatEthiopianDate(today.ethiopianToday)}</p>}
            </div>
            {active.length > 1 && <p className="text-xs text-[var(--muted)]">{active.length} active challenges</p>}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded border border-[var(--line)] bg-white/70 p-3"><p className="text-xs text-[var(--muted)]">Days complete</p><p className="mt-1 font-semibold text-[var(--ink)]">{today.completedDays}/{today.totalDays}</p></div>
            <div className="rounded border border-[var(--line)] bg-white/70 p-3"><p className="text-xs text-[var(--muted)]">Progress</p><p className="mt-1 font-semibold text-[var(--ink)]">{today.completionPercentage}%</p></div>
            <div className="rounded border border-[var(--line)] bg-white/70 p-3"><p className="text-xs text-[var(--muted)]">Chapters left</p><p className="mt-1 font-semibold text-[var(--ink)]">{today.remainingChapterCount}</p></div>
            <div className="rounded border border-[var(--line)] bg-white/70 p-3"><p className="text-xs text-[var(--muted)]">Current streak</p><p className="mt-1 font-semibold text-[var(--ink)]">{today.currentStreak} {today.currentStreak === 1 ? "day" : "days"}</p></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7ebe4]">
            <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${today.completionPercentage}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-[var(--muted)]">{today.completedChapterCount} of {today.totalChapterCount} chapters · longest streak {today.longestStreak} {today.longestStreak === 1 ? "day" : "days"}</p>

          {today.isComplete ? (
            <div className="mt-4 rounded-md bg-[var(--sage)] p-4">
              <p className="font-medium text-[var(--forest-deep)]">Challenge completed</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{completionDate ? `Completed ${completionDate}.` : "All scheduled days are complete."} Your challenge remains in history.</p>
            </div>
          ) : visibleDay ? (
            <div className="mt-4 rounded-md border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-medium text-[var(--ink)]">{recoveryDayNumber ? `Recovery reading · Day ${visibleDay.dayNumber}` : "Today's reading"}</h4>
                {visibleDayComplete && <span className="text-xs font-medium text-[var(--forest)]">Complete</span>}
              </div>
              {visibleDay.chapterCount ? (
                <ol className="mt-3 flex flex-wrap gap-2">
                  {visibleDay.chapters.map((chapter) => {
                    const bookName = getBibleBookById(chapter.bookId)?.name ?? chapter.bookName;
                    return <li key={chapter.globalChapterNumber}><Link className="inline-flex min-h-9 items-center rounded border border-[var(--line)] px-3 text-sm text-[var(--forest-deep)] underline underline-offset-2 hover:bg-[var(--sage)]" href={`/bible?book=${encodeURIComponent(chapter.bookId)}&chapter=${chapter.chapterNumber}`}>{bookName} {chapter.chapterNumber}</Link></li>;
                  })}
                </ol>
              ) : <p className="mt-2 text-sm text-[var(--muted)]">No chapters are assigned to this scheduled day.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {visibleDay.chapters[0] && <Link className="inline-flex min-h-11 items-center rounded-md bg-[var(--forest)] px-5 text-sm font-semibold text-white hover:bg-[var(--forest-deep)]" href={`/bible?book=${encodeURIComponent(visibleDay.chapters[0].bookId)}&chapter=${visibleDay.chapters[0].chapterNumber}`}>Read now</Link>}
                <button className="min-h-11 rounded-md border border-[var(--forest)] px-4 text-sm font-medium text-[var(--forest-deep)] hover:bg-[var(--sage)] disabled:opacity-55" disabled={isSaving || visibleDay.chapterCount === 0} type="button" onClick={() => void toggleDay(visibleDay.dayNumber, visibleDayComplete)}>{isSaving ? "Saving…" : visibleDayComplete ? "Mark incomplete" : "Mark complete"}</button>
                {recoveryDayNumber !== null && <button className="min-h-11 px-2 text-sm text-[var(--muted)] underline underline-offset-4" type="button" onClick={() => setRecoveryDayNumber(null)}>Back to today</button>}
              </div>
            </div>
          ) : null}

          {actionError && <p className="mt-3 text-sm text-[#8c3f32]" role="alert">{actionError}</p>}
          {notice && <p className="mt-3 text-sm text-[var(--forest-deep)]" role="status">{notice}</p>}

          {!!today.missedDayNumbers.length && (
            <details className="mt-4 rounded-md border border-[var(--line)] bg-white/45 p-4" open={mode === "full"}>
              <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">Incomplete earlier days ({today.missedDayNumbers.length})</summary>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Nothing has been rescheduled. Choose a day to read or mark it complete when you are ready.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {today.missedDayNumbers.map((dayNumber) => (
                  <li key={dayNumber}><button className="min-h-9 rounded border border-[var(--line)] px-3 text-xs text-[var(--forest-deep)] hover:bg-[var(--sage)]" type="button" onClick={() => setRecoveryDayNumber(dayNumber)}>Open Day {dayNumber}</button></li>
                ))}
              </ul>
            </details>
          )}

          {mode === "home" && <Link className="mt-4 inline-block text-sm font-medium text-[var(--forest)] underline underline-offset-4" href="/today">Open full Today view</Link>}
        </>
      )}
    </section>
  );
}