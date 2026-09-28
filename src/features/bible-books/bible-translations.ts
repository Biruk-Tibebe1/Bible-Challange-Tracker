import type { BibleLocation } from "./bible-data";

export type BibleTranslationId = "amharic" | "niv" | "kjv";

export interface BibleTranslation {
  id: BibleTranslationId;
  name: string;
  locale: string;
  label: string;
}

export interface BibleVerse {
  id: string;
  verseNumber: number;
  text: string;
}

export interface BibleChapterText {
  location: BibleLocation;
  translation: BibleTranslationId;
  verses: readonly BibleVerse[];
}

export type BibleTextResult =
  | { status: "available"; chapter: BibleChapterText }
  | { status: "unavailable"; reason: "translation-not-available" | "source-not-configured"; message: string }
  | { status: "error"; message: string };

export interface BibleTextProvider {
  getChapter(
    location: BibleLocation,
    translation: BibleTranslationId,
    signal?: AbortSignal,
  ): Promise<BibleTextResult>;
}

export function getTranslationUnavailableState(
  translation: BibleTranslationId,
): Extract<BibleTextResult, { status: "unavailable" }> | null {
  if (translation === "amharic") {
    return {
      status: "unavailable",
      reason: "translation-not-available",
      message: "The Amharic Bible translation is not yet available.",
    };
  }
  if (translation === "niv") {
    return {
      status: "unavailable",
      reason: "source-not-configured",
      message: "NIV source not configured.",
    };
  }
  return null;
}

export const BIBLE_TRANSLATIONS: readonly BibleTranslation[] = [
  { id: "amharic", name: "Amharic Bible", locale: "am", label: "🇪🇹 Amharic Bible" },
  { id: "niv", name: "New International Version", locale: "en", label: "🇺🇸 NIV — New International Version" },
  { id: "kjv", name: "King James Version", locale: "en", label: "📜 KJV — King James Version" },
];