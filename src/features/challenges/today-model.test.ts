import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedChallenge } from "./challenge-types.ts";
import {
  calculateEthiopianScheduledDay,
  calculateLongestStreak,
  calculateScheduledCurrentStreak,
  getChallengeCompletionDate,
  getEthiopianCalendarDate,
  selectActiveChallenges,
  selectTodayChallenge,
} from "./today-model.ts";
import type { ScheduledChallengeForToday } from "./today-model.ts";

function makeSchedule(chapterCounts: readonly number[]): GeneratedChallenge {
  let nextChapter = 1;
  const days = chapterCounts.map((chapterCount, index) => ({
    dayNumber: index + 1,
    chapters: Array.from({ length: chapterCount }, (_, chapterIndex) => ({
      bookId: "genesis",
      bookNumber: 1,
      bookName: "Genesis",
      testament: "Old Testament" as const,
      chapterNumber: nextChapter + chapterIndex,
      globalChapterNumber: nextChapter + chapterIndex,
    })),
    chapterCount,
  }));
  nextChapter += chapterCounts.reduce((sum, value) => sum + value, 0);
  return {
    totalDays: days.length,
    totalChapterCount: nextChapter - 1,
    days,
  };
}

function makeChallenge(overrides: Partial<ScheduledChallengeForToday> = {}): ScheduledChallengeForToday {
  return {
    id: "plan-a",
    name: "Genesis plan",
    challengeType: "custom",
    schedule: makeSchedule([2, 1, 3, 1, 2]),
    completedDayRecords: [],
    ...overrides,
  };
}

test("Ethiopian calendar maps dates and respects schedule start/end boundaries", () => {
  const start = { year: 2019, month: "Meskerem", day: 1 } as const;
  assert.deepEqual(getEthiopianCalendarDate(new Date("2026-09-11T12:00:00.000Z")), start);
  assert.equal(calculateEthiopianScheduledDay(start, new Date("2026-09-10T12:00:00.000Z")), 0);
  assert.equal(calculateEthiopianScheduledDay(start, new Date("2026-09-11T12:00:00.000Z")), 1);
  assert.equal(calculateEthiopianScheduledDay(start, new Date("2026-09-12T12:00:00.000Z")), 2);
  assert.equal(calculateEthiopianScheduledDay(start, new Date("2027-09-10T12:00:00.000Z")), 365);
  assert.equal(calculateEthiopianScheduledDay(start, new Date("2027-09-11T12:00:00.000Z")), 366);
});

test("undated custom challenge uses its next incomplete day without inventing missed calendar days", () => {
  const selected = selectTodayChallenge(makeChallenge({
    completedDayRecords: [
      { dayNumber: 1, completedAt: "2026-09-28T12:00:00.000Z" },
      { dayNumber: 3, completedAt: "2026-09-29T12:00:00.000Z" },
    ],
  }), new Date("2026-09-30T12:00:00.000Z"));

  assert.equal(selected.scheduledDayNumber, 2);
  assert.equal(selected.isScheduledToday, false);
  assert.deepEqual(selected.missedDayNumbers, []);
});

test("dated challenges show incomplete earlier schedule days for recovery", () => {
  const selected = selectTodayChallenge(makeChallenge({
    challengeType: "predefined",
    startDate: { year: 2019, month: "Meskerem", day: 1 },
    endDate: { year: 2019, month: "Pagume", day: 5 },
    completedDayRecords: [
      { dayNumber: 1, completedAt: "2026-09-11T10:00:00.000Z" },
      { dayNumber: 3, completedAt: "2026-09-13T10:00:00.000Z" },
    ],
  }), new Date("2026-09-15T12:00:00.000Z"));

  assert.equal(selected.scheduledDayNumber, 5);
  assert.equal(selected.isScheduledToday, true);
  assert.deepEqual(selected.missedDayNumbers, [2, 4]);
  assert.deepEqual(selected.incompleteDayNumbers, [2, 4, 5]);
});

test("day completion is deduplicated and drives chapter counts, percentages, and streaks", () => {
  const selected = selectTodayChallenge(makeChallenge({
    completedDayRecords: [
      { dayNumber: 1, completedAt: "2026-09-28T10:00:00.000Z" },
      { dayNumber: 1, completedAt: "2026-09-28T11:00:00.000Z" },
      { dayNumber: 2, completedAt: "2026-09-29T10:00:00.000Z" },
      { dayNumber: 5, completedAt: "2026-09-30T10:00:00.000Z" },
      { dayNumber: 999, completedAt: "2026-09-30T10:00:00.000Z" },
    ],
  }), new Date("2026-09-30T12:00:00.000Z"));

  assert.deepEqual(selected.completedDayNumbers, [1, 2, 5]);
  assert.equal(selected.completedDays, 3);
  assert.equal(selected.completionPercentage, 60);
  assert.equal(selected.completedChapterCount, 5);
  assert.equal(selected.totalChapterCount, 9);
  assert.equal(selected.remainingChapterCount, 4);
  assert.equal(selected.currentStreak, 2);
  assert.equal(selected.longestStreak, 2);
});

test("streak helpers handle duplicate days, gaps, and missed current day", () => {
  assert.equal(calculateLongestStreak([1, 2, 2, 4, 5, 6]), 3);
  assert.equal(calculateScheduledCurrentStreak([1, 2, 4], 5), 1);
  assert.equal(calculateScheduledCurrentStreak([1, 2, 4], 3), 2);
  assert.equal(calculateScheduledCurrentStreak([1, 2, 4], 1), 1);
});

test("challenge completion date is present only after all scheduled days are complete", () => {
  const days = [
    { dayNumber: 1, completedAt: "2026-09-29T10:00:00.000Z" },
    { dayNumber: 2, completedAt: null },
  ];
  assert.equal(getChallengeCompletionDate(days, 2), null);
  assert.equal(getChallengeCompletionDate([
    ...days,
    { dayNumber: 2, completedAt: "2026-09-30T10:00:00.000Z" },
  ], 2), "2026-09-30T10:00:00.000Z");
  assert.equal(getChallengeCompletionDate([
    { dayNumber: 2, completedAt: "2026-09-29T10:00:00.000Z" },
    { dayNumber: 3, completedAt: "2026-09-30T10:00:00.000Z" },
  ], 2), null);
});

test("multiple saved challenges keep independent active/completed groups", () => {
  const result = selectActiveChallenges([
    { id: "active", completedDays: 2, totalDays: 5 },
    { id: "complete", completedDays: 3, totalDays: 3 },
  ]);
  assert.deepEqual(result.active.map((item) => item.id), ["active"]);
  assert.deepEqual(result.completed.map((item) => item.id), ["complete"]);
});