import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BIBLE_BOOKS } from "./bible-data.ts";
import { createAmharicSourceClient, createNIVSourceClient, getNIVSourceConfig } from "./amharic-source.ts";
import { BIBLE_TRANSLATIONS, getTranslationUnavailableState } from "./bible-translations.ts";
import {
  BIBLE_TRANSLATION_PROVIDERS,
  createAmharicTranslationProvider,
  createKJVTranslationProvider,
  createNIVTranslationProvider,
  getBibleTranslationProvider,
} from "./bible-text-provider.ts";
import type { KJVDataset } from "./kjv-search.ts";

interface StoredKJVDataset extends KJVDataset {
  source: string;
  sourceUrl: string;
}

const dataset = JSON.parse(
  readFileSync(new URL("./data/kjv.json", import.meta.url), "utf8"),
) as StoredKJVDataset;

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
    reason: "source-not-configured",
    message: "Amharic source is not configured yet.",
  });
  assert.deepEqual(getTranslationUnavailableState("niv"), {
    status: "unavailable",
    reason: "source-not-configured",
    message: "NIV source is not configured yet.",
  });
  assert.equal(getTranslationUnavailableState("kjv"), null);
});

test("KJV dataset records its public-domain source", () => {
  assert.match(dataset.source, /Project Gutenberg eBook 10/);
  assert.equal(dataset.sourceUrl, "https://www.gutenberg.org/files/10/10-0.txt");
});

test("translation registry describes KJV as local and Amharic/NIV as planned", () => {
  assert.deepEqual(BIBLE_TRANSLATIONS.map(({ id, abbreviation, sourceType, availabilityStatus }) => ({
    id,
    abbreviation,
    sourceType,
    availabilityStatus,
  })), [
    { id: "kjv", abbreviation: "KJV", sourceType: "local", availabilityStatus: "available" },
    { id: "amharic", abbreviation: "AMH", sourceType: "api", availabilityStatus: "planned" },
    { id: "niv", abbreviation: "NIV", sourceType: "api", availabilityStatus: "planned" },
  ]);
  assert.equal(getBibleTranslationProvider("kjv"), BIBLE_TRANSLATION_PROVIDERS.kjv);
  assert.equal(getBibleTranslationProvider("amharic"), BIBLE_TRANSLATION_PROVIDERS.amharic);
  assert.equal(getBibleTranslationProvider("niv"), BIBLE_TRANSLATION_PROVIDERS.niv);
});

test("KJV provider exposes books and delegates chapter, verse, and search to current APIs", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/search?")) {
      return Response.json({
        status: "ok",
        query: "In the beginning",
        total: 1,
        results: [{ bookId: "genesis", chapterNumber: 1, verseNumber: 1, verseId: "genesis.1.1", bookName: "Genesis", reference: "Genesis 1:1", snippet: "In the beginning…" }],
      });
    }
    const verse = dataset.books.genesis!.chapters["1"]![0]!;
    return Response.json({
      status: "available",
      chapter: { location: { bookId: "genesis", chapterNumber: 1 }, translation: "kjv", verses: [verse] },
    });
  };
  const provider = createKJVTranslationProvider(fetcher);

  assert.equal(provider.translationId, "kjv");
  assert.deepEqual(await provider.getBookList(), BIBLE_BOOKS);
  const chapter = await provider.getChapter({ bookId: "genesis", chapterNumber: 1 });
  assert.equal(chapter.status, "available");
  const verse = await provider.getVerse({ bookId: "genesis", chapterNumber: 1 }, 1);
  assert.equal(verse.status, "available");
  if (verse.status === "available") assert.equal(verse.verse.id, "genesis.1.1");
  const search = await provider.search("In the beginning");
  assert.equal(search.status, "available");
  if (search.status === "available") assert.equal(search.results[0]?.reference, "Genesis 1:1");
  assert.deepEqual(calls.map((url) => url.split("?")[0]), [
    "/api/bible/kjv/genesis/1",
    "/api/bible/kjv/genesis/1",
    "/api/bible/search",
  ]);
});

