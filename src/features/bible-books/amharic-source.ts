import { BIBLE_BOOKS, findBibleChapter } from "./bible-data.ts";
import type { BibleLocation } from "./bible-data.ts";
import type { BibleProviderSearchResult, BibleVerseResult } from "./bible-text-provider.ts";
import type { BibleAttribution, BibleTextResult, BibleVerse } from "./bible-translations.ts";
import type { BibleSearchResult } from "./kjv-search.ts";

export interface ExternalScriptureSourceConfig {
  endpoint?: string;
  apiKey?: string;
  attribution?: string;
  licenseConfirmed?: boolean;
}

export type AmharicSourceConfig = ExternalScriptureSourceConfig;
type ExternalUnavailableReason = "source-not-configured" | "chapter-not-available" | "operation-not-supported";
type ExternalSourceResult = BibleTextResult | BibleVerseResult | BibleProviderSearchResult;

export interface ExternalScriptureSourceClient {
  getChapter(location: BibleLocation, signal?: AbortSignal): Promise<BibleTextResult>;
  getVerse(location: BibleLocation, verseNumber: number, signal?: AbortSignal): Promise<BibleVerseResult>;
  search(query: string, options?: { limit?: number; offset?: number }, signal?: AbortSignal): Promise<BibleProviderSearchResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function unavailable(reason: ExternalUnavailableReason, message: string): ExternalSourceResult {
  return { status: "unavailable", reason, message };
}

function sourceError(message: string, reason?: "rate-limited"): ExternalSourceResult {
  return { status: "error", message, ...(reason ? { reason } : {}) };
}

function getExternalSourceConfig(prefix: "AMHARIC" | "NIV", env: Record<string, string | undefined>): ExternalScriptureSourceConfig {
  return {
    endpoint: env[`${prefix}_BIBLE_API_URL`]?.trim(),
    apiKey: env[`${prefix}_BIBLE_API_KEY`]?.trim(),
    attribution: env[`${prefix}_BIBLE_ATTRIBUTION`]?.trim(),
  };
}

export function getAmharicSourceConfig(env: Record<string, string | undefined> = process.env): AmharicSourceConfig {
  return {
    ...getExternalSourceConfig("AMHARIC", env),
    licenseConfirmed: env.AMHARIC_BIBLE_LICENSE_CONFIRMED?.trim().toLowerCase() === "true",
  };
}

export function createExternalScriptureSourceClient(
  translationId: "amharic",
  config: ExternalScriptureSourceConfig,
  fetcher: typeof fetch = fetch,
  timeoutMs = 10_000,
): ExternalScriptureSourceClient {
  const endpoint = config.endpoint?.trim();
  const attribution = config.attribution?.trim();
  const apiKey = config.apiKey?.trim();
  const sourceName = "Amharic";
  const configured = Boolean(endpoint && attribution && (translationId !== "amharic" || config.licenseConfirmed));
  const chapterAttribution: BibleAttribution | undefined = attribution ? { notice: attribution } : undefined;

  async function request(
    operation: "books" | "chapter" | "verse" | "search",
    parameters: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<{ payload: unknown } | { result: ExternalSourceResult }> {
    if (!configured || !endpoint) {
      return { result: unavailable("source-not-configured", `${sourceName} source is not configured yet.`) };
    }

    let url: URL;
    try {
      url = new URL(endpoint);
      if (url.protocol !== "https:") throw new Error("HTTPS is required.");
    } catch {
      return { result: sourceError(`${sourceName} source configuration is invalid.`) };
    }

    url.searchParams.set("operation", operation);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);

    const headers = new Headers({ Accept: "application/json" });
    if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    try {
      const response = await fetcher(url, { headers, signal: requestSignal });
      if (!response.ok) {
        if (response.status === 404 && operation !== "search") {
          return { result: unavailable("chapter-not-available", `This ${sourceName} passage is not available from the configured source.`) };
        }
        if ([404, 405, 501].includes(response.status) && operation === "search") {
          return { result: unavailable("operation-not-supported", `The configured ${sourceName} source does not support search.`) };
        }
        if ([405, 501].includes(response.status)) {
          return { result: unavailable("operation-not-supported", `The configured ${sourceName} source does not support ${operation} retrieval.`) };
        }
        if (response.status === 429) {
          return { result: sourceError(`The configured ${sourceName} source is temporarily rate limited. Try again shortly.`, "rate-limited") };
        }
        if ([401, 403].includes(response.status)) {
          return { result: sourceError(`The configured ${sourceName} source rejected its credentials.`) };
        }
        return { result: sourceError(`Unable to load Scripture from the configured ${sourceName} source.`) };
      }

      try {
        return { payload: await response.json() as unknown };
      } catch {
        return { result: sourceError(`The configured ${sourceName} source returned malformed data.`) };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      return { result: sourceError(`Unable to reach the configured ${sourceName} source. Check the connection and try again.`) };
    }
  }

  function validLocation(location: BibleLocation): boolean {
    return findBibleChapter(location.bookId, location.chapterNumber) !== undefined;
  }

  let catalogPromise: Promise<Set<string> | ExternalSourceResult> | null = null;

  async function ensureCompleteCanon(signal?: AbortSignal): Promise<Set<string> | ExternalSourceResult> {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      const reply = await request("books", {}, signal);
      if ("result" in reply) {
        if (reply.result.status === "error"
          || (reply.result.status === "unavailable" && reply.result.reason === "source-not-configured")) {
          return reply.result;
        }
        return errorResult(`The configured ${sourceName} source must provide a complete 66-book catalog before Scripture can be enabled.`);
      }
      const payload = isRecord(reply.payload) ? reply.payload : null;
      if (!payload || !Array.isArray(payload.books) || payload.books.length !== BIBLE_BOOKS.length) {
        return errorResult(`The configured ${sourceName} source does not expose the complete 66-book canon.`);
      }
      const catalogued = new Set<string>();
      for (const item of payload.books) {
        if (!isRecord(item) || typeof item.bookId !== "string" || !isPositiveInteger(item.chapterCount)) {
          return errorResult(`The configured ${sourceName} source returned an invalid book catalog.`);
        }
        const book = BIBLE_BOOKS.find((candidate) => candidate.id === item.bookId);
        if (!book || book.chapterCount !== item.chapterCount || catalogued.has(book.id)) {
          return errorResult(`The configured ${sourceName} source does not match the complete 66-book canon.`);
        }
        catalogued.add(book.id);
      }
      if (catalogued.size !== BIBLE_BOOKS.length) {
        return errorResult(`The configured ${sourceName} source does not match the complete 66-book canon.`);
      }
      return catalogued;
    })();
    return catalogPromise;
  }

