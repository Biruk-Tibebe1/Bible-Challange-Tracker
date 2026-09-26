export type Testament = "Old Testament" | "New Testament";

export interface BibleBook {
  id: string;
  bookNumber: number;
  name: string;
  testament: Testament;
  chapterCount: number;
}

export interface BibleChapter {
  bookId: string;
  bookNumber: number;
  bookName: string;
  testament: Testament;
  chapterNumber: number;
  globalChapterNumber: number;
}

export interface BibleLocation {
  bookId: string;
  chapterNumber: number;
}

type BibleBookDefinition = Omit<BibleBook, "bookNumber">;

const bookDefinitions: readonly BibleBookDefinition[] = [
  { id: "genesis", name: "Genesis", testament: "Old Testament", chapterCount: 50 },
  { id: "exodus", name: "Exodus", testament: "Old Testament", chapterCount: 40 },
  { id: "leviticus", name: "Leviticus", testament: "Old Testament", chapterCount: 27 },
  { id: "numbers", name: "Numbers", testament: "Old Testament", chapterCount: 36 },
  { id: "deuteronomy", name: "Deuteronomy", testament: "Old Testament", chapterCount: 34 },
  { id: "joshua", name: "Joshua", testament: "Old Testament", chapterCount: 24 },
  { id: "judges", name: "Judges", testament: "Old Testament", chapterCount: 21 },
  { id: "ruth", name: "Ruth", testament: "Old Testament", chapterCount: 4 },
  { id: "1-samuel", name: "1 Samuel", testament: "Old Testament", chapterCount: 31 },
  { id: "2-samuel", name: "2 Samuel", testament: "Old Testament", chapterCount: 24 },
  { id: "1-kings", name: "1 Kings", testament: "Old Testament", chapterCount: 22 },
  { id: "2-kings", name: "2 Kings", testament: "Old Testament", chapterCount: 25 },
  { id: "1-chronicles", name: "1 Chronicles", testament: "Old Testament", chapterCount: 29 },
  { id: "2-chronicles", name: "2 Chronicles", testament: "Old Testament", chapterCount: 36 },
  { id: "ezra", name: "Ezra", testament: "Old Testament", chapterCount: 10 },
  { id: "nehemiah", name: "Nehemiah", testament: "Old Testament", chapterCount: 13 },
  { id: "esther", name: "Esther", testament: "Old Testament", chapterCount: 10 },
  { id: "job", name: "Job", testament: "Old Testament", chapterCount: 42 },
  { id: "psalms", name: "Psalms", testament: "Old Testament", chapterCount: 150 },
  { id: "proverbs", name: "Proverbs", testament: "Old Testament", chapterCount: 31 },
  { id: "ecclesiastes", name: "Ecclesiastes", testament: "Old Testament", chapterCount: 12 },
  { id: "song-of-solomon", name: "Song of Solomon", testament: "Old Testament", chapterCount: 8 },
  { id: "isaiah", name: "Isaiah", testament: "Old Testament", chapterCount: 66 },
  { id: "jeremiah", name: "Jeremiah", testament: "Old Testament", chapterCount: 52 },
  { id: "lamentations", name: "Lamentations", testament: "Old Testament", chapterCount: 5 },
  { id: "ezekiel", name: "Ezekiel", testament: "Old Testament", chapterCount: 48 },
  { id: "daniel", name: "Daniel", testament: "Old Testament", chapterCount: 12 },
  { id: "hosea", name: "Hosea", testament: "Old Testament", chapterCount: 14 },
  { id: "joel", name: "Joel", testament: "Old Testament", chapterCount: 3 },
  { id: "amos", name: "Amos", testament: "Old Testament", chapterCount: 9 },
  { id: "obadiah", name: "Obadiah", testament: "Old Testament", chapterCount: 1 },
  { id: "jonah", name: "Jonah", testament: "Old Testament", chapterCount: 4 },
  { id: "micah", name: "Micah", testament: "Old Testament", chapterCount: 7 },
  { id: "nahum", name: "Nahum", testament: "Old Testament", chapterCount: 3 },
  { id: "habakkuk", name: "Habakkuk", testament: "Old Testament", chapterCount: 3 },
  { id: "zephaniah", name: "Zephaniah", testament: "Old Testament", chapterCount: 3 },
  { id: "haggai", name: "Haggai", testament: "Old Testament", chapterCount: 2 },
  { id: "zechariah", name: "Zechariah", testament: "Old Testament", chapterCount: 14 },
  { id: "malachi", name: "Malachi", testament: "Old Testament", chapterCount: 4 },
  { id: "matthew", name: "Matthew", testament: "New Testament", chapterCount: 28 },
  { id: "mark", name: "Mark", testament: "New Testament", chapterCount: 16 },
  { id: "luke", name: "Luke", testament: "New Testament", chapterCount: 24 },
  { id: "john", name: "John", testament: "New Testament", chapterCount: 21 },
  { id: "acts", name: "Acts", testament: "New Testament", chapterCount: 28 },
  { id: "romans", name: "Romans", testament: "New Testament", chapterCount: 16 },
  { id: "1-corinthians", name: "1 Corinthians", testament: "New Testament", chapterCount: 16 },
  { id: "2-corinthians", name: "2 Corinthians", testament: "New Testament", chapterCount: 13 },
  { id: "galatians", name: "Galatians", testament: "New Testament", chapterCount: 6 },
  { id: "ephesians", name: "Ephesians", testament: "New Testament", chapterCount: 6 },
  { id: "philippians", name: "Philippians", testament: "New Testament", chapterCount: 4 },
  { id: "colossians", name: "Colossians", testament: "New Testament", chapterCount: 4 },
  { id: "1-thessalonians", name: "1 Thessalonians", testament: "New Testament", chapterCount: 5 },
  { id: "2-thessalonians", name: "2 Thessalonians", testament: "New Testament", chapterCount: 3 },
  { id: "1-timothy", name: "1 Timothy", testament: "New Testament", chapterCount: 6 },
  { id: "2-timothy", name: "2 Timothy", testament: "New Testament", chapterCount: 4 },
  { id: "titus", name: "Titus", testament: "New Testament", chapterCount: 3 },
  { id: "philemon", name: "Philemon", testament: "New Testament", chapterCount: 1 },
  { id: "hebrews", name: "Hebrews", testament: "New Testament", chapterCount: 13 },
  { id: "james", name: "James", testament: "New Testament", chapterCount: 5 },
  { id: "1-peter", name: "1 Peter", testament: "New Testament", chapterCount: 5 },
  { id: "2-peter", name: "2 Peter", testament: "New Testament", chapterCount: 3 },
  { id: "1-john", name: "1 John", testament: "New Testament", chapterCount: 5 },
  { id: "2-john", name: "2 John", testament: "New Testament", chapterCount: 1 },
  { id: "3-john", name: "3 John", testament: "New Testament", chapterCount: 1 },
  { id: "jude", name: "Jude", testament: "New Testament", chapterCount: 1 },
  { id: "revelation", name: "Revelation", testament: "New Testament", chapterCount: 22 },
];

