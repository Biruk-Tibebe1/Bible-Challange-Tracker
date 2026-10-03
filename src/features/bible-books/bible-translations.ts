import type { BibleLocation } from "./bible-data";

export type BibleTranslationId = "amharic" | "niv" | "kjv";
export type BibleTranslationSourceType = "local" | "api" | "unconfigured";
export type BibleTranslationAvailability = "available" | "planned";

export interface BibleTranslation {
  id: BibleTranslationId;
  name: string;
  abbreviation: string;
  language: string;
  sourceType: BibleTranslationSourceType;
  availabilityStatus: BibleTranslationAvailability;
  label: string;
}

export interface BibleVerse {
  id: string;
  verseNumber: number;
  text: string;
  reference?: string;
}

export interface BibleAttribution {
  notice: string;
}

export interface BibleChapterText {
  location: BibleLocation;
  translation: BibleTranslationId;
  verses: readonly BibleVerse[];
  attribution?: BibleAttribution;
  fumsToken?: string;
}

export type BibleTextResult =
  | { status: "available"; chapter: BibleChapterText }
  | { status: "unavailable"; reason: "translation-not-available" | "source-not-configured" | "chapter-not-available" | "operation-not-supported"; message: string }
  | { status: "error"; reason?: "rate-limited"; message: string };

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
      reason: "source-not-configured",
      message: "Amharic source is not configured yet.",
    };
  }
  if (translation === "niv") {
    return {
      status: "unavailable",
      reason: "source-not-configured",
      message: "NIV source is not configured yet.",
    };
  }
  return null;
}

export const BIBLE_TRANSLATIONS: readonly BibleTranslation[] = [
  {
    id: "kjv",
    name: "King James Version",
    abbreviation: "KJV",
    language: "English",
    sourceType: "local",
    availabilityStatus: "available",
    label: "📜 KJV — King James Version",
  },
  {
    id: "amharic",
    name: "Amharic Bible",
    abbreviation: "AMH",
    language: "Amharic",
    sourceType: "api",
    availabilityStatus: "planned",
    label: "🇪🇹 Amharic Bible",
  },
  {
    id: "niv",
    name: "New International Version",
    abbreviation: "NIV",
    language: "English",
    sourceType: "api",
    availabilityStatus: "planned",
    label: "🇺🇸 NIV",
  },
];

export function isBibleTranslationId(value: unknown): value is BibleTranslationId {
  return typeof value === "string" && BIBLE_TRANSLATIONS.some((translation) => translation.id === value);
}

export function getBibleTranslation(id: BibleTranslationId): BibleTranslation {
  return BIBLE_TRANSLATIONS.find((translation) => translation.id === id)!;
}