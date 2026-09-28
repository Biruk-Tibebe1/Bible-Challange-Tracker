"use client";

import { useEffect, useState } from "react";
import {
  BIBLE_BOOKS,
  findBibleChapter,
  getBibleChapter,
  getChaptersInBook,
} from "../bible-data";
import type { Testament } from "../bible-data";
import { BIBLE_TRANSLATIONS } from "../bible-translations";
import type { BibleTextResult, BibleTranslationId } from "../bible-translations";
import { bibleTextProvider } from "../bible-text-provider";
import type { BibleLocation } from "../bible-data";

export function BibleReader({ initialLocation }: { initialLocation?: BibleLocation }) {
  const initialChapter = initialLocation
    ? findBibleChapter(initialLocation.bookId, initialLocation.chapterNumber)
    : undefined;
  const [testament, setTestament] = useState<Testament>(initialChapter?.testament ?? "Old Testament");
  const [bookId, setBookId] = useState(initialChapter?.bookId ?? "genesis");
  const [chapterNumber, setChapterNumber] = useState(initialChapter?.chapterNumber ?? 1);
  const [translation, setTranslation] = useState<BibleTranslationId>("amharic");
  const [chapterResult, setChapterResult] = useState<BibleTextResult | null>(null);
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const currentChapter = findBibleChapter(bookId, chapterNumber)!;
  const chaptersInBook = getChaptersInBook(bookId);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;
    setChapterResult(null);
    setIsChapterLoading(true);
    void bibleTextProvider.getChapter({ bookId, chapterNumber }, translation, controller.signal)
      .then((result) => {
        if (isCurrentRequest) setChapterResult(result);
      })
      .catch((error: unknown) => {
        if (isCurrentRequest && !(error instanceof DOMException && error.name === "AbortError")) {
          setChapterResult({ status: "error", message: "Unable to load this Bible chapter." });
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsChapterLoading(false);
      });
    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [bookId, chapterNumber, translation]);

  function changeTestament(nextTestament: Testament) {
    setTestament(nextTestament);
    const firstBook = BIBLE_BOOKS.find((book) => book.testament === nextTestament);
    if (firstBook) {
      setBookId(firstBook.id);
      setChapterNumber(1);
    }
  }

  function moveChapter(offset: -1 | 1) {
    const nextChapter = getBibleChapter(currentChapter.globalChapterNumber + offset);
    if (nextChapter) {
      setTestament(nextChapter.testament);
      setBookId(nextChapter.bookId);
      setChapterNumber(nextChapter.chapterNumber);
    }
  }

  return (
    <main className="mx-auto max-w-5xl py-4 sm:py-8">
      <header className="border-b border-[var(--line)] pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Read Scripture</p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">The Bible</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Choose a book, chapter, and available translation to read.</p>
      </header>

      <section aria-label="Bible passage selection" className="mt-6 rounded-md border border-[var(--line)] bg-white/60 p-4 sm:p-6">
        <div aria-label="Testament" className="grid max-w-md grid-cols-2 gap-1 rounded-md bg-[var(--sage)] p-1" role="group">
          {(["Old Testament", "New Testament"] as const).map((value) => (
            <button
              aria-pressed={testament === value}
              className={`min-h-10 rounded px-3 text-sm font-medium ${testament === value ? "bg-white text-[var(--forest-deep)] shadow-sm" : "text-[var(--muted)]"}`}
              key={value}
              type="button"
              onClick={() => changeTestament(value)}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)_minmax(0,1fr)]">
          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor="bible-book">
            Book
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]"
              id="bible-book"
              value={bookId}
              onChange={(event) => {
                const selectedBook = BIBLE_BOOKS.find((book) => book.id === event.target.value);
                if (!selectedBook) return;
                setBookId(selectedBook.id);
                setTestament(selectedBook.testament);
                setChapterNumber(1);
              }}
            >
              {BIBLE_BOOKS.filter((book) => book.testament === testament).map((book) => (
                <option key={book.id} value={book.id}>{book.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor="bible-chapter">
            Chapter
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]"
              id="bible-chapter"
              value={chapterNumber}
              onChange={(event) => setChapterNumber(Number(event.target.value))}
            >
              {chaptersInBook.map((chapter) => <option key={chapter.chapterNumber} value={chapter.chapterNumber}>{chapter.chapterNumber}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor="bible-translation">
            Translation
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]"
              id="bible-translation"
              value={translation}
              onChange={(event) => setTranslation(event.target.value as BibleTranslationId)}
            >
              {BIBLE_TRANSLATIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section aria-labelledby="current-passage-title" className="mt-5 overflow-hidden rounded-md border border-[var(--line)] bg-white/65">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">{testament}</p>
            <h2 id="current-passage-title" className="mt-1 font-serif text-3xl text-[var(--ink)]">{currentChapter.bookName} {currentChapter.chapterNumber}</h2>
          </div>
          <p className="text-sm text-[var(--muted)]">Chapter {currentChapter.globalChapterNumber} of 1,189</p>
        </div>
        {isChapterLoading ? (
          <p aria-live="polite" className="px-5 py-12 text-center text-sm text-[var(--muted)]">Loading chapter…</p>
        ) : chapterResult?.status === "available" ? (
          <ol aria-label={`${currentChapter.bookName} ${currentChapter.chapterNumber} verses`} className="mx-auto max-w-3xl list-none space-y-3 px-5 py-7 font-serif text-lg leading-8 text-[var(--ink)] sm:px-8 sm:py-9 sm:text-xl sm:leading-9">
            {chapterResult.chapter.verses.map((verse) => (
              <li className="scroll-mt-24" id={verse.id} key={verse.id}>
                <sup className="mr-1.5 align-super font-sans text-xs font-semibold text-[var(--forest)]">{verse.verseNumber}</sup>
                {verse.text}
              </li>
            ))}
          </ol>
        ) : chapterResult?.status === "unavailable" ? (
          <div aria-live="polite" className="px-5 py-12 text-center sm:py-16">
            <p className="font-medium text-[var(--ink)]">{BIBLE_TRANSLATIONS.find((item) => item.id === translation)?.name}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{chapterResult.message}</p>
          </div>
        ) : chapterResult?.status === "error" ? (
          <p className="px-5 py-12 text-center text-sm text-[#8c3f32]" role="alert">{chapterResult.message}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 sm:px-6">
          <button className="min-h-11 rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--sage)] disabled:cursor-not-allowed disabled:opacity-45" disabled={currentChapter.globalChapterNumber === 1} type="button" onClick={() => moveChapter(-1)}>Previous chapter</button>
          <button className="min-h-11 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)] disabled:cursor-not-allowed disabled:opacity-45" disabled={currentChapter.globalChapterNumber === 1189} type="button" onClick={() => moveChapter(1)}>Next chapter</button>
        </div>
      </section>
    </main>
  );
}