  function errorResult(message: string): ExternalSourceResult {
    return { status: "error", message };
  }

  function makeVerse(location: BibleLocation, verseNumber: number, text: string): BibleVerse {
    const bookName = BIBLE_BOOKS.find((book) => book.id === location.bookId)!.name;
    return {
      id: `${location.bookId}.${location.chapterNumber}.${verseNumber}`,
      verseNumber,
      text,
      reference: `${bookName} ${location.chapterNumber}:${verseNumber}`,
    };
  }

  return {
    async getChapter(location, signal) {
      if (!validLocation(location)) return unavailable("chapter-not-available", `This ${sourceName} chapter is not available.`) as BibleTextResult;
      const catalog = await ensureCompleteCanon(signal);
      if (!(catalog instanceof Set)) return catalog as BibleTextResult;
      if (!catalog.has(location.bookId)) return unavailable("chapter-not-available", `This ${sourceName} chapter is not available.`) as BibleTextResult;
      const reply = await request("chapter", {
        bookId: location.bookId,
        chapterNumber: String(location.chapterNumber),
      }, signal);
      if ("result" in reply) return reply.result as BibleTextResult;

      const payload = isRecord(reply.payload) ? reply.payload : null;
      const chapter = payload && isRecord(payload.chapter) ? payload.chapter : payload;
      if (!chapter || !Array.isArray(chapter.verses)) {
        return sourceError(`The configured ${sourceName} source returned a malformed chapter.`) as BibleTextResult;
      }
      if ((chapter.bookId !== undefined && chapter.bookId !== location.bookId)
        || (chapter.chapterNumber !== undefined && chapter.chapterNumber !== location.chapterNumber)) {
        return sourceError(`The configured ${sourceName} source returned a chapter for a different reference.`) as BibleTextResult;
      }
      if (chapter.verses.length === 0) {
        return unavailable("chapter-not-available", `This ${sourceName} chapter is not available from the configured source.`) as BibleTextResult;
      }

      const seenVerseNumbers = new Set<number>();
      const verses: BibleVerse[] = [];
      for (const item of chapter.verses) {
        if (!isRecord(item) || !isPositiveInteger(item.verseNumber)
          || typeof item.text !== "string" || !item.text.trim()
          || seenVerseNumbers.has(item.verseNumber)) {
          return sourceError(`The configured ${sourceName} source returned malformed verse data.`) as BibleTextResult;
        }
        seenVerseNumbers.add(item.verseNumber);
        verses.push(makeVerse(location, item.verseNumber, item.text));
      }

      return {
        status: "available",
        chapter: {
          location,
          translation: translationId,
          verses,
          attribution: chapterAttribution,
        },
      };
    },

    async getVerse(location, verseNumber, signal) {
      if (!validLocation(location) || !isPositiveInteger(verseNumber)) {
        return unavailable("chapter-not-available", `This ${sourceName} verse is not available.`) as BibleVerseResult;
      }
      const catalog = await ensureCompleteCanon(signal);
      if (!(catalog instanceof Set)) return catalog as BibleVerseResult;
      if (!catalog.has(location.bookId)) return unavailable("chapter-not-available", `This ${sourceName} verse is not available.`) as BibleVerseResult;
      const reply = await request("verse", {
        bookId: location.bookId,
        chapterNumber: String(location.chapterNumber),
        verseNumber: String(verseNumber),
      }, signal);
      if ("result" in reply) return reply.result as BibleVerseResult;

      const payload = isRecord(reply.payload) ? reply.payload : null;
      const verse = payload && isRecord(payload.verse) ? payload.verse : payload;
      const responseVerseNumber = verse?.verseNumber ?? verseNumber;
      if (!verse || responseVerseNumber !== verseNumber || typeof verse.text !== "string" || !verse.text.trim()) {
        return sourceError(`The configured ${sourceName} source returned a malformed verse.`) as BibleVerseResult;
      }
      return {
        status: "available",
        translation: translationId,
        location,
        verse: makeVerse(location, verseNumber, verse.text),
      };
    },

    async search(query, options = {}, signal) {
      const catalog = await ensureCompleteCanon(signal);
      if (!(catalog instanceof Set)) return catalog as BibleProviderSearchResult;
      const reply = await request("search", {
        q: query,
        limit: String(options.limit ?? 40),
        offset: String(options.offset ?? 0),
      }, signal);
      if ("result" in reply) return reply.result as BibleProviderSearchResult;

      const payload = isRecord(reply.payload) ? reply.payload : null;
      if (!payload || !Array.isArray(payload.results)) {
        return sourceError(`The configured ${sourceName} source returned malformed search data.`) as BibleProviderSearchResult;
      }
      const results: BibleSearchResult[] = [];
      for (const item of payload.results) {
        if (!isRecord(item) || typeof item.bookId !== "string"
          || !isPositiveInteger(item.chapterNumber) || !isPositiveInteger(item.verseNumber)
          || typeof (item.text ?? item.snippet) !== "string") {
          return sourceError(`The configured ${sourceName} source returned malformed search data.`) as BibleProviderSearchResult;
        }
        const location = { bookId: item.bookId, chapterNumber: item.chapterNumber };
        if (!validLocation(location)) {
          return sourceError(`The configured ${sourceName} source returned an unknown Bible reference.`) as BibleProviderSearchResult;
        }
        const bookName = BIBLE_BOOKS.find((book) => book.id === location.bookId)!.name;
        results.push({
          ...location,
          verseNumber: item.verseNumber,
          verseId: `${location.bookId}.${location.chapterNumber}.${item.verseNumber}`,
          bookName,
          reference: `${bookName} ${location.chapterNumber}:${item.verseNumber}`,
          snippet: String(item.snippet ?? item.text),
        });
      }
      const total = payload.total ?? results.length;
      if (!isPositiveInteger(total) && total !== 0 || Number(total) < results.length) {
        return sourceError(`The configured ${sourceName} source returned malformed search totals.`) as BibleProviderSearchResult;
      }
      return {
        status: "available",
        translation: translationId,
        query: typeof payload.query === "string" ? payload.query : query,
        total: Number(total),
        results,
        attribution: chapterAttribution,
      };
    },
  };
}

export function createAmharicSourceClient(
  config: AmharicSourceConfig,
  fetcher: typeof fetch = fetch,
  timeoutMs = 10_000,
): ExternalScriptureSourceClient {
  return createExternalScriptureSourceClient("amharic", config, fetcher, timeoutMs);
}
