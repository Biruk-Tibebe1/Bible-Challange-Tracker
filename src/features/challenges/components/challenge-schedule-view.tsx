"use client";

import type { GeneratedChallenge, EthiopianDate } from "../challenge-types";
import {
  calculateCompletionPercentage,
  countCompletedDays,
  isDayComplete,
} from "../../progress/progress-model";
import type { ChallengeProgress } from "../../progress/progress-model";

interface ChallengeScheduleViewProps {
  title: string;
  challenge: GeneratedChallenge;
  selectedDay: number;
  onSelectedDayChange: (dayNumber: number) => void;
  startDate?: EthiopianDate;
  endDate?: EthiopianDate;
  progress: ChallengeProgress;
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
          <dd className="mt-1 text-sm text-[var(--ink)]">{startDate ? formatEthiopianDate(startDate) : "Day 1"}</dd>
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
          <dd className="mt-1 text-sm text-[var(--ink)]">{challenge.totalChapterCount} chapters</dd>
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
      </section>

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
                  Day {availableDay.dayNumber}
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
                  <span>{chapter.bookName} {chapter.chapterNumber}</span>
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
      </div>
    </section>
  );
}