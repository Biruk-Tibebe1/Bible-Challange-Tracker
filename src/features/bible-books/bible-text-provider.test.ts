import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BIBLE_BOOKS } from "./bible-data.ts";
import type { BibleChapterText } from "./bible-translations.ts";
import { getTranslationUnavailableState } from "./bible-translations.ts";

interface KJVBookData {
  chapters: Record<string, BibleChapterText["verses"]>;
}

interface KJVDataset {
  source: string;
  sourceUrl: string;
  books: Record<string, KJVBookData>;
}

const dataset = JSON.parse(
  readFileSync(new URL("./data/kjv.json", import.meta.url), "utf8"),
) as KJVDataset;

test("KJV dataset has exactly the 66 books in existing Bible metadata", () => {
  assert.equal(Object.keys(dataset.books).length, 66);
  assert.deepEqual(Object.keys(dataset.books), BIBLE_BOOKS.map((book) => book.id));
});

test("KJV chapter counts match all existing book metadata and total 1,189", () => {
  let totalChapters = 0;
  for (const book of BIBLE_BOOKS) {
    const chapterNumbers = Object.keys(dataset.books[book.id]?.chapters ?? {}).map(Number);
    assert.equal(chapterNumbers.length, book.chapterCount, `${book.name} chapter count`);
    assert.deepEqual(chapterNumbers, Array.from({ length: book.chapterCount }, (_, index) => index + 1));
    totalChapters += chapterNumbers.length;
  }
  assert.equal(totalChapters, 1189);
});

test("KJV dataset preserves all 31,102 numbered verses", () => {
  const totalVerses = Object.values(dataset.books).reduce(
    (bookTotal, book) => bookTotal + Object.values(book.chapters).reduce(
      (chapterTotal, verses) => chapterTotal + verses.length,
      0,
    ),
    0,
  );
  assert.equal(totalVerses, 31102);
});

test("KJV verses exclude Project Gutenberg section and end-of-book markers", () => {
  for (const book of Object.values(dataset.books)) {
    for (const verses of Object.values(book.chapters)) {
      for (const verse of verses) {
        assert.doesNotMatch(verse.text, /\*\*\*/);
        assert.doesNotMatch(verse.text, /The New Testament of the King James Bible/);
      }
    }
  }
});

test("KJV contains numbered verses for Genesis 1, Psalm 150, Matthew 1, and Revelation 22", () => {
  for (const [bookId, chapterNumber] of [
    ["genesis", 1],
    ["psalms", 150],
    ["matthew", 1],
    ["revelation", 22],
  ] as const) {
    const verses = dataset.books[bookId]?.chapters[String(chapterNumber)];
    assert.ok(verses && verses.length > 0, `${bookId} ${chapterNumber} has verses`);
    assert.equal(verses[0]?.verseNumber, 1);
    assert.equal(verses[0]?.id, `${bookId}.${chapterNumber}.1`);
    assert.ok(verses.every((verse, index) => verse.verseNumber === index + 1 && verse.text.length > 0));
  }
});

test("missing Amharic and NIV sources return precise unavailable states", () => {
  assert.deepEqual(getTranslationUnavailableState("amharic"), {
    status: "unavailable",
    reason: "translation-not-available",
    message: "The Amharic Bible translation is not yet available.",
  });
  assert.deepEqual(getTranslationUnavailableState("niv"), {
    status: "unavailable",
    reason: "source-not-configured",
    message: "NIV source not configured.",
  });
  assert.equal(getTranslationUnavailableState("kjv"), null);
});

test("KJV dataset records its public-domain source", () => {
  assert.match(dataset.source, /Project Gutenberg eBook 10/);
  assert.equal(dataset.sourceUrl, "https://www.gutenberg.org/files/10/10-0.txt");
});