export const BIBLE_BOOKS: readonly BibleBook[] = bookDefinitions.map((book, index) => ({
  ...book,
  bookNumber: index + 1,
}));

let nextGlobalChapterNumber = 1;

export const BIBLE_CHAPTERS: readonly BibleChapter[] = BIBLE_BOOKS.flatMap((book) =>
  Array.from({ length: book.chapterCount }, (_, index) => ({
    bookId: book.id,
    bookNumber: book.bookNumber,
    bookName: book.name,
    testament: book.testament,
    chapterNumber: index + 1,
    globalChapterNumber: nextGlobalChapterNumber++,
  })),
);

const booksById = new Map(BIBLE_BOOKS.map((book) => [book.id, book]));
const booksByNumber = new Map(BIBLE_BOOKS.map((book) => [book.bookNumber, book]));
const chaptersByGlobalNumber = new Map(
  BIBLE_CHAPTERS.map((chapter) => [chapter.globalChapterNumber, chapter]),
);
const chaptersByBookAndNumber = new Map(
  BIBLE_CHAPTERS.map((chapter) => [`${chapter.bookId}:${chapter.chapterNumber}`, chapter]),
);
const chaptersByBook = new Map(
  BIBLE_BOOKS.map((book) => [
    book.id,
    BIBLE_CHAPTERS.filter((chapter) => chapter.bookId === book.id),
  ]),
);

export function getBibleBookById(bookId: string): BibleBook | undefined {
  return booksById.get(bookId);
}

export function getBibleBookByNumber(bookNumber: number): BibleBook | undefined {
  return booksByNumber.get(bookNumber);
}

