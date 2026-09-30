import assert from "node:assert/strict";
import test from "node:test";
import {
  addBibleBookmark,
  createBibleBookmark,
  readBibleBookmarks,
  readReadingPosition,
  removeBibleBookmark,
  resolveReadingPosition,
  saveBibleBookmarks,
  saveReadingPosition,
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

test("bookmark identity includes translation, book, chapter, and verse", () => {
  const kjvGenesis = createBibleBookmark("kjv", genesisLocation, genesisVerse);
  const nivGenesis = createBibleBookmark("niv", genesisLocation, genesisVerse);
  const kjvExodus = createBibleBookmark("kjv", { bookId: "exodus", chapterNumber: 1 }, genesisVerse);
  const kjvGenesisVerseTwo = createBibleBookmark("kjv", genesisLocation, { ...genesisVerse, verseNumber: 2 });

  assert.equal(kjvGenesis.id, "kjv:genesis:1:1");
  assert.equal(new Set([kjvGenesis.id, nivGenesis.id, kjvExodus.id, kjvGenesisVerseTwo.id]).size, 4);
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