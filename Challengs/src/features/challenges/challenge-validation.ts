import { BIBLE_CHAPTERS } from "../bible-books/bible-data.ts";
import type { GeneratedChallenge } from "./challenge-types.ts";

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Challenge validation failed: ${message}`);
}

export function validatePredefinedFullBibleChallenge(challenge: GeneratedChallenge): void {
  requireCondition(challenge.totalDays === 365, `expected 365 days; found ${challenge.totalDays}.`);
  requireCondition(challenge.days.length === 365, `expected 365 day entries; found ${challenge.days.length}.`);
  requireCondition(
    challenge.totalChapterCount === 1189,
    `expected 1189 scheduled chapters; found ${challenge.totalChapterCount}.`,
  );

  challenge.days.forEach((day, index) => {
    requireCondition(day.dayNumber === index + 1, `expected Day ${index + 1}; found Day ${day.dayNumber}.`);
    requireCondition(
      day.chapterCount === day.chapters.length,
      `Day ${day.dayNumber} chapterCount does not match its chapter list.`,
    );
  });

  const chapters = challenge.days.flatMap((day) => day.chapters);
  requireCondition(chapters.length === 1189, `expected 1189 chapter entries; found ${chapters.length}.`);

  const firstChapter = chapters[0];
  const lastChapter = chapters.at(-1);
  requireCondition(
    firstChapter?.bookId === "genesis" && firstChapter.chapterNumber === 1,
    "the first scheduled chapter must be Genesis 1.",
  );
  requireCondition(
    lastChapter?.bookId === "revelation" && lastChapter.chapterNumber === 22,
    "the last scheduled chapter must be Revelation 22.",
  );
  requireCondition(
    challenge.days[0]?.chapters.at(-1)?.bookId === "genesis" &&
      challenge.days[0]?.chapters.at(-1)?.chapterNumber === 3,
    "Day 1 must end with Genesis 3.",
  );
  requireCondition(
    challenge.days.at(-1)?.chapters[0]?.bookId === "revelation" &&
      challenge.days.at(-1)?.chapters[0]?.chapterNumber === 19,
    "Day 365 must start with Revelation 19.",
  );

  const uniqueGlobalNumbers = new Set(chapters.map((chapter) => chapter.globalChapterNumber));
  requireCondition(uniqueGlobalNumbers.size === 1189, "scheduled chapters contain duplicates.");
  chapters.forEach((chapter, index) => {
    const canonicalChapter = BIBLE_CHAPTERS[index];
    requireCondition(
      canonicalChapter !== undefined &&
        chapter.globalChapterNumber === canonicalChapter.globalChapterNumber &&
        chapter.bookId === canonicalChapter.bookId &&
        chapter.chapterNumber === canonicalChapter.chapterNumber,
      `scheduled chapter at position ${index + 1} does not match the canonical Bible chapter.`,
    );
  });

  const threeChapterDays = challenge.days.filter((day) => day.chapterCount === 3).length;
  const fourChapterDays = challenge.days.filter((day) => day.chapterCount === 4).length;
  requireCondition(threeChapterDays === 271, `expected 271 three-chapter days; found ${threeChapterDays}.`);
  requireCondition(fourChapterDays === 94, `expected 94 four-chapter days; found ${fourChapterDays}.`);
  requireCondition(
    challenge.days.every((day) => day.chapterCount === 3 || day.chapterCount === 4),
    "daily chapter counts must be only 3 or 4.",
  );
  requireCondition(271 * 3 + 94 * 4 === 1189, "configured daily distribution must total 1189 chapters.");
}