"use client";

import type { GeneratedChallenge, EthiopianDate } from "../challenge-types";
import Link from "next/link";
import {
  calculateCompletionPercentage,
  countCompletedDays,
  isDayComplete,
} from "../../progress/progress-model";
import type { ChallengeProgress } from "../../progress/progress-model";
import type { TodayChallengeSelection } from "../today-model";

interface ChallengeScheduleViewProps {
  title: string;
  challenge: GeneratedChallenge;
  selectedDay: number;
  onSelectedDayChange: (dayNumber: number) => void;
  startDate?: EthiopianDate;
  endDate?: EthiopianDate;
  progress: ChallengeProgress;
  todayStats: TodayChallengeSelection;
  onToggleDayCompletion: (dayNumber: number) => void | Promise<void>;
  isProgressLoading?: boolean;
  isSavingDay?: boolean;
  canToggleCompletion?: boolean;
  progressError?: string;
  progressNotice?: string;
}

function formatEthiopianDate(date: EthiopianDate): string {
  return `${date.month} ${date.day}, ${date.year} E.C.`;
}

export function ChallengeScheduleView({
  title,
  challenge,
  selectedDay,
  onSelectedDayChange,
  startDate,
  endDate,
  progress,
  todayStats,
  onToggleDayCompletion,
  isProgressLoading = false,
  isSavingDay = false,
  canToggleCompletion = true,
  progressError = "",
  progressNotice = "",
}: ChallengeScheduleViewProps) {
  const day = challenge.days[selectedDay - 1];
  const selectedEthiopianDate = selectedDay === 1
    ? startDate
    : selectedDay === challenge.totalDays
      ? endDate
      : undefined;

  if (!day) return null;

  const completedDayCount = countCompletedDays(progress);
  const completionPercentage = calculateCompletionPercentage(progress);
  const selectedDayIsComplete = isDayComplete(progress, day.dayNumber);

  return (
    <section aria-labelledby="selected-challenge-title" className="mt-9 border-t border-[var(--line)] pt-8">
      <h2 id="selected-challenge-title" className="text-2xl text-[var(--ink)] sm:text-3xl">{title}</h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Start</dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">{startDate ? formatEthiopianDate(startDate) : "Not configured"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">End</dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">{endDate ? formatEthiopianDate(endDate) : `Day ${challenge.totalDays}`}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Duration</dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">{challenge.totalDays} days</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Reading</dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">{todayStats.completedChapterCount} / {todayStats.totalChapterCount} complete</dd>
        </div>
      </dl>

      <section aria-label="Challenge progress" className="mt-6 border-y border-[var(--line)] py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-medium text-[var(--ink)]">Progress</h3>
          <p aria-live="polite" className="text-sm text-[var(--muted)]">
            {isProgressLoading ? "Loading progress…" : (
              <>
                <span className="font-medium text-[var(--ink)]">{completedDayCount} / {progress.totalDayCount}</span> days completed
                <span className="px-1.5" aria-hidden="true">·</span>
                {completionPercentage.toFixed(1)}% complete
              </>
            )}
          </p>
        </div>
        <div
          aria-label="Challenge completion"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={completionPercentage}
          className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9ebe4]"
          role="progressbar"
        >
          <div className="h-full rounded-full bg-[var(--forest)] transition-[width]" style={{ width: `${completionPercentage}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><p className="text-xs text-[var(--muted)]">Remaining days</p><p className="mt-1 text-sm font-medium text-[var(--ink)]">{Math.max(0, challenge.totalDays - completedDayCount)}</p></div>
          <div><p className="text-xs text-[var(--muted)]">Remaining chapters</p><p className="mt-1 text-sm font-medium text-[var(--ink)]">{todayStats.remainingChapterCount}</p></div>
          <div><p className="text-xs text-[var(--muted)]">Current streak</p><p className="mt-1 text-sm font-medium text-[var(--ink)]">{todayStats.currentStreak} days</p></div>
          <div><p className="text-xs text-[var(--muted)]">Longest streak</p><p className="mt-1 text-sm font-medium text-[var(--ink)]">{todayStats.longestStreak} days</p></div>
        </div>
      </section>

      {todayStats.isComplete && (
        <section aria-label="Challenge completion" className="mt-5 rounded-md bg-[var(--sage)] p-4">
          <h3 className="font-medium text-[var(--forest-deep)]">Challenge completed</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {todayStats.completedAt
              ? `Completed ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(todayStats.completedAt))}.`
              : "All scheduled days are complete."}
            {" "}This challenge remains in your history.
          </p>
        </section>
      )}

      <div className="mt-8 rounded-lg border border-[var(--line)] bg-white/55 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--forest)]">Selected day</p>
            <h3 className="mt-1 text-2xl text-[var(--ink)]">Day {day.dayNumber}</h3>
            {selectedEthiopianDate && (
              <p className="mt-1 text-sm text-[var(--muted)]">{formatEthiopianDate(selectedEthiopianDate)}</p>
            )}
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--muted)]">
            Go to day
            <select
              aria-label="Select challenge day"
              className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
              value={selectedDay}
              onChange={(event) => onSelectedDayChange(Number(event.target.value))}
            >
              {challenge.days.map((availableDay) => (
                <option key={availableDay.dayNumber} value={availableDay.dayNumber}>
                  Day {availableDay.dayNumber} · {todayStats.completedDayNumbers.includes(availableDay.dayNumber) ? "Complete" : "Incomplete"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-[var(--muted)]">Reading</p>
          {day.chapterCount === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No chapters are assigned to this day.</p>
          ) : (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {day.chapters.map((chapter) => (
                <li
                  key={chapter.globalChapterNumber}
                  className="flex min-h-12 items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-[var(--ink)]"
                >
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--sunlight)]" />
                  <Link className="min-h-10 rounded-sm underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--forest)]" href={`/bible?book=${encodeURIComponent(chapter.bookId)}&chapter=${chapter.chapterNumber}`}>
                    {chapter.bookName} {chapter.chapterNumber}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <p className="mb-3 text-sm text-[var(--muted)]">
            {selectedDayIsComplete ? "This day's reading is complete." : "This day's reading is not complete."}
          </p>
          {progressError && <p className="mb-3 text-sm text-[#9a3f32]" role="alert">{progressError}</p>}
          {progressNotice && <p className="mb-3 text-sm text-[var(--forest-deep)]" role="status">{progressNotice}</p>}
          <button
            aria-pressed={selectedDayIsComplete}
            aria-label={selectedDayIsComplete ? `Mark Day ${day.dayNumber} incomplete` : `Mark Day ${day.dayNumber} complete`}
            className={`min-h-12 w-full rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)] sm:w-auto ${selectedDayIsComplete ? "border border-[var(--forest)] bg-[var(--sage)] text-[var(--forest-deep)]" : "bg-[var(--forest)] text-white hover:bg-[var(--forest-deep)]"}`}
            disabled={!canToggleCompletion || isSavingDay}
            type="button"
            onClick={() => void onToggleDayCompletion(day.dayNumber)}
          >
            {isSavingDay ? "Saving…" : selectedDayIsComplete ? "Completed ✓" : "Mark Day Complete"}
          </button>
        </div>

        <div className="mt-6 flex justify-between gap-3 border-t border-[var(--line)] pt-4">
          <button
            className="min-h-11 rounded-md border border-[var(--line)] px-4 text-sm text-[var(--ink)] enabled:hover:bg-[var(--sage)] disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            disabled={selectedDay === 1}
            onClick={() => onSelectedDayChange(selectedDay - 1)}
          >
            Previous day
          </button>
          <button
            className="min-h-11 rounded-md bg-[var(--forest)] px-4 text-sm text-white enabled:hover:bg-[var(--forest-deep)] disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            disabled={selectedDay === challenge.totalDays}
            onClick={() => onSelectedDayChange(selectedDay + 1)}
          >
            Next day
          </button>
        </div>

        {todayStats.incompleteDayNumbers.length > 0 && (
          <details className="mt-5 border-t border-[var(--line)] pt-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--forest-deep)]">
              Incomplete scheduled days ({todayStats.incompleteDayNumbers.length})
            </summary>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Choose any earlier day to recover it. Scheduled readings stay on their original days.</p>
            <div className="mt-3 grid max-h-44 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
              {todayStats.incompleteDayNumbers.map((dayNumber) => (
                <button aria-label={`Open incomplete Day ${dayNumber}`} className="min-h-9 rounded border border-[var(--line)] bg-white px-2 text-xs text-[var(--ink)] hover:bg-[var(--sage)]" key={dayNumber} type="button" onClick={() => onSelectedDayChange(dayNumber)}>
                  Day {dayNumber}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}