test("Amharic provider lookup delegates chapter requests through the local API boundary", async () => {
  const calls: string[] = [];
  const provider = createAmharicTranslationProvider(async (input) => {
    calls.push(String(input));
    return Response.json({ status: "unavailable", reason: "source-not-configured", message: "Amharic source is not configured yet." }, { status: 503 });
  });

  assert.equal(provider.translationId, "amharic");
  assert.deepEqual(await provider.getBookList(), BIBLE_BOOKS);
  assert.deepEqual(await provider.getChapter({ bookId: "genesis", chapterNumber: 1 }), {
    status: "unavailable",
    reason: "source-not-configured",
    message: "Amharic source is not configured yet.",
  });
  assert.deepEqual(calls, ["/api/bible/amharic/genesis/1"]);
});

test("Amharic source requires both endpoint and provider-supplied attribution", async () => {
  let requestCount = 0;
  const client = createAmharicSourceClient({ endpoint: "https://scripture.example/api" }, async () => {
    requestCount += 1;
    return Response.json({ verses: [{ verseNumber: 1, text: "mock external text" }] });
  });

  assert.deepEqual(await client.getChapter({ bookId: "genesis", chapterNumber: 1 }), {
    status: "unavailable",
    reason: "source-not-configured",
    message: "Amharic source is not configured yet.",
  });
  assert.equal(requestCount, 0);
});

test("Amharic source normalizes mocked chapter, verse, and search results with attribution", async () => {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-key");
    if (url.searchParams.get("operation") === "chapter") {
      return Response.json({
        bookId: "genesis",
        chapterNumber: 1,
        verses: [{ verseNumber: 1, text: "mock external text" }, { verseNumber: 2, text: "another mock line" }],
      });
    }
    if (url.searchParams.get("operation") === "verse") {
      return Response.json({ verse: { verseNumber: 1, text: "mock external text" } });
    }
    return Response.json({
      query: "mock",
      total: 1,
      results: [{ bookId: "genesis", chapterNumber: 1, verseNumber: 1, text: "mock external text" }],
    });
  };
  const client = createAmharicSourceClient({
    endpoint: "https://scripture.example/api",
    apiKey: "test-key",
    attribution: "Provider-supplied attribution notice",
  }, fetcher);

  const chapter = await client.getChapter({ bookId: "genesis", chapterNumber: 1 });
  assert.equal(chapter.status, "available");
  if (chapter.status === "available") {
    assert.equal(chapter.chapter.translation, "amharic");
    assert.equal(chapter.chapter.verses[0]?.id, "genesis.1.1");
    assert.equal(chapter.chapter.verses[0]?.reference, "Genesis 1:1");
    assert.equal(chapter.chapter.verses[0]?.text, "mock external text");
    assert.deepEqual(chapter.chapter.attribution, { notice: "Provider-supplied attribution notice" });
  }
  const verse = await client.getVerse({ bookId: "genesis", chapterNumber: 1 }, 1);
  assert.equal(verse.status, "available");
  if (verse.status === "available") assert.equal(verse.verse.reference, "Genesis 1:1");
  const search = await client.search("mock");
  assert.equal(search.status, "available");
  if (search.status === "available") {
    assert.equal(search.translation, "amharic");
    assert.equal(search.results[0]?.reference, "Genesis 1:1");
    assert.equal(search.results[0]?.snippet, "mock external text");
    assert.deepEqual(search.attribution, { notice: "Provider-supplied attribution notice" });
  }
  assert.deepEqual(calls.map((url) => url.searchParams.get("operation")), ["chapter", "verse", "search"]);
});

test("malformed Amharic source data returns an error without throwing", async () => {
  const client = createAmharicSourceClient({
    endpoint: "https://scripture.example/api",
    attribution: "Provider-supplied attribution notice",
  }, async () => Response.json({ verses: [{ verseNumber: 1, text: " " }] }));

  assert.deepEqual(await client.getChapter({ bookId: "genesis", chapterNumber: 1 }), {
    status: "error",
    message: "The configured Amharic source returned malformed verse data.",
  });
});

