"use client";

import { useEffect, useRef, useState } from "react";
import {
  BIBLE_BOOKS,
  findBibleChapter,
  getBibleChapter,
  getChaptersInBook,
} from "../bible-data";
import type { Testament } from "../bible-data";
import { BIBLE_TRANSLATIONS } from "../bible-translations";
import type { BibleTextResult, BibleTranslationId, BibleVerse } from "../bible-translations";
import { getBibleTranslationProvider } from "../bible-text-provider";
import type { BibleLocation } from "../bible-data";
import { BibleSearchPanel } from "./bible-search-panel";
import { ApiBibleFairUseTracker } from "./api-bible-fair-use-tracker";
import { formatBibleVerseReference } from "../reader-storage";
import {
  addBibleBookmark,
  createBibleBookmark,
  readBibleBookmarks,
  readBibleHighlights,
  readBibleNotes,
  readBibleReadingSettings,
  readReadingPosition,
  removeBibleBookmark,
  resolveReadingPosition,
  saveBibleBookmarks,
  saveBibleHighlights,
  saveBibleNotes,
  saveBibleReadingSettings,
  saveReadingPosition,
} from "../reader-storage";
import type { BibleBookmark, BibleHighlight, BibleNote, BibleReadingSettings, ReadingPosition } from "../reader-storage";
import { createBibleVerseIdentity, removeBibleHighlight, removeBibleNote, upsertBibleHighlight, upsertBibleNote } from "../reader-storage";

