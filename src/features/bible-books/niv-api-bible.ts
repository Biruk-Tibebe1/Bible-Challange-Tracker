import { BIBLE_BOOKS, findBibleChapter } from "./bible-data.ts";
import type { BibleLocation } from "./bible-data.ts";
import type { BibleProviderSearchResult, BibleVerseResult } from "./bible-text-provider.ts";
import type { BibleAttribution, BibleTextResult, BibleVerse } from "./bible-translations.ts";
import type { BibleSearchResult } from "./kjv-search.ts";

const API_BIBLE_BASE_URL = "https://rest.api.bible/v1";

export interface NIVSourceConfig {
  apiKey?: string;
  bibleId?: string;
  licenseConfirmed?: boolean;
}

export interface NIVApiBibleSourceClient {
  getChapter(location: BibleLocation, signal?: AbortSignal): Promise<BibleTextResult>;
  getVerse(location: BibleLocation, verseNumber: number, signal?: AbortSignal): Promise<BibleVerseResult>;
  search(query: string, options?: { limit?: number; offset?: number }, signal?: AbortSignal): Promise<BibleProviderSearchResult>;
}

type NIVSourceResult = BibleTextResult | BibleVerseResult | BibleProviderSearchResult;
type ApiReply = { payload: Record<string, unknown> } | { result: NIVSourceResult };

interface VerifiedBible {
  bibleId: string;
  copyright: string;
  booksByCanonId: Map<string, ApiBibleBook>;
  booksByApiId: Map<string, string>;
}

interface ApiBibleBook {
  id: string;
  name: string;
  chaptersByNumber: Map<number, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function normalizeBookName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, "");
  if (normalized === "songofsongs") return "songofsolomon";
  return normalized || null;
}

function errorResult(message: string, reason?: "rate-limited"): NIVSourceResult {
  return { status: "error", message, ...(reason ? { reason } : {}) };
}

function unavailableResult(reason: "source-not-configured" | "chapter-not-available" | "operation-not-supported", message: string): NIVSourceResult {
  return { status: "unavailable", reason, message };
}

export function getNIVSourceConfig(env: Record<string, string | undefined> = process.env): NIVSourceConfig {
  return {
    apiKey: env.NIV_BIBLE_API_KEY?.trim(),
    bibleId: env.NIV_BIBLE_ID?.trim(),
    licenseConfirmed: env.NIV_BIBLE_LICENSE_CONFIRMED?.trim().toLowerCase() === "true",
  };
}

function parseChapterVerses(content: unknown): BibleVerse[] | null {
  if (!Array.isArray(content)) return null;
  const versesByNumber = new Map<number, string>();
  let currentVerseNumber: number | null = null;

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (!isRecord(value)) return;
    if (value.type === "tag" && value.name === "verse") {
      const attributes = isRecord(value.attrs) ? value.attrs : null;
      const number = Number(attributes?.number);
      currentVerseNumber = isPositiveInteger(number) ? number : null;
      if (currentVerseNumber !== null && !versesByNumber.has(currentVerseNumber)) {
        versesByNumber.set(currentVerseNumber, "");
      }
      return;
    }
    if (value.type === "text" && typeof value.text === "string" && currentVerseNumber !== null) {
      versesByNumber.set(currentVerseNumber, `${versesByNumber.get(currentVerseNumber) ?? ""}${value.text}`);
      return;
    }
    if (Array.isArray(value.items)) visit(value.items);
  }

  visit(content);
  const verses = [...versesByNumber.entries()]
    .sort(([left], [right]) => left - right)
    .map(([verseNumber, text]) => ({ verseNumber, text: text.trim() }))
    .filter((verse) => verse.text.length > 0);
  return verses.length ? verses.map((verse) => ({
    id: "",
    verseNumber: verse.verseNumber,
    text: verse.text,
  })) : null;
}

