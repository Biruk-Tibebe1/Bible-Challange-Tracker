import type { EthiopianDate } from "./challenge-types";
import type { GeneratedChallenge } from "./challenge-types";

export interface ChallengeDayCompletion {
  dayNumber: number;
  completedAt: string | null;
}

export interface ScheduledChallengeForToday {
  id: string;
  name: string;
  schedule: GeneratedChallenge;
  completedDayRecords: readonly ChallengeDayCompletion[];
  startDate?: EthiopianDate;
  endDate?: EthiopianDate;
  challengeType: "predefined" | "custom";
}

export interface TodayChallengeSelection {
  challengeId: string;
  scheduledDayNumber: number | null;
  isScheduledToday: boolean;
  isUpcoming: boolean;
  isPastSchedule: boolean;
  isComplete: boolean;
  incompleteDayNumbers: number[];
  missedDayNumbers: number[];
  completedDayNumbers: number[];
  completedChapterCount: number;
  totalChapterCount: number;
  remainingChapterCount: number;
  completedDays: number;
  totalDays: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  completedAt: string | null;
  ethiopianToday: EthiopianDate | null;
}

const ETHIOPIAN_MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
  "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getEthiopianCalendarDate(date: Date, timeZone = "UTC"): EthiopianDate | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-ethiopic", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const formattedMonth = parts.find((part) => part.type === "month")?.value;
    const month = formattedMonth === "Pagumen" ? "Pagume" : formattedMonth;
    if (!Number.isInteger(year) || !Number.isInteger(day) || !ETHIOPIAN_MONTHS.includes(month as typeof ETHIOPIAN_MONTHS[number])) return null;
    return { year, month: month as EthiopianDate["month"], day };
  } catch {
    return null;
  }
}

