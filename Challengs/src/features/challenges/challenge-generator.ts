import { getBibleChapterRange } from "../bible-books/bible-data.ts";
import type { ChallengeGenerationInput, ChallengeDay, GeneratedChallenge } from "./challenge-types.ts";

export function generateChallenge(input: ChallengeGenerationInput): GeneratedChallenge {
  if (!Number.isSafeInteger(input.totalDays) || input.totalDays <= 0) {
    throw new RangeError("totalDays must be a positive safe integer.");
  }

  const chapters = getBibleChapterRange(input.startLocation, input.endLocation);
  const baseChapterCount = Math.floor(chapters.length / input.totalDays);
  const remainder = chapters.length % input.totalDays;
  const remainderPlacement = input.remainderPlacement ?? "earlier";
  let chapterOffset = 0;

  const days: ChallengeDay[] = Array.from({ length: input.totalDays }, (_, index) => {
    const getsRemainderChapter = baseChapterCount === 0 || remainderPlacement === "earlier"
      ? index < remainder
      : index >= input.totalDays - remainder;
    const chapterCount = baseChapterCount + (getsRemainderChapter ? 1 : 0);
    const dayChapters = chapters.slice(chapterOffset, chapterOffset + chapterCount);
    chapterOffset += chapterCount;

    return {
      dayNumber: index + 1,
      chapters: dayChapters,
      chapterCount: dayChapters.length,
    };
  });

  return {
    totalDays: days.length,
    totalChapterCount: chapters.length,
    days,
  };
}