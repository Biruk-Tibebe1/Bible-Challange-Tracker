export type DayCompletionStatus = "complete" | "incomplete";

export interface DayProgressRecord {
  dayNumber: number;
  status: DayCompletionStatus;
}

export interface ChallengeProgress {
  challengeId: string;
  totalDayCount: number;
  days: readonly DayProgressRecord[];
}

export function createInitialProgress(challengeId: string, totalDayCount: number): ChallengeProgress {
  if (!challengeId.trim()) {
    throw new RangeError("challengeId must not be empty.");
  }
  if (!Number.isSafeInteger(totalDayCount) || totalDayCount <= 0) {
    throw new RangeError("totalDayCount must be a positive safe integer.");
  }

  return {
    challengeId,
    totalDayCount,
    days: Array.from({ length: totalDayCount }, (_, index) => ({
      dayNumber: index + 1,
      status: "incomplete" as const,
    })),
  };
}

function updateDayStatus(
  progress: ChallengeProgress,
  dayNumber: number,
  status: DayCompletionStatus,
): ChallengeProgress {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > progress.totalDayCount) {
    throw new RangeError(`dayNumber must be between 1 and ${progress.totalDayCount}.`);
  }

  return {
    ...progress,
    days: progress.days.map((day) =>
      day.dayNumber === dayNumber ? { ...day, status } : day,
    ),
  };
}

export function markDayComplete(progress: ChallengeProgress, dayNumber: number): ChallengeProgress {
  return updateDayStatus(progress, dayNumber, "complete");
}

export function markDayIncomplete(progress: ChallengeProgress, dayNumber: number): ChallengeProgress {
  return updateDayStatus(progress, dayNumber, "incomplete");
}

export function toggleDayCompletion(progress: ChallengeProgress, dayNumber: number): ChallengeProgress {
  const isComplete = isDayComplete(progress, dayNumber);
  return updateDayStatus(progress, dayNumber, isComplete ? "incomplete" : "complete");
}

export function isDayComplete(progress: ChallengeProgress, dayNumber: number): boolean {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > progress.totalDayCount) {
    throw new RangeError(`dayNumber must be between 1 and ${progress.totalDayCount}.`);
  }

  return progress.days[dayNumber - 1]?.status === "complete";
}

export function countCompletedDays(progress: ChallengeProgress): number {
  return progress.days.filter((day) => day.status === "complete").length;
}

export function countTotalDays(progress: ChallengeProgress): number {
  return progress.totalDayCount;
}

export function calculateCompletionPercentage(progress: ChallengeProgress): number {
  return (countCompletedDays(progress) / countTotalDays(progress)) * 100;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function hasCompletedOnDate(completedAt: readonly string[], day = new Date()): boolean {
  const target = localDateKey(day);
  return completedAt.some((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && localDateKey(date) === target;
  });
}

export function calculateCurrentStreak(completedAt: readonly string[], now = new Date()): number {
  const completedDates = new Set<string>();
  for (const value of completedAt) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) completedDates.add(localDateKey(date));
  }

  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!completedDates.has(localDateKey(current))) current.setDate(current.getDate() - 1);
  if (!completedDates.has(localDateKey(current))) return 0;

  let streak = 0;
  while (completedDates.has(localDateKey(current))) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

export function createProgressFromCompletedDays(
  challengeId: string,
  totalDayCount: number,
  completedDayNumbers: readonly number[],
): ChallengeProgress {
  const completedDays = new Set(completedDayNumbers);
  let progress = createInitialProgress(challengeId, totalDayCount);

  for (const dayNumber of completedDays) {
    progress = markDayComplete(progress, dayNumber);
  }

  return progress;
}