function ethiopianOrdinal(date: EthiopianDate, timeZone: string): number | null {
  const monthIndex = ETHIOPIAN_MONTHS.indexOf(date.month as typeof ETHIOPIAN_MONTHS[number]);
  if (monthIndex < 0 || date.day < 1 || date.day > (date.month === "Pagume" ? 6 : 30)) return null;

  const formatter = new Intl.DateTimeFormat("en-US-u-ca-ethiopic", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
  const candidateYear = date.year + 7;
  let yearStart: number | null = null;
  for (let offset = 0; offset <= 45; offset += 1) {
    const candidate = Date.UTC(candidateYear, 8, 1 + offset, 12);
    const parts = formatter.formatToParts(new Date(candidate));
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = parts.find((part) => part.type === "month")?.value;
    const day = Number(parts.find((part) => part.type === "day")?.value);
    if (year === date.year && month === "Meskerem" && day === 1) {
      yearStart = candidate;
      break;
    }
  }
  if (yearStart === null) return null;
  return Math.floor(yearStart / DAY_MS) + monthIndex * 30 + date.day - 1;
}

export function calculateEthiopianScheduledDay(
  startDate: EthiopianDate,
  currentDate: Date,
  timeZone = "UTC",
): number | null {
  const today = getEthiopianCalendarDate(currentDate, timeZone);
  if (!today) return null;
  const startOrdinal = ethiopianOrdinal(startDate, timeZone);
  const todayOrdinal = ethiopianOrdinal(today, timeZone);
  if (startOrdinal === null || todayOrdinal === null) return null;
  return todayOrdinal - startOrdinal + 1;
}

function normalizeCompletedDays(
  challenge: ScheduledChallengeForToday,
): { dayNumbers: number[]; completedAt: string | null } {
  const validRecords = challenge.completedDayRecords.filter((record) =>
    Number.isSafeInteger(record.dayNumber) && record.dayNumber >= 1 && record.dayNumber <= challenge.schedule.totalDays,
  );
  const dayNumbers = [...new Set(validRecords.map((record) => record.dayNumber))].sort((a, b) => a - b);
  const completedAt = validRecords
    .filter((record) => dayNumbers.includes(record.dayNumber) && record.completedAt && !Number.isNaN(Date.parse(record.completedAt)))
    .map((record) => record.completedAt!)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  return { dayNumbers, completedAt };
}

export function calculateLongestStreak(completedDayNumbers: readonly number[]): number {
  const sortedDays = [...new Set(completedDayNumbers)]
    .filter((day) => Number.isSafeInteger(day) && day > 0)
    .sort((left, right) => left - right);
  let longest = 0;
  let current = 0;
  let previous = 0;
  for (const day of sortedDays) {
    current = day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

export function calculateScheduledCurrentStreak(
  completedDayNumbers: readonly number[],
  currentDayNumber: number,
): number {
  const completed = new Set(completedDayNumbers);
  let day = completed.has(currentDayNumber) ? currentDayNumber : currentDayNumber - 1;
  if (day < 1 || !completed.has(day)) return 0;
  let streak = 0;
  while (day > 0 && completed.has(day)) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

export function selectTodayChallenge(
  challenge: ScheduledChallengeForToday,
  now = new Date(),
  timeZone = "UTC",
): TodayChallengeSelection {
  const { dayNumbers: completedDayNumbers, completedAt } = normalizeCompletedDays(challenge);
  const completedSet = new Set(completedDayNumbers);
  const totalDays = challenge.schedule.totalDays;
  const incompleteDayNumbers = challenge.schedule.days
    .filter((day) => !completedSet.has(day.dayNumber))
    .map((day) => day.dayNumber);
  const isComplete = incompleteDayNumbers.length === 0;
  const dateRelativeDay = challenge.startDate
    ? calculateEthiopianScheduledDay(challenge.startDate, now, timeZone)
    : null;
  const isScheduledToday = dateRelativeDay !== null && dateRelativeDay >= 1 && dateRelativeDay <= totalDays;
  const isUpcoming = dateRelativeDay !== null && dateRelativeDay < 1;
  const isPastSchedule = dateRelativeDay !== null && dateRelativeDay > totalDays;
  const scheduledDayNumber = isComplete
    ? null
    : isScheduledToday
      ? dateRelativeDay
      : isUpcoming
        ? 1
        : incompleteDayNumbers[0] ?? null;
  const missedDayNumbers = dateRelativeDay === null
    ? []
    : incompleteDayNumbers.filter((dayNumber) => dayNumber < dateRelativeDay || isPastSchedule);
  const completedChapterCount = challenge.schedule.days
    .filter((day) => completedSet.has(day.dayNumber))
    .reduce((total, day) => total + day.chapterCount, 0);
  const totalChapterCount = challenge.schedule.totalChapterCount;
  const completionPercentage = totalDays > 0 ? Math.round((completedDayNumbers.length / totalDays) * 100) : 0;
  const streakAnchor = scheduledDayNumber ?? (completedDayNumbers.at(-1) ?? 0);

  return {
    challengeId: challenge.id,
    scheduledDayNumber,
    isScheduledToday,
    isUpcoming,
    isPastSchedule,
    isComplete,
    incompleteDayNumbers,
    missedDayNumbers,
    completedDayNumbers,
    completedChapterCount,
    totalChapterCount,
    remainingChapterCount: Math.max(0, totalChapterCount - completedChapterCount),
    completedDays: completedDayNumbers.length,
    totalDays,
    completionPercentage,
    currentStreak: streakAnchor > 0 ? calculateScheduledCurrentStreak(completedDayNumbers, streakAnchor) : 0,
    longestStreak: calculateLongestStreak(completedDayNumbers),
    completedAt: isComplete ? completedAt : null,
    ethiopianToday: challenge.startDate ? getEthiopianCalendarDate(now, timeZone) : null,
  };
}

export function selectActiveChallenges<T extends { id: string; totalDays: number; completedDays: number }>(
  challenges: readonly T[],
): { active: T[]; completed: T[] } {
  return {
    active: challenges.filter((challenge) => challenge.completedDays < challenge.totalDays),
    completed: challenges.filter((challenge) => challenge.completedDays >= challenge.totalDays),
  };
}

export function getChallengeCompletionDate(
  completedDays: readonly ChallengeDayCompletion[],
  totalDays: number,
): string | null {
  if (!Number.isSafeInteger(totalDays) || totalDays <= 0) return null;
  const completeDays = new Set(completedDays
    .filter((record) => record.dayNumber >= 1 && record.dayNumber <= totalDays && record.completedAt && !Number.isNaN(Date.parse(record.completedAt)))
    .map((record) => record.dayNumber));
  if (completeDays.size !== totalDays) return null;
  return completedDays
    .filter((record) => completeDays.has(record.dayNumber) && record.completedAt && !Number.isNaN(Date.parse(record.completedAt)))
    .map((record) => record.completedAt!)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}