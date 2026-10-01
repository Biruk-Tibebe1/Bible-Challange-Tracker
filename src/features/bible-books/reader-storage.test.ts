import assert from "node:assert/strict";
import test from "node:test";
import {
  addBibleBookmark,
  createBibleVerseIdentity,
  createBibleBookmark,
  DEFAULT_BIBLE_READING_SETTINGS,
  formatBibleVerseReference,
  readBibleHighlights,
  readBibleBookmarks,
  readBibleNotes,
  readBibleReadingSettings,
  readReadingPosition,
  removeBibleHighlight,
  removeBibleNote,
  removeBibleBookmark,
  resolveReadingPosition,
  saveBibleHighlights,
  saveBibleBookmarks,
  saveBibleNotes,
  saveBibleReadingSettings,
  saveReadingPosition,
  upsertBibleHighlight,
  upsertBibleNote,
} from "./reader-storage.ts";
import type { BibleBookmark, LocalStorageLike } from "./reader-storage.ts";

class MemoryStorage implements LocalStorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const genesisLocation = { bookId: "genesis", chapterNumber: 1 } as const;
const genesisVerse = { id: "genesis.1.1", verseNumber: 1, text: "In the beginning" } as const;

test("reading position persists and restores a selected chapter and translation", () => {
  const storage = new MemoryStorage();
  const position = { translation: "kjv", bookId: "john", chapterNumber: 3 } as const;

  assert.equal(saveReadingPosition(storage, position), true);
  assert.deepEqual(readReadingPosition(storage), position);
});

test("an explicit URL location overrides the saved book and chapter", () => {
  const saved = { translation: "kjv", bookId: "john", chapterNumber: 3 } as const;
  assert.deepEqual(resolveReadingPosition(genesisLocation, saved), {
    translation: "kjv",
    ...genesisLocation,
  });
});

test("an explicit URL translation overrides the saved translation", () => {
  const saved = { translation: "kjv", bookId: "john", chapterNumber: 3 } as const;
  assert.deepEqual(resolveReadingPosition(undefined, saved, undefined, "niv"), {
    translation: "niv",
    bookId: "john",
    chapterNumber: 3,
  });
  assert.deepEqual(resolveReadingPosition(undefined, null, undefined, "kjv"), {
    translation: "kjv",
    bookId: "genesis",
    chapterNumber: 1,
  });
});

test("bookmark identity includes translation, book, chapter, and verse", () => {
  const kjvGenesis = createBibleBookmark("kjv", genesisLocation, genesisVerse);
  const nivGenesis = createBibleBookmark("niv", genesisLocation, genesisVerse);
  const kjvExodus = createBibleBookmark("kjv", { bookId: "exodus", chapterNumber: 1 }, genesisVerse);
  const kjvGenesisVerseTwo = createBibleBookmark("kjv", genesisLocation, { ...genesisVerse, verseNumber: 2 });

  assert.equal(kjvGenesis.id, "kjv:genesis:1:1");
  assert.equal(new Set([kjvGenesis.id, nivGenesis.id, kjvExodus.id, kjvGenesisVerseTwo.id]).size, 4);
});

test("verse references include the selected translation and exact location", () => {
  const identity = createBibleVerseIdentity("kjv", { bookId: "john", chapterNumber: 3 }, 16);
  assert.equal(formatBibleVerseReference("John", identity), "John 3:16 (KJV)");
});

test("duplicate bookmarks are not added and bookmarks can be removed", () => {
  const bookmark = createBibleBookmark("kjv", genesisLocation, genesisVerse);
  const added = addBibleBookmark([], bookmark);
  const duplicate = addBibleBookmark(added, bookmark);

  assert.equal(duplicate.length, 1);
  assert.deepEqual(removeBibleBookmark(duplicate, bookmark.id), []);
});

test("bookmarks persist through local storage", () => {
  const storage = new MemoryStorage();
  const bookmark: BibleBookmark = createBibleBookmark("kjv", genesisLocation, genesisVerse);
  assert.equal(saveBibleBookmarks(storage, [bookmark]), true);
  assert.deepEqual(readBibleBookmarks(storage), [bookmark]);
});

test("highlights create, update, remove, persist, and remain translation-specific", () => {
  const storage = new MemoryStorage();
  const identity = createBibleVerseIdentity("kjv", genesisLocation, 1);
  const otherTranslation = createBibleVerseIdentity("niv", genesisLocation, 1);
  let highlights = upsertBibleHighlight([], identity, "sunlight");
  highlights = upsertBibleHighlight(highlights, identity, "rose");
  highlights = upsertBibleHighlight(highlights, otherTranslation, "sage");

  assert.equal(highlights.length, 2);
  assert.equal(highlights.find((item) => item.translation === "kjv")?.color, "rose");
  assert.equal(saveBibleHighlights(storage, highlights), true);
  assert.deepEqual(readBibleHighlights(storage), highlights);
  assert.deepEqual(removeBibleHighlight(highlights, "kjv:genesis:1:1").map((item) => item.translation), ["niv"]);
});

test("verse notes create, edit, delete, persist, and remain translation-specific", () => {
  const storage = new MemoryStorage();
  const kjvIdentity = createBibleVerseIdentity("kjv", genesisLocation, 1);
  const nivIdentity = createBibleVerseIdentity("niv", genesisLocation, 1);
  let notes = upsertBibleNote([], kjvIdentity, "  First thought  ", "2026-09-30T10:00:00.000Z");
  notes = upsertBibleNote(notes, kjvIdentity, "Edited thought", "2026-09-30T11:00:00.000Z");
  notes = upsertBibleNote(notes, nivIdentity, "Different translation note", "2026-09-30T12:00:00.000Z");

  assert.equal(notes.length, 2);
  assert.equal(notes.find((item) => item.translation === "kjv")?.note, "Edited thought");
  assert.equal(saveBibleNotes(storage, notes), true);
  assert.deepEqual(readBibleNotes(storage), notes);
  assert.deepEqual(removeBibleNote(notes, "kjv:genesis:1:1").map((item) => item.translation), ["niv"]);
  assert.deepEqual(upsertBibleNote(notes, nivIdentity, "   ").map((item) => item.translation), ["kjv"]);
});

test("reading settings persist font size and mode with safe defaults", () => {
  const storage = new MemoryStorage();
  assert.deepEqual(readBibleReadingSettings(storage), DEFAULT_BIBLE_READING_SETTINGS);
  const settings = { fontSize: "extra-large", readingMode: "dark" } as const;
  assert.equal(saveBibleReadingSettings(storage, settings), true);
  assert.deepEqual(readBibleReadingSettings(storage), settings);
});