export function getBibleChapter(globalChapterNumber: number): BibleChapter | undefined {
  return chaptersByGlobalNumber.get(globalChapterNumber);
}

export function getAllBibleChapters(): readonly BibleChapter[] {
  return BIBLE_CHAPTERS;
}

export function getChaptersInBook(bookId: string): readonly BibleChapter[] {
  return chaptersByBook.get(bookId) ?? [];
}

export function findBibleChapter(bookId: string, chapterNumber: number): BibleChapter | undefined {
  return chaptersByBookAndNumber.get(`${bookId}:${chapterNumber}`);
}

export function getGlobalChapterNumber(bookId: string, chapterNumber: number): number | undefined {
  return findBibleChapter(bookId, chapterNumber)?.globalChapterNumber;
}

export function getBibleChapterRange(
  start: BibleLocation,
  end: BibleLocation,
): readonly BibleChapter[] {
  const startGlobalNumber = getGlobalChapterNumber(start.bookId, start.chapterNumber);
  const endGlobalNumber = getGlobalChapterNumber(end.bookId, end.chapterNumber);

  if (startGlobalNumber === undefined) {
    throw new RangeError(`Invalid start Bible location: ${start.bookId} ${start.chapterNumber}`);
  }
  if (endGlobalNumber === undefined) {
    throw new RangeError(`Invalid end Bible location: ${end.bookId} ${end.chapterNumber}`);
  }
  if (startGlobalNumber > endGlobalNumber) {
    throw new RangeError("Start Bible location must not come after end Bible location.");
  }

  return BIBLE_CHAPTERS.slice(startGlobalNumber - 1, endGlobalNumber);
}

export function calculateChapterCountBetween(start: BibleLocation, end: BibleLocation): number {
  return getBibleChapterRange(start, end).length;
}

export function validateBibleDataset(): void {
  const errors: string[] = [];
  const oldTestamentCount = BIBLE_BOOKS.filter((book) => book.testament === "Old Testament").length;
  const newTestamentCount = BIBLE_BOOKS.filter((book) => book.testament === "New Testament").length;
  const uniqueBookIds = new Set(BIBLE_BOOKS.map((book) => book.id));
  const uniqueGlobalNumbers = new Set(BIBLE_CHAPTERS.map((chapter) => chapter.globalChapterNumber));

  if (BIBLE_BOOKS.length !== 66) errors.push(`Expected 66 books; found ${BIBLE_BOOKS.length}.`);
  if (oldTestamentCount !== 39) errors.push(`Expected 39 Old Testament books; found ${oldTestamentCount}.`);
  if (newTestamentCount !== 27) errors.push(`Expected 27 New Testament books; found ${newTestamentCount}.`);
  if (BIBLE_CHAPTERS.length !== 1189) errors.push(`Expected 1189 chapters; found ${BIBLE_CHAPTERS.length}.`);
  if (uniqueBookIds.size !== BIBLE_BOOKS.length) errors.push("Book IDs must be unique.");
  if (uniqueGlobalNumbers.size !== BIBLE_CHAPTERS.length) errors.push("Global chapter numbers must be unique.");

  BIBLE_BOOKS.forEach((book, index) => {
    if (book.bookNumber !== index + 1) {
      errors.push(`Expected book number ${index + 1} at index ${index}; found ${book.bookNumber}.`);
    }
    if (book.chapterCount <= 0) errors.push(`${book.name} must have at least one chapter.`);
  });

  BIBLE_CHAPTERS.forEach((chapter, index) => {
    const expectedNumber = index + 1;
    if (chapter.globalChapterNumber !== expectedNumber) {
      errors.push(`Expected global chapter number ${expectedNumber}; found ${chapter.globalChapterNumber}.`);
    }
  });

  const expectedReferences: readonly [string, number, number][] = [
    ["genesis", 1, 1],
    ["exodus", 1, 51],
    ["matthew", 1, 930],
    ["revelation", 1, 1168],
    ["revelation", 22, 1189],
  ];

  for (const [bookId, chapterNumber, expectedGlobalNumber] of expectedReferences) {
    const actualGlobalNumber = getGlobalChapterNumber(bookId, chapterNumber);
    if (actualGlobalNumber !== expectedGlobalNumber) {
      errors.push(
        `Expected ${bookId} ${chapterNumber} to be global chapter ${expectedGlobalNumber}; found ${actualGlobalNumber ?? "missing"}.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Bible dataset validation failed:\n- ${errors.join("\n- ")}`);
  }
}