export function BibleReader({
  initialLocation,
  initialVerseNumber,
  initialTranslation,
}: {
  initialLocation?: BibleLocation;
  initialVerseNumber?: number;
  initialTranslation?: BibleTranslationId;
}) {
  const explicitBookId = initialLocation?.bookId;
  const explicitChapterNumber = initialLocation?.chapterNumber;
  const initialChapter = initialLocation
    ? findBibleChapter(initialLocation.bookId, initialLocation.chapterNumber)
    : undefined;
  const [testament, setTestament] = useState<Testament>(initialChapter?.testament ?? "Old Testament");
  const [bookId, setBookId] = useState(initialChapter?.bookId ?? "genesis");
  const [chapterNumber, setChapterNumber] = useState(initialChapter?.chapterNumber ?? 1);
  const [translation, setTranslation] = useState<BibleTranslationId>(initialTranslation ?? "kjv");
  const [isLocalStateReady, setIsLocalStateReady] = useState(false);
  const [bookmarks, setBookmarks] = useState<BibleBookmark[]>([]);
  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);
  const [notes, setNotes] = useState<BibleNote[]>([]);
  const [readingSettings, setReadingSettings] = useState<BibleReadingSettings>({ fontSize: "normal", readingMode: "light" });
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [canShareVerse, setCanShareVerse] = useState(false);
  const pendingVerseId = useRef<string | null>(null);
  const [chapterResult, setChapterResult] = useState<BibleTextResult | null>(null);
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const currentChapter = findBibleChapter(bookId, chapterNumber)!;
  const chaptersInBook = getChaptersInBook(bookId);

  useEffect(() => {
    let savedPosition = null;
    let savedBookmarks: BibleBookmark[] = [];
    let savedHighlights: BibleHighlight[] = [];
    let savedNotes: BibleNote[] = [];
    let savedSettings: BibleReadingSettings = { fontSize: "normal", readingMode: "light" };
    try {
      if (typeof window !== "undefined") {
        savedPosition = readReadingPosition(window.localStorage);
        savedBookmarks = readBibleBookmarks(window.localStorage);
        savedHighlights = readBibleHighlights(window.localStorage);
        savedNotes = readBibleNotes(window.localStorage);
        savedSettings = readBibleReadingSettings(window.localStorage);
      }
    } catch {
      savedPosition = null;
      savedBookmarks = [];
    }
    const restoredPosition = resolveReadingPosition(
      explicitBookId && explicitChapterNumber
        ? { bookId: explicitBookId, chapterNumber: explicitChapterNumber }
        : undefined,
      savedPosition,
      undefined,
      initialTranslation,
    );
    const restored = restoredPosition;
    const restoredChapter = findBibleChapter(restored.bookId, restored.chapterNumber);
    setBookId(restored.bookId);
    setChapterNumber(restored.chapterNumber);
    setTestament(restoredChapter?.testament ?? "Old Testament");
    setTranslation(restored.translation);
    setBookmarks(savedBookmarks);
    setHighlights(savedHighlights);
    setNotes(savedNotes);
    setReadingSettings(savedSettings);
    if (initialLocation && Number.isSafeInteger(initialVerseNumber) && initialVerseNumber! > 0) {
      pendingVerseId.current = `${initialLocation.bookId}.${initialLocation.chapterNumber}.${initialVerseNumber}`;
    }
    setCanShareVerse(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setIsLocalStateReady(true);
  }, [explicitBookId, explicitChapterNumber, initialLocation, initialTranslation, initialVerseNumber]);

  useEffect(() => {
    if (!isLocalStateReady || typeof window === "undefined") return;
    const position: ReadingPosition = { translation, bookId, chapterNumber };
    try {
      saveReadingPosition(window.localStorage, position);
    } catch {
      // Storage may be unavailable in private or restricted browsing modes.
    }
  }, [bookId, chapterNumber, isLocalStateReady, translation]);

  useEffect(() => {
    if (!isLocalStateReady || typeof window === "undefined") return;
    try {
      saveBibleBookmarks(window.localStorage, bookmarks);
    } catch {
      // Keep the current session usable if local storage is unavailable.
    }
  }, [bookmarks, isLocalStateReady]);

  useEffect(() => {
    if (!isLocalStateReady || typeof window === "undefined") return;
    saveBibleHighlights(window.localStorage, highlights);
  }, [highlights, isLocalStateReady]);

  useEffect(() => {
    if (!isLocalStateReady || typeof window === "undefined") return;
    saveBibleNotes(window.localStorage, notes);
  }, [isLocalStateReady, notes]);

  useEffect(() => {
    if (!isLocalStateReady || typeof window === "undefined") return;
    saveBibleReadingSettings(window.localStorage, readingSettings);
  }, [isLocalStateReady, readingSettings]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;
    setChapterResult(null);
    setIsChapterLoading(true);
    void getBibleTranslationProvider(translation).getChapter({ bookId, chapterNumber }, controller.signal)
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

  useEffect(() => {
    const verseId = pendingVerseId.current;
    if (chapterResult?.status !== "available" || !verseId) return;
    pendingVerseId.current = null;
    if (!chapterResult.chapter.verses.some((verse) => verse.id === verseId)) return;
    setSelectedVerseId(verseId);
    requestAnimationFrame(() => document.getElementById(verseId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [chapterResult, explicitBookId, explicitChapterNumber, initialVerseNumber]);

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
      setSelectedVerseId(null);
      setActionNotice("");
    }
  }

  function toggleBookmark(verse: BibleVerse) {
    const bookmark = createBibleBookmark(translation, { bookId, chapterNumber }, verse);
    const isBookmarked = bookmarks.some((item) => item.id === bookmark.id);
    setBookmarks((current) => isBookmarked
      ? removeBibleBookmark(current, bookmark.id)
      : addBibleBookmark(current, bookmark));
    setActionNotice(isBookmarked ? "Bookmark removed." : "Verse bookmarked on this device.");
  }

  function getVerseIdentity(verse: BibleVerse) {
    return createBibleVerseIdentity(translation, { bookId, chapterNumber }, verse.verseNumber);
  }

  function updateHighlight(verse: BibleVerse, color: string) {
    const identity = getVerseIdentity(verse);
    const id = `${translation}:${bookId}:${chapterNumber}:${verse.verseNumber}`;
    setHighlights((current) => color
      ? upsertBibleHighlight(current, identity, color as BibleHighlight["color"])
      : removeBibleHighlight(current, id));
    setActionNotice(color ? "Highlight saved on this device." : "Highlight removed.");
  }

  function saveVerseNote(verse: BibleVerse) {
    setNotes((current) => upsertBibleNote(current, getVerseIdentity(verse), noteDraft));
    setActionNotice(noteDraft.trim() ? "Note saved on this device." : "Note removed.");
  }

  function deleteVerseNote(verse: BibleVerse) {
    const id = `${translation}:${bookId}:${chapterNumber}:${verse.verseNumber}`;
    setNotes((current) => removeBibleNote(current, id));
    setNoteDraft("");
    setActionNotice("Note deleted.");
  }

  async function copyReference(verse: BibleVerse) {
    const reference = formatBibleVerseReference(currentChapter.bookName, getVerseIdentity(verse));
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(reference);
      setActionNotice("Reference copied.");
    } catch {
      const field = document.createElement("textarea");
      field.value = reference;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      setActionNotice(copied ? "Reference copied." : "Copy is unavailable in this browser.");
    }
  }

  async function copyVerse(verse: BibleVerse) {
    const reference = formatBibleVerseReference(currentChapter.bookName, getVerseIdentity(verse));
    const text = `${reference}\n${verse.text}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setActionNotice("Verse copied.");
    } catch {
      const temporaryField = document.createElement("textarea");
      temporaryField.value = text;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "fixed";
      temporaryField.style.opacity = "0";
      document.body.append(temporaryField);
      temporaryField.select();
      const wasCopied = document.execCommand("copy");
      temporaryField.remove();
      setActionNotice(wasCopied ? "Verse copied." : "Copy is unavailable in this browser.");
    }
  }

  async function shareVerse(verse: BibleVerse) {
    const reference = formatBibleVerseReference(currentChapter.bookName, getVerseIdentity(verse));
    try {
      await navigator.share({ title: reference, text: `${reference}\n${verse.text}` });
      setActionNotice("Verse shared.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setActionNotice("Unable to share this verse.");
    }
  }

  function openBookmark(bookmark: BibleBookmark) {
    const targetChapter = findBibleChapter(bookmark.bookId, bookmark.chapterNumber);
    if (!targetChapter) return;
    const verseId = `${bookmark.bookId}.${bookmark.chapterNumber}.${bookmark.verseNumber}`;
    setTranslation(bookmark.translation);
    setTestament(targetChapter.testament);
    setBookId(bookmark.bookId);
    setChapterNumber(bookmark.chapterNumber);
    setNoteDraft(notes.find((note) => note.id === bookmark.id)?.note ?? "");
    setActionNotice("");
    if (bookmark.bookId === bookId && bookmark.chapterNumber === chapterNumber && bookmark.translation === translation) {
      setSelectedVerseId(verseId);
      requestAnimationFrame(() => document.getElementById(verseId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } else {
      pendingVerseId.current = verseId;
    }
  }

  function openNote(note: BibleNote) {
    const targetChapter = findBibleChapter(note.bookId, note.chapterNumber);
    if (!targetChapter) return;
    const verseId = `${note.bookId}.${note.chapterNumber}.${note.verseNumber}`;
    setTranslation(note.translation);
    setTestament(targetChapter.testament);
    setBookId(note.bookId);
    setChapterNumber(note.chapterNumber);
    setNoteDraft(note.note);
    setActionNotice("");
    if (note.bookId === bookId && note.chapterNumber === chapterNumber && note.translation === translation) {
      setSelectedVerseId(verseId);
      requestAnimationFrame(() => document.getElementById(verseId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } else {
      pendingVerseId.current = verseId;
    }
  }

  return (
    <main className={`bible-reader-shell mx-auto max-w-5xl py-4 sm:py-8 ${readingSettings.readingMode === "dark" ? "bible-reading-dark" : ""}`} data-font-size={readingSettings.fontSize}>
      <header className="border-b border-[var(--line)] pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Read Scripture</p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">The Bible</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Choose a book, chapter, and available translation to read.</p>
      </header>

      <div className="mt-5"><BibleSearchPanel key={translation} translation={translation} /></div>

      <details className="mb-5 rounded-md border border-[var(--line)] bg-white/55" data-reader-surface>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium text-[var(--ink)]">
          <span>Reading settings</span>
          <span className="text-xs font-normal text-[var(--muted)]">{readingSettings.fontSize.replace("extra-", "")} · {readingSettings.readingMode} mode</span>
        </summary>
        <div className="flex flex-wrap items-end gap-4 border-t border-[var(--line)] p-4">
          <label className="min-w-40 flex-1 text-xs text-[var(--muted)]" htmlFor="bible-font-size">Text size
            <select className="mt-1 min-h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" id="bible-font-size" value={readingSettings.fontSize} onChange={(event) => setReadingSettings((current) => ({ ...current, fontSize: event.target.value as BibleReadingSettings["fontSize"] }))}>
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra-large</option>
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm text-[var(--ink)]">
            <input checked={readingSettings.readingMode === "dark"} className="size-4 accent-[var(--forest)]" type="checkbox" onChange={(event) => setReadingSettings((current) => ({ ...current, readingMode: event.target.checked ? "dark" : "light" }))} />
            Dark reading mode
          </label>
        </div>
      </details>

      <section aria-label="Bible passage selection" className="mt-6 rounded-md border border-[var(--line)] bg-white/60 p-4 sm:p-6" data-reader-surface>
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

      <section aria-labelledby="current-passage-title" className="mt-5 overflow-hidden rounded-md border border-[var(--line)] bg-white/65" data-reader-surface>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">{testament}</p>
            <h2 id="current-passage-title" className="mt-1 font-serif text-2xl text-[var(--ink)] sm:text-3xl">{currentChapter.bookName} {currentChapter.chapterNumber}</h2>
          </div>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            Chapter {currentChapter.globalChapterNumber} of 1,189
            {chapterResult?.status === "available" && <span> · {chapterResult.chapter.verses.length} verses</span>}
          </p>
        </div>
        {isChapterLoading ? (
          <p aria-live="polite" className="px-5 py-12 text-center text-sm text-[var(--muted)]">Loading chapter…</p>
        ) : chapterResult?.status === "available" ? (
          <>
          {translation === "niv" && <ApiBibleFairUseTracker token={chapterResult.chapter.fumsToken} />}
          <ol aria-label={`${currentChapter.bookName} ${currentChapter.chapterNumber} verses`} className="bible-verse-list mx-auto max-w-3xl list-none space-y-3 px-3 py-5 font-serif text-lg leading-8 text-[var(--ink)] sm:px-8 sm:py-9 sm:text-xl sm:leading-9">
            {chapterResult.chapter.verses.map((verse) => {
              const identityKey = `${translation}:${bookId}:${chapterNumber}:${verse.verseNumber}`;
              const highlight = highlights.find((item) => item.id === identityKey);
              const note = notes.find((item) => item.id === identityKey);
              const bookmark = bookmarks.some((item) => item.id === identityKey);
              const highlightClass = highlight?.color === "sunlight"
                ? "bg-[#f3e5b7]/65"
                : highlight?.color === "sage"
                  ? "bg-[#dcebdc]/85"
                  : highlight?.color === "rose"
                    ? "bg-[#f4dddd]/80"
                    : "";
              return (
                <li className="scroll-mt-24" id={verse.id} key={verse.id}>
                  <button
                    aria-label={`${currentChapter.bookName} ${chapterNumber}:${verse.verseNumber}${bookmark ? ", bookmarked" : ""}${highlight ? ", highlighted" : ""}${note ? ", has note" : ""}`}
                    aria-pressed={selectedVerseId === verse.id}
                    className={`w-full rounded-sm px-2 py-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)] ${highlightClass} ${selectedVerseId === verse.id ? "ring-1 ring-[var(--forest)]" : "hover:bg-white/70"}`}
                    data-verse-text
                    type="button"
                    onClick={() => {
                      setSelectedVerseId(verse.id);
                      setNoteDraft(note?.note ?? "");
                      setActionNotice("");
                    }}
                  >
                    <sup className="mr-1.5 align-super font-sans text-xs font-semibold text-[var(--forest)]">{verse.verseNumber}</sup>
                    {verse.text}
                    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle font-sans text-[10px] text-[var(--forest-deep)]">
                      {bookmark && <span aria-hidden="true" className="rounded bg-white/70 px-1.5 py-0.5">Saved</span>}
                      {highlight && <span aria-hidden="true" className="rounded bg-white/70 px-1.5 py-0.5">Marked</span>}
                      {note && <span aria-hidden="true" className="rounded bg-white/70 px-1.5 py-0.5">Note</span>}
                    </span>
                  </button>
                  {selectedVerseId === verse.id && (
                    <details className="mx-2 mt-1 rounded-md border border-[var(--line)] bg-white/70 font-sans" data-reader-surface open>
                      <summary className="min-h-10 cursor-pointer px-3 py-2 text-xs font-medium text-[var(--forest-deep)]">Verse tools</summary>
                      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] p-3">
                        <button className="min-h-10 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--sage)]" type="button" onClick={() => toggleBookmark(verse)}>
                          {bookmark ? "Remove bookmark" : "Bookmark verse"}
                        </button>
                        <label className="flex min-h-10 items-center gap-2 rounded border border-[var(--line)] px-2 text-xs text-[var(--muted)]">
                          Highlight
                          <select aria-label={`Highlight color for ${currentChapter.bookName} ${chapterNumber}:${verse.verseNumber}`} className="min-h-9 bg-transparent text-xs text-[var(--ink)]" value={highlight?.color ?? ""} onChange={(event) => updateHighlight(verse, event.target.value)}>
                            <option value="">None</option>
                            <option value="sunlight">Gold</option>
                            <option value="sage">Green</option>
                            <option value="rose">Rose</option>
                          </select>
                        </label>
                        <button className="min-h-10 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--sage)]" type="button" onClick={() => void copyReference(verse)}>Copy reference</button>
                        <button className="min-h-10 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--sage)]" type="button" onClick={() => void copyVerse(verse)}>Copy text + reference</button>
                        {canShareVerse && <button className="min-h-10 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--sage)]" type="button" onClick={() => void shareVerse(verse)}>Share</button>}
                        <label className="basis-full text-xs font-medium text-[var(--muted)]" htmlFor={`verse-note-${verse.id}`}>Personal note
                          <textarea className="mt-1 min-h-20 w-full resize-y rounded border border-[var(--line)] bg-white px-3 py-2 text-sm font-normal text-[var(--ink)]" id={`verse-note-${verse.id}`} maxLength={4000} placeholder="Write a note for yourself" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                        </label>
                        <button className="min-h-10 rounded bg-[var(--forest)] px-3 text-xs font-medium text-white hover:bg-[var(--forest-deep)]" type="button" onClick={() => saveVerseNote(verse)}>Save note</button>
                        {note && <button className="min-h-10 rounded border border-[var(--line)] px-3 text-xs text-[var(--muted)] hover:bg-[var(--sage)]" type="button" onClick={() => deleteVerseNote(verse)}>Delete note</button>}
                        {actionNotice && <span aria-live="polite" className="basis-full text-xs text-[var(--muted)]" role="status">{actionNotice}</span>}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
          {chapterResult.chapter.attribution?.notice && (
            <p className="mx-auto max-w-3xl border-t border-[var(--line)] px-5 py-4 text-xs leading-5 text-[var(--muted)] sm:px-8">
              {chapterResult.chapter.attribution.notice}
            </p>
          )}
          </>
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

      <details className="mt-5 rounded-md border border-[var(--line)] bg-white/50" data-reader-surface>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-[var(--ink)] sm:px-5">
          <span>Bookmarks</span>
          <span className="text-xs font-normal text-[var(--muted)]">{bookmarks.length} saved on this device</span>
        </summary>
        {bookmarks.length === 0 ? (
          <p className="border-t border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">Select a verse and bookmark it to keep it here.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)] px-4 sm:px-5">
            {bookmarks.map((bookmark) => {
              const name = BIBLE_BOOKS.find((book) => book.id === bookmark.bookId)?.name ?? bookmark.bookId;
              return (
                <li className="flex flex-wrap items-start justify-between gap-3 py-4" key={bookmark.id}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--forest)]">{name} {bookmark.chapterNumber}:{bookmark.verseNumber} · {bookmark.translation.toUpperCase()}</p>
                    <p className="mt-1 break-words text-sm leading-6 text-[var(--ink)]">{bookmark.text}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="min-h-9 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--forest-deep)] hover:bg-[var(--sage)]" type="button" onClick={() => openBookmark(bookmark)}>Open</button>
                    <button aria-label={`Remove bookmark ${name} ${bookmark.chapterNumber}:${bookmark.verseNumber}`} className="min-h-9 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--muted)] hover:bg-[var(--sage)]" type="button" onClick={() => setBookmarks((current) => removeBibleBookmark(current, bookmark.id))}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </details>

      <details className="mt-3 rounded-md border border-[var(--line)] bg-white/50" data-reader-surface>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-[var(--ink)] sm:px-5">
          <span>Personal notes</span>
          <span className="text-xs font-normal text-[var(--muted)]">{notes.length} saved on this device</span>
        </summary>
        {notes.length === 0 ? (
          <p className="border-t border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">Select a verse and add a personal note to keep it here.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)] px-4 sm:px-5">
            {notes.map((note) => {
              const name = BIBLE_BOOKS.find((book) => book.id === note.bookId)?.name ?? note.bookId;
              return (
                <li className="flex flex-wrap items-start justify-between gap-3 py-4" key={note.id}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--forest)]">{name} {note.chapterNumber}:{note.verseNumber} · {note.translation.toUpperCase()}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ink)]">{note.note}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="min-h-9 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--forest-deep)] hover:bg-[var(--sage)]" type="button" onClick={() => openNote(note)}>Open / edit</button>
                    <button aria-label={`Delete note ${name} ${note.chapterNumber}:${note.verseNumber}`} className="min-h-9 rounded border border-[var(--line)] px-3 text-xs font-medium text-[var(--muted)] hover:bg-[var(--sage)]" type="button" onClick={() => setNotes((current) => removeBibleNote(current, note.id))}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </details>
    </main>
  );
}