test("unavailable Amharic chapters are reported without fabricating text", async () => {
  const client = createAmharicSourceClient({
    endpoint: "https://scripture.example/api",
    attribution: "Provider-supplied attribution notice",
  }, async () => Response.json({ message: "not found" }, { status: 404 }));

  assert.deepEqual(await client.getChapter({ bookId: "genesis", chapterNumber: 1 }), {
    status: "unavailable",
    reason: "chapter-not-available",
    message: "This Amharic passage is not available from the configured source.",
  });
});

test("Amharic source network and timeout failures return a recoverable error", async () => {
  for (const failure of [new TypeError("network unavailable"), new DOMException("request timed out", "TimeoutError")]) {
    const client = createAmharicSourceClient({
      endpoint: "https://scripture.example/api",
      attribution: "Provider-supplied attribution notice",
    }, async () => {
      throw failure;
    });

    const result = await client.getChapter({ bookId: "genesis", chapterNumber: 1 });
    assert.equal(result.status, "error");
    if (result.status === "error") assert.match(result.message, /Unable to reach/);
  }
});

test("NIV provider lookup delegates requests through the local API boundary", async () => {
  const calls: string[] = [];
  const provider = createNIVTranslationProvider(async (input) => {
    calls.push(String(input));
    return Response.json({ status: "unavailable", reason: "source-not-configured", message: "NIV source is not configured yet." }, { status: 503 });
  });

  assert.equal(provider.translationId, "niv");
  assert.deepEqual(await provider.getChapter({ bookId: "genesis", chapterNumber: 1 }), {
    status: "unavailable",
    reason: "source-not-configured",
    message: "NIV source is not configured yet.",
  });
  await provider.getVerse({ bookId: "genesis", chapterNumber: 1 }, 1);
  await provider.search("mock phrase");
  assert.deepEqual(calls, [
    "/api/bible/niv/genesis/1",
    "/api/bible/niv/genesis/1?verse=1",
    "/api/bible/niv/search?q=mock+phrase",
  ]);
});

test("NIV source requires an endpoint, API key, and supplied attribution", async () => {
  let requestCount = 0;
  const client = createNIVSourceClient({
    endpoint: "https://scripture.example/api",
    attribution: "Provider-supplied attribution notice",
  }, async () => {
    requestCount += 1;
    return Response.json({ verses: [{ verseNumber: 1, text: "mock external text" }] });
  });

  assert.equal((await client.getChapter({ bookId: "genesis", chapterNumber: 1 })).status, "unavailable");
  assert.equal(requestCount, 0);
});

test("NIV server configuration maps the endpoint, key, and attribution environment variables", () => {
  assert.deepEqual(getNIVSourceConfig({
    NIV_BIBLE_API_URL: "https://scripture.example/api",
    NIV_BIBLE_API_KEY: "placeholder-key",
    NIV_BIBLE_ATTRIBUTION: "Provider-supplied notice",
  }), {
    endpoint: "https://scripture.example/api",
    apiKey: "placeholder-key",
    attribution: "Provider-supplied notice",
  });
});

test("NIV source normalizes mocked data and provider attribution", async () => {
  const client = createNIVSourceClient({
    endpoint: "https://scripture.example/api",
    apiKey: "test-niv-key",
    attribution: "Provider-supplied NIV notice",
  }, async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-niv-key");
    return Response.json({ verses: [{ verseNumber: 1, text: "mock licensed source text" }] });
  });

  const result = await client.getChapter({ bookId: "genesis", chapterNumber: 1 });
  assert.equal(result.status, "available");
  if (result.status === "available") {
    assert.equal(result.chapter.translation, "niv");
    assert.equal(result.chapter.verses[0]?.reference, "Genesis 1:1");
    assert.equal(result.chapter.attribution?.notice, "Provider-supplied NIV notice");
  }
});

test("NIV rate limits return a distinct recoverable error", async () => {
  const client = createNIVSourceClient({
    endpoint: "https://scripture.example/api",
    apiKey: "test-niv-key",
    attribution: "Provider-supplied NIV notice",
  }, async () => Response.json({ message: "rate limit" }, { status: 429 }));

  assert.deepEqual(await client.getChapter({ bookId: "genesis", chapterNumber: 1 }), {
    status: "error",
    reason: "rate-limited",
    message: "The configured NIV source is temporarily rate limited. Try again shortly.",
  });
});