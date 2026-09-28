import assert from "node:assert/strict";
import test from "node:test";
import { generateChallenge } from "./challenge-generator.ts";
import { FULL_BIBLE_CHALLENGE, FULL_BIBLE_CHALLENGE_CONFIG } from "./predefined-challenge.ts";
import { validatePredefinedFullBibleChallenge } from "./challenge-validation.ts";
import type { ChallengeGenerationInput, GeneratedChallenge } from "./challenge-types.ts";

function assertCompleteOrderedCoverage(challenge: GeneratedChallenge): void {
  const chapters = challenge.days.flatMap((day) => day.chapters);
  assert.equal(chapters.length, challenge.totalChapterCount);
  assert.equal(new Set(chapters.map((chapter) => chapter.globalChapterNumber)).size, chapters.length);
  assert.deepEqual(
    chapters.map((chapter) => chapter.globalChapterNumber),
    Array.from({ length: chapters.length }, (_, index) => chapters[0]!.globalChapterNumber + index),
  );
}

test("predefined full-Bible challenge meets every schedule requirement", () => {
  validatePredefinedFullBibleChallenge(FULL_BIBLE_CHALLENGE);

  assert.equal(FULL_BIBLE_CHALLENGE_CONFIG.calendar, "Ethiopian");
  assert.deepEqual(FULL_BIBLE_CHALLENGE_CONFIG.startDate, { year: 2019, month: "Meskerem", day: 1 });
  assert.deepEqual(FULL_BIBLE_CHALLENGE_CONFIG.endDate, { year: 2019, month: "Pagume", day: 5 });
  assert.equal(FULL_BIBLE_CHALLENGE_CONFIG.durationDays, 365);
  assert.equal(FULL_BIBLE_CHALLENGE.totalDays, 365);
  assert.equal(FULL_BIBLE_CHALLENGE.totalChapterCount, 1189);
  assert.deepEqual(
    FULL_BIBLE_CHALLENGE.days[0]?.chapters.map((chapter) => `${chapter.bookName} ${chapter.chapterNumber}`),
    ["Genesis 1", "Genesis 2", "Genesis 3"],
  );
  assert.deepEqual(
    FULL_BIBLE_CHALLENGE.days.at(-1)?.chapters.map((chapter) => `${chapter.bookName} ${chapter.chapterNumber}`),
    ["Revelation 19", "Revelation 20", "Revelation 21", "Revelation 22"],
  );
  assertCompleteOrderedCoverage(FULL_BIBLE_CHALLENGE);
});

test("Genesis 1 through Genesis 10 across ten days assigns one chapter per day", () => {
  const challenge = generateChallenge({
    startLocation: { bookId: "genesis", chapterNumber: 1 },
    endLocation: { bookId: "genesis", chapterNumber: 10 },
    totalDays: 10,
  });

  assert.equal(challenge.days.length, 10);
  assert.ok(challenge.days.every((day) => day.chapterCount === 1));
  assert.equal(challenge.days[0]?.chapters[0]?.chapterNumber, 1);
  assert.equal(challenge.days[9]?.chapters[0]?.chapterNumber, 10);
});

test("Genesis 10 through Exodus 15 distributes 56 ordered chapters across seven days", () => {
  const challenge = generateChallenge({
    startLocation: { bookId: "genesis", chapterNumber: 10 },
    endLocation: { bookId: "exodus", chapterNumber: 15 },
    totalDays: 7,
  });
  const chapterCounts = challenge.days.map((day) => day.chapterCount);

  assert.equal(challenge.totalChapterCount, 56);
  assert.equal(challenge.days.length, 7);
  assert.ok(Math.max(...chapterCounts) - Math.min(...chapterCounts) <= 1);
  assert.equal(challenge.days[0]?.chapters[0]?.bookId, "genesis");
  assert.equal(challenge.days[0]?.chapters[0]?.chapterNumber, 10);
  assert.equal(challenge.days[6]?.chapters.at(-1)?.bookId, "exodus");
  assert.equal(challenge.days[6]?.chapters.at(-1)?.chapterNumber, 15);
  assertCompleteOrderedCoverage(challenge);
});

test("Matthew 5 through Romans 8 contains the complete ordered range", () => {
  const challenge = generateChallenge({
    startLocation: { bookId: "matthew", chapterNumber: 5 },
    endLocation: { bookId: "romans", chapterNumber: 8 },
    totalDays: 10,
  });
  const chapters = challenge.days.flatMap((day) => day.chapters);

  assert.equal(challenge.totalChapterCount, 121);
  assert.equal(chapters[0]?.bookId, "matthew");
  assert.equal(chapters[0]?.chapterNumber, 5);
  assert.equal(chapters.at(-1)?.bookId, "romans");
  assert.equal(chapters.at(-1)?.chapterNumber, 8);
  assertCompleteOrderedCoverage(challenge);
});

test("a same-chapter range produces exactly one chapter", () => {
  const challenge = generateChallenge({
    startLocation: { bookId: "genesis", chapterNumber: 1 },
    endLocation: { bookId: "genesis", chapterNumber: 1 },
    totalDays: 1,
  });

  assert.equal(challenge.totalChapterCount, 1);
  assert.equal(challenge.days[0]?.chapterCount, 1);
  assert.equal(challenge.days[0]?.chapters[0]?.bookId, "genesis");
  assert.equal(challenge.days[0]?.chapters[0]?.chapterNumber, 1);
});

test("a reversed Bible range is rejected clearly", () => {
  assert.throws(
    () => generateChallenge({
      startLocation: { bookId: "exodus", chapterNumber: 10 },
      endLocation: { bookId: "genesis", chapterNumber: 10 },
      totalDays: 7,
    }),
    /Start Bible location must not come after end Bible location/,
  );
});

test("a non-positive duration is rejected", () => {
  const input: ChallengeGenerationInput = {
    startLocation: { bookId: "genesis", chapterNumber: 1 },
    endLocation: { bookId: "genesis", chapterNumber: 10 },
    totalDays: 0,
  };

  assert.throws(() => generateChallenge(input), /totalDays must be a positive safe integer/);
});

test("days beyond the chapter count remain empty after one-chapter days", () => {
  const challenge = generateChallenge({
    startLocation: { bookId: "genesis", chapterNumber: 1 },
    endLocation: { bookId: "genesis", chapterNumber: 5 },
    totalDays: 7,
  });

  assert.deepEqual(challenge.days.map((day) => day.chapterCount), [1, 1, 1, 1, 1, 0, 0]);
  assertCompleteOrderedCoverage(challenge);
});