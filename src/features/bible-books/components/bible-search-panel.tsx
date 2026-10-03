"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getBibleTranslationProvider } from "../bible-text-provider";
import type { BibleProviderSearchResult } from "../bible-text-provider";
import type { BibleSearchResult } from "../kjv-search";
import type { BibleTranslationId } from "../bible-translations";
import { ApiBibleFairUseTracker } from "./api-bible-fair-use-tracker";

const PAGE_SIZE = 20;

export function BibleSearchPanel({ translation }: { translation: BibleTranslationId }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<Extract<BibleProviderSearchResult, { status: "available" }> | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function search(nextOffset = 0) {
    const trimmed = query.trim();
    setHasSearched(true);
    setError("");
    setResponse(null);
    setOffset(nextOffset);
    if (!trimmed) {
      setResponse({ status: "available", translation, query: "", total: 0, results: [] });
      return;
    }

    setIsSearching(true);
    try {
      const payload = await getBibleTranslationProvider(translation).search(trimmed, { limit: PAGE_SIZE, offset: nextOffset });
      if (payload.status !== "available") {
        setError(payload.status === "unavailable" ? payload.message : payload.message);
        return;
      }
      setResponse(payload);
    } catch {
      setError("Search is temporarily unavailable. Check your connection and try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(0);
  }

  return (
    <details className="mb-5 rounded-md border border-[var(--line)] bg-white/55" data-reader-surface>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-[var(--ink)] sm:px-5">
        <span>Search {translation.toUpperCase()}</span>
        <span className="text-xs font-normal text-[var(--muted)]">Words, phrases, or a reference</span>
      </summary>
      <div className="border-t border-[var(--line)] p-4 sm:p-5">
        <form className="flex flex-wrap gap-2" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="bible-search-query">Search {translation.toUpperCase()}</label>
          <input autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" id="bible-search-query" maxLength={120} placeholder="Search a word, phrase, or John 3:16" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="min-h-11 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white disabled:opacity-55" disabled={isSearching} type="submit">{isSearching ? "Searching…" : "Search"}</button>
        </form>
        {error && <p className="mt-3 text-sm text-[#8c3f32]" role="alert">{error}</p>}
        {hasSearched && !isSearching && !error && response?.total === 0 && (
          <p className="mt-4 rounded-md bg-[var(--paper)] p-3 text-sm text-[var(--muted)]" role="status">No {translation.toUpperCase()} verses match this search.</p>
        )}
        {response && response.total > 0 && (
          <>
            {translation === "niv" && <ApiBibleFairUseTracker token={response.fumsToken} />}
            <p className="mt-4 text-xs text-[var(--muted)]" role="status">{response.total.toLocaleString()} matching verses · {translation.toUpperCase()}</p>
            <ol className="mt-2 divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-white/70 px-3 sm:px-4">
              {response.results.map((result) => <SearchResult key={result.verseId} result={result} translation={translation} />)}
            </ol>
            {response.attribution?.notice && (
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{response.attribution.notice}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <button className="min-h-10 rounded-md border border-[var(--line)] px-3 text-xs text-[var(--ink)] disabled:opacity-45" disabled={offset <= 0 || isSearching} type="button" onClick={() => void search(Math.max(0, offset - PAGE_SIZE))}>Previous results</button>
              <p className="text-xs text-[var(--muted)]">{offset + 1}–{Math.min(offset + response.results.length, response.total)}</p>
              <button className="min-h-10 rounded-md border border-[var(--line)] px-3 text-xs text-[var(--ink)] disabled:opacity-45" disabled={offset + response.results.length >= response.total || isSearching} type="button" onClick={() => void search(offset + PAGE_SIZE)}>More results</button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}

function SearchResult({ result, translation }: { result: BibleSearchResult; translation: BibleTranslationId }) {
  return (
    <li className="py-3">
      <Link className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]" href={`/bible?book=${encodeURIComponent(result.bookId)}&chapter=${result.chapterNumber}&verse=${result.verseNumber}&translation=${translation}`}>
        <span className="text-sm font-semibold text-[var(--forest-deep)]">{result.reference}</span>
        <span className="mt-1 block break-words text-sm leading-6 text-[var(--ink)]">{result.snippet}</span>
      </Link>
    </li>
  );
}