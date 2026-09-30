import { findBibleChapter } from "./bible-data.ts";
import type { BibleLocation } from "./bible-data.ts";
import type { BibleTranslationId, BibleVerse } from "./bible-translations";

export const READING_POSITION_KEY = "bible-reading-position-v1";
export const BIBLE_BOOKMARKS_KEY = "bible-bookmarks-v1";

export interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ReadingPosition extends BibleLocation {
  translation: BibleTranslationId;
}

export interface BibleBookmark extends BibleLocation {
  id: string;
  translation: BibleTranslationId;
  verseNumber: number;
  text: string;
}

const translationIds: readonly BibleTranslationId[] = ["amharic", "niv", "kjv"];

function isTranslationId(value: unknown): value is BibleTranslationId {
  return typeof value === "string" && translationIds.includes(value as BibleTranslationId);
}

function isLocation(value: unknown): value is BibleLocation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<BibleLocation>;
  return typeof candidate.bookId === "string" &&
    typeof candidate.chapterNumber === "number" &&
    findBibleChapter(candidate.bookId, candidate.chapterNumber) !== undefined;
}

export function resolveReadingPosition(
  explicitLocation: BibleLocation | undefined,
  savedPosition: ReadingPosition | null,
  fallback: ReadingPosition = { translation: "amharic", bookId: "genesis", chapterNumber: 1 },
): ReadingPosition {
  if (explicitLocation && isLocation(explicitLocation)) {
    return {
      translation: savedPosition && isTranslationId(savedPosition.translation)
        ? savedPosition.translation
        : fallback.translation,
      ...explicitLocation,
    };
  }
  if (savedPosition && isTranslationId(savedPosition.translation) && isLocation(savedPosition)) {
    return savedPosition;
  }
  return fallback;
}

export function readReadingPosition(storage: LocalStorageLike): ReadingPosition | null {
  try {
    const raw = storage.getItem(READING_POSITION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const position = value as Partial<ReadingPosition>;
    const translation = position.translation;
    if (!isTranslationId(translation) || !isLocation(position)) return null;
    return {
      translation,
      bookId: position.bookId,
      chapterNumber: position.chapterNumber,
    };
  } catch {
    return null;
  }
}

export function saveReadingPosition(storage: LocalStorageLike, position: ReadingPosition): boolean {
  if (!isTranslationId(position.translation) || !isLocation(position)) return false;
  try {
    storage.setItem(READING_POSITION_KEY, JSON.stringify(position));
    return true;
  } catch {
    return false;
  }
}

function bookmarkId(
  translation: BibleTranslationId,
  location: BibleLocation,
  verseNumber: number,
): string {
  return `${translation}:${location.bookId}:${location.chapterNumber}:${verseNumber}`;
}

export function createBibleBookmark(
  translation: BibleTranslationId,
  location: BibleLocation,
  verse: BibleVerse,
): BibleBookmark {
  return {
    id: bookmarkId(translation, location, verse.verseNumber),
    translation,
    ...location,
    verseNumber: verse.verseNumber,
    text: verse.text,
  };
}

export function addBibleBookmark(
  bookmarks: readonly BibleBookmark[],
  bookmark: BibleBookmark,
): BibleBookmark[] {
  return bookmarks.some((item) => item.id === bookmark.id)
    ? [...bookmarks]
    : [...bookmarks, bookmark];
}

export function removeBibleBookmark(
  bookmarks: readonly BibleBookmark[],
  id: string,
): BibleBookmark[] {
  return bookmarks.filter((bookmark) => bookmark.id !== id);
}

export function readBibleBookmarks(storage: LocalStorageLike): BibleBookmark[] {
  try {
    const raw = storage.getItem(BIBLE_BOOKMARKS_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is BibleBookmark => {
      if (typeof entry !== "object" || entry === null) return false;
      const bookmark = entry as Partial<BibleBookmark>;
      const translation = bookmark.translation;
      const verseNumber = bookmark.verseNumber;
      const text = bookmark.text;
      const id = bookmark.id;
      if (
        !isTranslationId(translation) ||
        !isLocation(bookmark) ||
        typeof verseNumber !== "number" ||
        !Number.isSafeInteger(verseNumber) ||
        verseNumber < 1 ||
        typeof text !== "string"
      ) return false;
      return id === bookmarkId(translation, bookmark, verseNumber);
    });
  } catch {
    return [];
  }
}

export function saveBibleBookmarks(storage: LocalStorageLike, bookmarks: readonly BibleBookmark[]): boolean {
  try {
    storage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true;
  } catch {
    return false;
  }
}