export function createNIVApiBibleSourceClient(
  config: NIVSourceConfig,
  fetcher: typeof fetch = fetch,
  timeoutMs = 10_000,
): NIVApiBibleSourceClient {
  const apiKey = config.apiKey?.trim();
  const bibleId = config.bibleId?.trim();
  const configured = Boolean(apiKey && bibleId && config.licenseConfirmed);
  const headers = new Headers({ Accept: "application/json" });
  if (apiKey) headers.set("api-key", apiKey);
  let verifiedBible: VerifiedBible | null = null;

  async function request(path: string, parameters: Record<string, string> = {}, signal?: AbortSignal): Promise<ApiReply> {
    if (!configured || !bibleId) {
      return { result: unavailableResult("source-not-configured", "NIV API.Bible access is not configured. Set the API key, account Bible ID, and license confirmation.") };
    }
    const url = new URL(`${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}${path}`);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    try {
      const response = await fetcher(url, { headers, signal: requestSignal });
      if (!response.ok) {
        if (response.status === 404) {
          return { result: unavailableResult("chapter-not-available", "The configured NIV Bible or passage was not found in this API.Bible account.") };
        }
        if (response.status === 429) {
          return { result: errorResult("API.Bible is temporarily rate limited. Try again shortly.", "rate-limited") };
        }
        if ([401, 403].includes(response.status)) {
          return { result: errorResult("API.Bible rejected the configured credentials or Bible access.") };
        }
        return { result: errorResult("Unable to load Scripture from API.Bible.") };
      }
      const payload: unknown = await response.json();
      if (!isRecord(payload)) return { result: errorResult("API.Bible returned malformed data.") };
      return { payload };
    } catch (error) {
      if (signal?.aborted) throw error;
      return { result: errorResult("Unable to reach API.Bible. Check the connection and try again.") };
    }
  }

  async function verifyBible(signal?: AbortSignal): Promise<VerifiedBible | NIVSourceResult> {
    if (verifiedBible) return verifiedBible;
    if (!bibleId) {
      return unavailableResult("source-not-configured", "NIV API.Bible access is not configured. Set the API key, account Bible ID, and license confirmation.");
    }

    const metadataReply = await request("", {}, signal);
    if ("result" in metadataReply) return metadataReply.result;
    const metadata = metadataReply.payload.data;
    if (!isRecord(metadata)
      || metadata.id !== bibleId
      || !(typeof metadata.copyright === "string" && metadata.copyright.trim())
      || !((typeof metadata.abbreviation === "string" && metadata.abbreviation.trim().toUpperCase() === "NIV")
        || (typeof metadata.name === "string" && /new international version/i.test(metadata.name)))) {
      return errorResult("The configured API.Bible ID did not return accessible NIV metadata and copyright details.");
    }

    const booksReply = await request("/books", { "include-chapters": "true" }, signal);
    if ("result" in booksReply) return booksReply.result;
    const rawBooks = booksReply.payload.data;
    if (!Array.isArray(rawBooks) || rawBooks.length !== BIBLE_BOOKS.length) {
      return errorResult("The configured API.Bible NIV edition does not contain the complete 66-book canon.");
    }

    const booksByCanonId = new Map<string, ApiBibleBook>();
    const booksByApiId = new Map<string, string>();
    for (const rawBook of rawBooks) {
      if (!isRecord(rawBook) || typeof rawBook.id !== "string" || !Array.isArray(rawBook.chapters)) {
        return errorResult("API.Bible returned an incomplete NIV book catalog.");
      }
      const bookName = normalizeBookName(rawBook.nameLong) ?? normalizeBookName(rawBook.name);
      const canonBook = BIBLE_BOOKS.find((book) => normalizeBookName(book.name) === bookName);
      if (!canonBook || booksByCanonId.has(canonBook.id)) {
        return errorResult("API.Bible returned an NIV book catalog that does not match the complete 66-book canon.");
      }

      const chaptersByNumber = new Map<number, string>();
      for (const rawChapter of rawBook.chapters) {
        if (!isRecord(rawChapter) || typeof rawChapter.id !== "string" || !isPositiveInteger(Number(rawChapter.number))) {
          return errorResult("API.Bible returned an incomplete NIV chapter catalog.");
        }
        chaptersByNumber.set(Number(rawChapter.number), rawChapter.id);
      }
      if (chaptersByNumber.size !== canonBook.chapterCount
        || Array.from({ length: canonBook.chapterCount }, (_, index) => chaptersByNumber.has(index + 1)).some((present) => !present)) {
        return errorResult("The configured NIV edition does not contain every chapter in the complete 66-book canon.");
      }
      booksByCanonId.set(canonBook.id, { id: rawBook.id, name: canonBook.name, chaptersByNumber });
      booksByApiId.set(rawBook.id, canonBook.id);
    }
    if (booksByCanonId.size !== BIBLE_BOOKS.length) {
      return errorResult("The configured NIV edition does not contain the complete 66-book canon.");
    }

    verifiedBible = {
      bibleId,
      copyright: metadata.copyright.trim(),
      booksByCanonId,
      booksByApiId,
    };
    return verifiedBible;
  }

  function attribution(copyright: string): BibleAttribution {
    return { notice: copyright };
  }

  async function getChapter(location: BibleLocation, signal?: AbortSignal): Promise<BibleTextResult> {
    const canonChapter = findBibleChapter(location.bookId, location.chapterNumber);
    if (!canonChapter) return unavailableResult("chapter-not-available", "This NIV chapter is not available.") as BibleTextResult;
    const verified = await verifyBible(signal);
    if (!("booksByCanonId" in verified)) return verified as BibleTextResult;
    const book = verified.booksByCanonId.get(location.bookId);
    const chapterId = book?.chaptersByNumber.get(location.chapterNumber);
    if (!book || !chapterId) return unavailableResult("chapter-not-available", "This NIV chapter is not available from API.Bible.") as BibleTextResult;

    const reply = await request(`/chapters/${encodeURIComponent(chapterId)}`, {
      "content-type": "json",
      "include-verse-numbers": "true",
      "include-titles": "false",
      "fums-version": "3",
    }, signal);
    if ("result" in reply) return reply.result as BibleTextResult;
    const data = reply.payload.data;
    if (!isRecord(data) || data.bibleId !== verified.bibleId) {
      return errorResult("API.Bible returned an NIV chapter with a different Bible ID.") as BibleTextResult;
    }
    const parsedVerses = parseChapterVerses(data.content);
    if (!parsedVerses || !isPositiveInteger(data.verseCount) || parsedVerses.length !== data.verseCount) {
      return errorResult("API.Bible returned malformed NIV chapter content.") as BibleTextResult;
    }
    const verses = parsedVerses.map((verse) => ({
      ...verse,
      id: `${location.bookId}.${location.chapterNumber}.${verse.verseNumber}`,
      reference: `${canonChapter.bookName} ${location.chapterNumber}:${verse.verseNumber}`,
    }));
    const fumsToken = isRecord(reply.payload.meta) && typeof reply.payload.meta.fumsToken === "string"
      ? reply.payload.meta.fumsToken
      : undefined;
    return {
      status: "available",
      chapter: {
        location,
        translation: "niv",
        verses,
        attribution: attribution(typeof data.copyright === "string" && data.copyright.trim() ? data.copyright.trim() : verified.copyright),
        ...(fumsToken ? { fumsToken } : {}),
      },
    };
  }

  return {
    getChapter,
    async getVerse(location, verseNumber, signal) {
      if (!isPositiveInteger(verseNumber)) {
        return unavailableResult("chapter-not-available", "This NIV verse is not available.") as BibleVerseResult;
      }
      const chapter = await getChapter(location, signal);
      if (chapter.status !== "available") return chapter;
      const verse = chapter.chapter.verses.find((candidate) => candidate.verseNumber === verseNumber);
      return verse
        ? { status: "available", translation: "niv", location, verse }
        : unavailableResult("chapter-not-available", "This NIV verse is not available from API.Bible.") as BibleVerseResult;
    },
    async search(query, options = {}, signal) {
      const verified = await verifyBible(signal);
      if (!("booksByApiId" in verified)) return verified as BibleProviderSearchResult;
      const reply = await request("/search", {
        query,
        limit: String(options.limit ?? 20),
        offset: String(options.offset ?? 0),
        "fums-version": "3",
      }, signal);
      if ("result" in reply) return reply.result as BibleProviderSearchResult;
      const data = isRecord(reply.payload.data) ? reply.payload.data : null;
      if (!data || !Array.isArray(data.verses)) {
        return errorResult("API.Bible returned malformed NIV search results.") as BibleProviderSearchResult;
      }
      const results: BibleSearchResult[] = [];
      for (const item of data.verses) {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.text !== "string" || !item.text.trim()) {
          return errorResult("API.Bible returned malformed NIV search results.") as BibleProviderSearchResult;
        }
        const match = item.id.match(/^(.+?)\.(\d+)\.(\d+)$/);
        const bookId = typeof item.bookId === "string" ? verified.booksByApiId.get(item.bookId) : undefined;
        const canonicalBookId = bookId ?? (match ? verified.booksByApiId.get(match[1]!) : undefined);
        const chapterNumber = match ? Number(match[2]) : NaN;
        const verseNumber = match ? Number(match[3]) : NaN;
        const chapter = canonicalBookId ? findBibleChapter(canonicalBookId, chapterNumber) : undefined;
        if (!chapter || !isPositiveInteger(verseNumber)) {
          return errorResult("API.Bible returned an NIV search reference outside the configured canon.") as BibleProviderSearchResult;
        }
        results.push({
          bookId: canonicalBookId!,
          chapterNumber,
          verseNumber,
          verseId: `${canonicalBookId}.${chapterNumber}.${verseNumber}`,
          bookName: chapter.bookName,
          reference: `${chapter.bookName} ${chapterNumber}:${verseNumber}`,
          snippet: item.text.trim(),
        });
      }
      const fumsToken = isRecord(reply.payload.meta) && typeof reply.payload.meta.fumsToken === "string"
        ? reply.payload.meta.fumsToken
        : undefined;
      const total = data.total ?? results.length;
      if (!Number.isSafeInteger(Number(total)) || Number(total) < results.length) {
        return errorResult("API.Bible returned malformed NIV search totals.") as BibleProviderSearchResult;
      }
      return {
        status: "available",
        translation: "niv",
        query,
        total: Number(total),
        results,
        attribution: attribution(verified.copyright),
        ...(fumsToken ? { fumsToken } : {}),
      };
    },
  };
}