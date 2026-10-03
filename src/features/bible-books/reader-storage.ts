import { findBibleChapter } from "./bible-data.ts";
import type { BibleLocation } from "./bible-data.ts";
import { isBibleTranslationId } from "./bible-translations.ts";
import type { BibleTranslationId, BibleVerse } from "./bible-translations.ts";

export const READING_POSITION_KEY = "bible-reading-position-v1";
export const BIBLE_BOOKMARKS_KEY = "bible-bookmarks-v1";
export const BIBLE_HIGHLIGHTS_KEY = "bible-verse-highlights-v1";
export const BIBLE_NOTES_KEY = "bible-verse-notes-v1";
export const BIBLE_READING_SETTINGS_KEY = "bible-reading-settings-v1";

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
  fallback: ReadingPosition = { translation: "kjv", bookId: "genesis", chapterNumber: 1 },
  explicitTranslation?: BibleTranslationId,
): ReadingPosition {
  if (explicitLocation && isLocation(explicitLocation)) {
    return {
      translation: explicitTranslation ?? (savedPosition && isBibleTranslationId(savedPosition.translation)
        ? savedPosition.translation
        : fallback.translation),
      ...explicitLocation,
    };
  }
  if (explicitTranslation) {
    const basePosition = savedPosition && isBibleTranslationId(savedPosition.translation) && isLocation(savedPosition)
      ? savedPosition
      : fallback;
    return { ...basePosition, translation: explicitTranslation };
  }
  if (savedPosition && isBibleTranslationId(savedPosition.translation) && isLocation(savedPosition)) {
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
    if (!isBibleTranslationId(translation) || !isLocation(position)) return null;
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
  if (!isBibleTranslationId(position.translation) || !isLocation(position)) return false;
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
        !isBibleTranslationId(translation) ||
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

export type BibleHighlightColor = "sunlight" | "sage" | "rose";
export type BibleFontSize = "small" | "normal" | "large" | "extra-large";

export interface BibleVerseIdentity extends BibleLocation {
  translation: BibleTranslationId;
  verseNumber: number;
}

export interface BibleHighlight extends BibleVerseIdentity {
  id: string;
  color: BibleHighlightColor;
}

export interface BibleNote extends BibleVerseIdentity {
  id: string;
  note: string;
  updatedAt: string;
}

export interface BibleReadingSettings {
  fontSize: BibleFontSize;
  readingMode: "light" | "dark";
}

export const DEFAULT_BIBLE_READING_SETTINGS: BibleReadingSettings = {
  fontSize: "normal",
  readingMode: "light",
};

function verseIdentityId(identity: BibleVerseIdentity): string {
  return `${identity.translation}:${identity.bookId}:${identity.chapterNumber}:${identity.verseNumber}`;
}

function isVerseIdentity(value: unknown): value is BibleVerseIdentity {
  if (typeof value !== "object" || value === null) return false;
  const identity = value as Partial<BibleVerseIdentity>;
  const translation = identity.translation;
  const verseNumber = identity.verseNumber;
  return isBibleTranslationId(translation) &&
    isLocation(identity) &&
    typeof verseNumber === "number" &&
    Number.isSafeInteger(verseNumber) &&
    verseNumber > 0;
}

const highlightColors: readonly BibleHighlightColor[] = ["sunlight", "sage", "rose"];
const fontSizes: readonly BibleFontSize[] = ["small", "normal", "large", "extra-large"];

function isHighlightColor(value: unknown): value is BibleHighlightColor {
  return typeof value === "string" && highlightColors.includes(value as BibleHighlightColor);
}

function isFontSize(value: unknown): value is BibleFontSize {
  return typeof value === "string" && fontSizes.includes(value as BibleFontSize);
}

export function createBibleVerseIdentity(
  translation: BibleTranslationId,
  location: BibleLocation,
  verseNumber: number,
): BibleVerseIdentity {
  return { translation, ...location, verseNumber };
}

export function formatBibleVerseReference(bookName: string, identity: BibleVerseIdentity): string {
  return `${bookName} ${identity.chapterNumber}:${identity.verseNumber} (${identity.translation.toUpperCase()})`;
}

export function upsertBibleHighlight(
  highlights: readonly BibleHighlight[],
  identity: BibleVerseIdentity,
  color: BibleHighlightColor,
): BibleHighlight[] {
  const id = verseIdentityId(identity);
  return [...highlights.filter((highlight) => highlight.id !== id), { ...identity, id, color }];
}

export function removeBibleHighlight(highlights: readonly BibleHighlight[], id: string): BibleHighlight[] {
  return highlights.filter((highlight) => highlight.id !== id);
}

export function upsertBibleNote(
  notes: readonly BibleNote[],
  identity: BibleVerseIdentity,
  noteText: string,
  updatedAt = new Date().toISOString(),
): BibleNote[] {
  const id = verseIdentityId(identity);
  const trimmed = noteText.trim();
  if (!trimmed) return removeBibleNote(notes, id);
  const note: BibleNote = { ...identity, id, note: trimmed.slice(0, 4000), updatedAt };
  return [...notes.filter((item) => item.id !== id), note];
}

export function removeBibleNote(notes: readonly BibleNote[], id: string): BibleNote[] {
  return notes.filter((note) => note.id !== id);
}

export function readBibleHighlights(storage: LocalStorageLike): BibleHighlight[] {
  try {
    const raw = storage.getItem(BIBLE_HIGHLIGHTS_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is BibleHighlight => {
      if (!isVerseIdentity(entry) || typeof entry !== "object" || entry === null) return false;
      const highlight = entry as Partial<BibleHighlight>;
      return isHighlightColor(highlight.color) && highlight.id === verseIdentityId(highlight as BibleVerseIdentity);
    });
  } catch {
    return [];
  }
}

export function saveBibleHighlights(storage: LocalStorageLike, highlights: readonly BibleHighlight[]): boolean {
  try {
    storage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(highlights));
    return true;
  } catch {
    return false;
  }
}

export function readBibleNotes(storage: LocalStorageLike): BibleNote[] {
  try {
    const raw = storage.getItem(BIBLE_NOTES_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is BibleNote => {
      if (!isVerseIdentity(entry) || typeof entry !== "object" || entry === null) return false;
      const candidate = entry as Partial<BibleNote>;
      return typeof candidate.note === "string" && candidate.note.trim().length > 0 &&
        typeof candidate.updatedAt === "string" && !Number.isNaN(Date.parse(candidate.updatedAt)) &&
        candidate.id === verseIdentityId(candidate as BibleVerseIdentity);
    });
  } catch {
    return [];
  }
}

export function saveBibleNotes(storage: LocalStorageLike, notes: readonly BibleNote[]): boolean {
  try {
    storage.setItem(BIBLE_NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

export function readBibleReadingSettings(storage: LocalStorageLike): BibleReadingSettings {
  try {
    const raw = storage.getItem(BIBLE_READING_SETTINGS_KEY);
    if (!raw) return DEFAULT_BIBLE_READING_SETTINGS;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_BIBLE_READING_SETTINGS;
    const settings = value as Partial<BibleReadingSettings>;
    return {
      fontSize: isFontSize(settings.fontSize) ? settings.fontSize : DEFAULT_BIBLE_READING_SETTINGS.fontSize,
      readingMode: settings.readingMode === "dark" ? "dark" : "light",
    };
  } catch {
    return DEFAULT_BIBLE_READING_SETTINGS;
  }
}

export function saveBibleReadingSettings(storage: LocalStorageLike, settings: BibleReadingSettings): boolean {
  if (!isFontSize(settings.fontSize) || !["light", "dark"].includes(settings.readingMode)) return false;
  try {
    storage.setItem(BIBLE_READING_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}