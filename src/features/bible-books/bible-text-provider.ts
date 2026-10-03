import { BIBLE_BOOKS, findBibleChapter } from "./bible-data.ts";
import type { BibleBook, BibleLocation } from "./bible-data.ts";
import type { BibleSearchResponse, BibleSearchResult } from "./kjv-search.ts";
import type { BibleTextResult, BibleTranslationId, BibleVerse } from "./bible-translations.ts";
import { BIBLE_TRANSLATIONS } from "./bible-translations.ts";

export type BibleVerseResult =
  | { status: "available"; translation: BibleTranslationId; location: BibleLocation; verse: BibleVerse }
  | { status: "unavailable"; reason: "translation-not-available" | "source-not-configured" | "chapter-not-available" | "operation-not-supported"; message: string }
  | { status: "error"; reason?: "rate-limited"; message: string };

export type BibleProviderSearchResult =
  | { status: "available"; translation: BibleTranslationId; query: string; total: number; results: BibleSearchResult[]; attribution?: { notice: string }; fumsToken?: string }
  | { status: "unavailable"; reason: "translation-not-available" | "source-not-configured" | "chapter-not-available" | "operation-not-supported"; message: string }
  | { status: "error"; reason?: "rate-limited"; message: string };

export interface BibleTranslationProvider {
  readonly translationId: BibleTranslationId;
  getBookList(): Promise<readonly BibleBook[]>;
  getChapter(location: BibleLocation, signal?: AbortSignal): Promise<BibleTextResult>;
  getVerse(location: BibleLocation, verseNumber: number, signal?: AbortSignal): Promise<BibleVerseResult>;
  search(query: string, options?: { limit?: number; offset?: number }, signal?: AbortSignal): Promise<BibleProviderSearchResult>;
}

export type BibleFetch = typeof fetch;

function createExternalTranslationProvider(
  translationId: Exclude<BibleTranslationId, "kjv">,
  fetcher: BibleFetch,
): BibleTranslationProvider {
  async function request<T>(path: string, signal?: AbortSignal): Promise<T | { status: "error"; message: string }> {
    try {
      const response = await fetcher(path, { signal });
      const payload = await response.json() as T;
      if (!response.ok && (!payload || typeof payload !== "object" || !("status" in payload))) {
        return { status: "error", message: `Unable to load Scripture from the ${translationId.toUpperCase()} source.` };
      }
      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return { status: "error", message: `Unable to reach the ${translationId.toUpperCase()} source. Check your connection and try again.` };
    }
  }

  return {
    translationId,
    async getBookList() {
      return BIBLE_BOOKS;
    },
    getChapter(location, signal) {
      return request(`/api/bible/${translationId}/${encodeURIComponent(location.bookId)}/${location.chapterNumber}`, signal);
    },
    getVerse(location, verseNumber, signal) {
      return request(`/api/bible/${translationId}/${encodeURIComponent(location.bookId)}/${location.chapterNumber}?verse=${verseNumber}`, signal);
    },
    search(query, options = {}, signal) {
      const params = new URLSearchParams({ q: query });
      if (options.limit !== undefined) params.set("limit", String(options.limit));
      if (options.offset !== undefined) params.set("offset", String(options.offset));
      return request(`/api/bible/${translationId}/search?${params.toString()}`, signal);
    },
  };
}

export function createAmharicTranslationProvider(fetcher: BibleFetch = fetch): BibleTranslationProvider {
  return createExternalTranslationProvider("amharic", fetcher);
}

export function createNIVTranslationProvider(fetcher: BibleFetch = fetch): BibleTranslationProvider {
  return createExternalTranslationProvider("niv", fetcher);
}

export function createKJVTranslationProvider(fetcher: BibleFetch = fetch): BibleTranslationProvider {
  async function getChapter(location: BibleLocation, signal?: AbortSignal): Promise<BibleTextResult> {
    try {
      const response = await fetcher(
        `/api/bible/kjv/${encodeURIComponent(location.bookId)}/${location.chapterNumber}`,
        { signal },
      );
      if (!response.ok) return { status: "error", message: "Unable to load this Bible chapter." };
      return await response.json() as BibleTextResult;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return { status: "error", message: "Unable to load this Bible chapter. Check your connection and try again." };
    }
  }

  return {
    translationId: "kjv",
    async getBookList() {
      return BIBLE_BOOKS;
    },
    getChapter,
    async getVerse(location, verseNumber, signal) {
      const result = await getChapter(location, signal);
      if (result.status !== "available") return result;
      const verse = result.chapter.verses.find((item) => item.verseNumber === verseNumber);
      return verse
        ? { status: "available", translation: "kjv", location, verse }
        : { status: "error", message: "Bible verse not found." };
    },
    async search(query, options = {}, signal) {
      try {
        const params = new URLSearchParams({ q: query });
        if (options.limit !== undefined) params.set("limit", String(options.limit));
        if (options.offset !== undefined) params.set("offset", String(options.offset));
        const response = await fetcher(`/api/bible/search?${params.toString()}`, { signal });
        const result = await response.json() as BibleSearchResponse;
        if (!response.ok || result.status === "error") {
          return { status: "error", message: result.status === "error" ? result.message : "Unable to search the KJV." };
        }
        return {
          status: "available",
          translation: "kjv",
          query: result.query,
          total: result.total,
          results: result.results,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        return { status: "error", message: "Unable to search the KJV. Check your connection and try again." };
      }
    },
  };
}

export const BIBLE_TRANSLATION_PROVIDERS: Readonly<Record<BibleTranslationId, BibleTranslationProvider>> = {
  kjv: createKJVTranslationProvider(),
  amharic: createAmharicTranslationProvider(),
  niv: createNIVTranslationProvider(),
};

export function getBibleTranslationProvider(translationId: BibleTranslationId): BibleTranslationProvider {
  return BIBLE_TRANSLATION_PROVIDERS[translationId];
}

export const bibleTextProvider = {
  getChapter(location: BibleLocation, translationId: BibleTranslationId, signal?: AbortSignal) {
    return getBibleTranslationProvider(translationId).getChapter(location, signal);
  },
};

export function getAvailableBibleTranslations() {
  return BIBLE_TRANSLATIONS.filter((translation) => translation.availabilityStatus === "available");
}

export function isBibleLocationAvailable(location: BibleLocation): boolean {
  return findBibleChapter(location.bookId, location.chapterNumber) !== undefined;
}