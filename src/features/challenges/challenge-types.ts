import type { BibleChapter, BibleLocation } from "../bible-books/bible-data.ts";

export type { BibleLocation } from "../bible-books/bible-data.ts";

export interface ChallengeDay {
  dayNumber: number;
  chapters: readonly BibleChapter[];
  chapterCount: number;
}

export interface ChallengeGenerationInput {
  startLocation: BibleLocation;
  endLocation: BibleLocation;
  totalDays: number;
  remainderPlacement?: "earlier" | "later";
}

export interface GeneratedChallenge {
  totalDays: number;
  totalChapterCount: number;
  days: readonly ChallengeDay[];
}

export type EthiopianMonth =
  | "Meskerem"
  | "Tikimt"
  | "Hidar"
  | "Tahsas"
  | "Tir"
  | "Yekatit"
  | "Megabit"
  | "Miazia"
  | "Ginbot"
  | "Sene"
  | "Hamle"
  | "Nehase"
  | "Pagume";

export interface EthiopianDate {
  year: number;
  month: EthiopianMonth;
  day: number;
}