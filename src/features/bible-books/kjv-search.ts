import { BIBLE_BOOKS } from "./bible-data.ts";
import type { BibleLocation } from "./bible-data.ts";

interface StoredVerse {
  id: string;
  verseNumber: number;
  text: string;
}

interface SearchIndexEntry extends StoredVerse {
  bookId: string;
  bookName: string;
  chapterNumber: number;
  normalizedText: string;
  words: ReadonlySet<string>;
}

export interface BibleSearchResult extends BibleLocation {
  verseNumber: number;
  verseId: string;
  bookName: string;
  reference: string;
  snippet: string;
}

export type BibleSearchResponse =
  | { status: "ok"; query: string; total: number; results: BibleSearchResult[] }
  | { status: "error"; query: string; message: string };

export interface KJVDataset {
  books: Record<string, { chapters: Record<string, readonly StoredVerse[]> }>;
}

const MAX_QUERY_LENGTH = 120;
const DEFAULT_RESULT_LIMIT = 40;

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

function makeSnippet(text: string, query: string): string {
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);
  let position = normalizedText.indexOf(normalizedQuery);
  if (position < 0) {
    const firstWord = normalizedQuery.split(" ")[0] ?? "";
    position = normalizedText.indexOf(firstWord);
  }
  const start = Math.max(0, position - 48);
  const end = Math.min(text.length, Math.max(position, 0) + normalizedQuery.length + 88);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function makeResult(entry: SearchIndexEntry, query: string): BibleSearchResult {
  return {
    bookId: entry.bookId,
    chapterNumber: entry.chapterNumber,
    verseNumber: entry.verseNumber,
    verseId: entry.id,
    bookName: entry.bookName,
    reference: `${entry.bookName} ${entry.chapterNumber}:${entry.verseNumber}`,
    snippet: makeSnippet(entry.text, query),
  };
}

export function createKJVSearch(dataset: KJVDataset): (input: string, resultLimit?: number, offset?: number) => BibleSearchResponse {
  const searchIndex: readonly SearchIndexEntry[] = BIBLE_BOOKS.flatMap((book) => {
    const chapters = dataset.books[book.id]?.chapters ?? {};
    return Object.keys(chapters)
      .sort((left, right) => Number(left) - Number(right))
      .flatMap((chapterKey) => (chapters[chapterKey] ?? []).map((verse) => {
        const normalizedText = normalize(verse.text);
        return {
          ...verse,
          bookId: book.id,
          bookName: book.name,
          chapterNumber: Number(chapterKey),
          normalizedText,
          words: new Set(normalizedText.match(/[\p{L}\p{N}']+/gu) ?? []),
        };
      }));
  });

  function findExactReference(query: string): SearchIndexEntry | null | undefined {
    const match = query.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)$/);
    if (!match) return undefined;
    const book = BIBLE_BOOKS.find((candidate) => normalize(candidate.name) === normalize(match[1]!));
    if (!book) return null;
    const chapterNumber = Number(match[2]);
    const verseNumber = Number(match[3]);
    const chapter = dataset.books[book.id]?.chapters[String(chapterNumber)];
    return chapter?.find((verse) => verse.verseNumber === verseNumber)
      ? searchIndex.find((entry) => entry.bookId === book.id && entry.chapterNumber === chapterNumber && entry.verseNumber === verseNumber) ?? null
      : null;
  }

  return (input: string, resultLimit = DEFAULT_RESULT_LIMIT, offset = 0): BibleSearchResponse => {
    const query = input.trim();
    if (query.length > MAX_QUERY_LENGTH) {
      return { status: "error", query: query.slice(0, MAX_QUERY_LENGTH), message: `Search is limited to ${MAX_QUERY_LENGTH} characters.` };
    }
    if (!query) return { status: "ok", query: "", total: 0, results: [] };

    const reference = findExactReference(query);
    if (reference !== undefined) {
      const results = reference ? [makeResult(reference, query)] : [];
      const safeOffset = Number.isSafeInteger(offset) ? Math.max(0, offset) : 0;
      return { status: "ok", query, total: results.length, results: safeOffset === 0 ? results : [] };
    }

    const normalizedQuery = normalize(query);
    const words = normalizedQuery.match(/[\p{L}\p{N}']+/gu) ?? [];
    const isPhrase = normalizedQuery.includes(" ");
    const matches = searchIndex.filter((entry) => isPhrase
      ? entry.normalizedText.includes(normalizedQuery)
      : words.length > 0 && entry.words.has(words[0]!));
    const safeLimit = Number.isSafeInteger(resultLimit) ? Math.max(1, Math.min(resultLimit, 100)) : DEFAULT_RESULT_LIMIT;
    const safeOffset = Number.isSafeInteger(offset) ? Math.max(0, Math.min(offset, matches.length)) : 0;
    return {
      status: "ok",
      query,
      total: matches.length,
      results: matches.slice(safeOffset, safeOffset + safeLimit).map((entry) => makeResult(entry, query)),
    };
  };
}