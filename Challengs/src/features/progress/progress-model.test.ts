import assert from "node:assert/strict";
import test from "node:test";
import { FULL_BIBLE_CHALLENGE } from "../challenges/predefined-challenge.ts";
import {
  calculateCompletionPercentage,
  countCompletedDays,
  createProgressFromCompletedDays,
  createInitialProgress,
  isDayComplete,
  markDayComplete,
  toggleDayCompletion,
} from "./progress-model.ts";

test("a new 365-day progress record starts with no completed days", () => {
  const progress = createInitialProgress("full-bible-2019", 365);

  assert.equal(countCompletedDays(progress), 0);
  assert.equal(progress.totalDayCount, 365);
  assert.equal(calculateCompletionPercentage(progress), 0);
  assert.equal(progress.days.length, 365);
  assert.ok(progress.days.every((day) => day.status === "incomplete"));
});

test("marking a day complete updates that day and the completed count", () => {
  const initialProgress = createInitialProgress("full-bible-2019", 365);
  const progress = markDayComplete(initialProgress, 1);

  assert.equal(isDayComplete(progress, 1), true);
  assert.equal(countCompletedDays(progress), 1);
  assert.equal(isDayComplete(initialProgress, 1), false);
});

test("multiple day completions are counted independently", () => {
  let progress = createInitialProgress("full-bible-2019", 365);
  progress = markDayComplete(progress, 1);
  progress = markDayComplete(progress, 2);
  progress = markDayComplete(progress, 5);

  assert.equal(countCompletedDays(progress), 3);
  assert.deepEqual(
    progress.days.filter((day) => day.status === "complete").map((day) => day.dayNumber),
    [1, 2, 5],
  );
});

test("toggling a completed day marks it incomplete and reduces the count", () => {
  const completedProgress = markDayComplete(createInitialProgress("full-bible-2019", 365), 1);
  const progress = toggleDayCompletion(completedProgress, 1);

  assert.equal(isDayComplete(progress, 1), false);
  assert.equal(countCompletedDays(progress), 0);
});

test("completion percentage is calculated without rounding in the model", () => {
  const progress = markDayComplete(createInitialProgress("full-bible-2019", 365), 1);

  assert.equal(calculateCompletionPercentage(progress), (100 / 365));
  assert.ok(Math.abs(calculateCompletionPercentage(progress) - 0.273972602739726) < 1e-12);
});

test("progress for independent challenge identifiers does not overlap", () => {
  const challengeA = markDayComplete(createInitialProgress("challenge-a", 365), 1);
  const challengeB = createInitialProgress("challenge-b", 365);

  assert.equal(isDayComplete(challengeA, 1), true);
  assert.equal(isDayComplete(challengeB, 1), false);
});

test("completion updates do not mutate challenge schedule data", () => {
  const scheduleSnapshot = JSON.stringify(FULL_BIBLE_CHALLENGE);
  const progress = markDayComplete(createInitialProgress("full-bible-2019", 365), 1);

  assert.equal(isDayComplete(progress, 1), true);
  assert.equal(JSON.stringify(FULL_BIBLE_CHALLENGE), scheduleSnapshot);
  assert.equal("completed" in FULL_BIBLE_CHALLENGE.days[0]!, false);
  assert.equal("isCompleted" in FULL_BIBLE_CHALLENGE.days[0]!, false);
  assert.equal("completed" in FULL_BIBLE_CHALLENGE.days[0]!.chapters[0]!, false);
  assert.equal(FULL_BIBLE_CHALLENGE.totalChapterCount, 1189);
});

test("persisted completed day numbers hydrate into the same progress model", () => {
  const progress = createProgressFromCompletedDays("saved-plan", 365, [1, 2, 5]);

  assert.equal(progress.challengeId, "saved-plan");
  assert.equal(countCompletedDays(progress), 3);
  assert.equal(isDayComplete(progress, 1), true);
  assert.equal(isDayComplete(progress, 2), true);
  assert.equal(isDayComplete(progress, 3), false);
  assert.equal(isDayComplete(progress, 5), true);
});