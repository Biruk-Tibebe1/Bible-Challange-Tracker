import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error("Usage: node scripts/import-kjv.mjs <gutenberg-text-file> <output-json-file>");
}

const bookHeadings = new Map([
  ["The First Book of Moses: Called Genesis", "genesis"],
  ["The Second Book of Moses: Called Exodus", "exodus"],
  ["The Third Book of Moses: Called Leviticus", "leviticus"],
  ["The Fourth Book of Moses: Called Numbers", "numbers"],
  ["The Fifth Book of Moses: Called Deuteronomy", "deuteronomy"],
  ["The Book of Joshua", "joshua"],
  ["The Book of Judges", "judges"],
  ["The Book of Ruth", "ruth"],
  ["The First Book of Samuel", "1-samuel"],
  ["The Second Book of Samuel", "2-samuel"],
  ["The First Book of the Kings", "1-kings"],
  ["The Second Book of the Kings", "2-kings"],
  ["The First Book of the Chronicles", "1-chronicles"],
  ["The Second Book of the Chronicles", "2-chronicles"],
  ["Ezra", "ezra"],
  ["The Book of Nehemiah", "nehemiah"],
  ["The Book of Esther", "esther"],
  ["The Book of Job", "job"],
  ["The Book of Psalms", "psalms"],
  ["The Proverbs", "proverbs"],
  ["Ecclesiastes", "ecclesiastes"],
  ["The Song of Solomon", "song-of-solomon"],
  ["The Book of the Prophet Isaiah", "isaiah"],
  ["The Book of the Prophet Jeremiah", "jeremiah"],
  ["The Lamentations of Jeremiah", "lamentations"],
  ["The Book of the Prophet Ezekiel", "ezekiel"],
  ["The Book of Daniel", "daniel"],
  ["Hosea", "hosea"],
  ["Joel", "joel"],
  ["Amos", "amos"],
  ["Obadiah", "obadiah"],
  ["Jonah", "jonah"],
  ["Micah", "micah"],
  ["Nahum", "nahum"],
  ["Habakkuk", "habakkuk"],
  ["Zephaniah", "zephaniah"],
  ["Haggai", "haggai"],
  ["Zechariah", "zechariah"],
  ["Malachi", "malachi"],
  ["The Gospel According to Saint Matthew", "matthew"],
  ["The Gospel According to Saint Mark", "mark"],
  ["The Gospel According to Saint Luke", "luke"],
  ["The Gospel According to Saint John", "john"],
  ["The Acts of the Apostles", "acts"],
  ["The Epistle of Paul the Apostle to the Romans", "romans"],
  ["The First Epistle of Paul the Apostle to the Corinthians", "1-corinthians"],
  ["The Second Epistle of Paul the Apostle to the Corinthians", "2-corinthians"],
  ["The Epistle of Paul the Apostle to the Galatians", "galatians"],
  ["The Epistle of Paul the Apostle to the Ephesians", "ephesians"],
  ["The Epistle of Paul the Apostle to the Philippians", "philippians"],
  ["The Epistle of Paul the Apostle to the Colossians", "colossians"],
  ["The First Epistle of Paul the Apostle to the Thessalonians", "1-thessalonians"],
  ["The Second Epistle of Paul the Apostle to the Thessalonians", "2-thessalonians"],
  ["The First Epistle of Paul the Apostle to Timothy", "1-timothy"],
  ["The Second Epistle of Paul the Apostle to Timothy", "2-timothy"],
  ["The Epistle of Paul the Apostle to Titus", "titus"],
  ["The Epistle of Paul the Apostle to Philemon", "philemon"],
  ["The Epistle of Paul the Apostle to the Hebrews", "hebrews"],
  ["The General Epistle of James", "james"],
  ["The First Epistle General of Peter", "1-peter"],
  ["The Second General Epistle of Peter", "2-peter"],
  ["The First Epistle General of John", "1-john"],
  ["The Second Epistle General of John", "2-john"],
  ["The Third Epistle General of John", "3-john"],
  ["The General Epistle of Jude", "jude"],
  ["The Revelation of Saint John the Divine", "revelation"],
]);

const expectedChapters = new Map([
  ["genesis", 50], ["exodus", 40], ["leviticus", 27], ["numbers", 36], ["deuteronomy", 34],
  ["joshua", 24], ["judges", 21], ["ruth", 4], ["1-samuel", 31], ["2-samuel", 24],
  ["1-kings", 22], ["2-kings", 25], ["1-chronicles", 29], ["2-chronicles", 36], ["ezra", 10],
  ["nehemiah", 13], ["esther", 10], ["job", 42], ["psalms", 150], ["proverbs", 31],
  ["ecclesiastes", 12], ["song-of-solomon", 8], ["isaiah", 66], ["jeremiah", 52],
  ["lamentations", 5], ["ezekiel", 48], ["daniel", 12], ["hosea", 14], ["joel", 3],
  ["amos", 9], ["obadiah", 1], ["jonah", 4], ["micah", 7], ["nahum", 3], ["habakkuk", 3],
  ["zephaniah", 3], ["haggai", 2], ["zechariah", 14], ["malachi", 4], ["matthew", 28],
  ["mark", 16], ["luke", 24], ["john", 21], ["acts", 28], ["romans", 16],
  ["1-corinthians", 16], ["2-corinthians", 13], ["galatians", 6], ["ephesians", 6],
  ["philippians", 4], ["colossians", 4], ["1-thessalonians", 5], ["2-thessalonians", 3],
  ["1-timothy", 6], ["2-timothy", 4], ["titus", 3], ["philemon", 1], ["hebrews", 13],
  ["james", 5], ["1-peter", 5], ["2-peter", 3], ["1-john", 5], ["2-john", 1],
  ["3-john", 1], ["jude", 1], ["revelation", 22],
]);

const source = readFileSync(resolve(sourcePath), "utf8").replace(/^\uFEFF/, "");
const lines = source.split(/\r?\n/).map((line) => line.trim()).filter((line) =>
  !line.startsWith("***") && line !== "The New Testament of the King James Bible",
);
const genesisHeading = [...lines.keys()].filter((index) => lines[index] === "The First Book of Moses: Called Genesis")[1];
if (genesisHeading === undefined) throw new Error("Could not locate the Genesis body after the table of contents.");

const rawBooks = new Map();
let currentBookId;
for (let index = genesisHeading; index < lines.length; index += 1) {
  const line = lines[index];
  const isAlternateTitle = lines[index - 2] === "Otherwise Called:";
  if (!isAlternateTitle && bookHeadings.has(line)) {
    currentBookId = bookHeadings.get(line);
    if (!rawBooks.has(currentBookId)) rawBooks.set(currentBookId, []);
  } else if (currentBookId && line) {
    rawBooks.get(currentBookId).push(line);
  }
}

const books = {};
let totalChapters = 0;
let totalVerses = 0;
for (const [bookId, chapterCount] of expectedChapters) {
  const rawText = rawBooks.get(bookId)?.join(" ");
  if (!rawText) throw new Error(`Missing source text for ${bookId}.`);

  const marker = /(?:^|\s)(\d+):(\d+)\s+/g;
  const matches = [...rawText.matchAll(marker)];
  const chapters = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const chapterNumber = Number(match[1]);
    const verseNumber = Number(match[2]);
    const contentStart = match.index + match[0].length;
    const contentEnd = index + 1 < matches.length ? matches[index + 1].index : rawText.length;
    const text = rawText.slice(contentStart, contentEnd).trim().replace(/\s+/g, " ");
    if (!chapters[chapterNumber]) chapters[chapterNumber] = [];
    chapters[chapterNumber].push({
      id: `${bookId}.${chapterNumber}.${verseNumber}`,
      verseNumber,
      text,
    });
  }

  const chapterNumbers = Object.keys(chapters).map(Number).sort((left, right) => left - right);
  if (chapterNumbers.length !== chapterCount) {
    throw new Error(`${bookId}: expected ${chapterCount} chapters, parsed ${chapterNumbers.length}.`);
  }
  chapterNumbers.forEach((number, index) => {
    if (number !== index + 1) throw new Error(`${bookId}: unexpected chapter number ${number}.`);
    const verses = chapters[number];
    verses.forEach((verse, verseIndex) => {
      if (verse.verseNumber !== verseIndex + 1 || !verse.text) {
        throw new Error(`${bookId} ${number}: invalid verse ${verse.verseNumber}.`);
      }
    });
  });

  totalChapters += chapterNumbers.length;
  totalVerses += matches.length;
  books[bookId] = { chapters };
}

if (books && Object.keys(books).length !== 66) throw new Error(`Expected 66 books, got ${Object.keys(books).length}.`);
if (totalChapters !== 1189) throw new Error(`Expected 1,189 chapters, got ${totalChapters}.`);
if (totalVerses !== 31102) throw new Error(`Expected 31,102 verses, got ${totalVerses}.`);

const result = {
  source: "Project Gutenberg eBook 10, The King James Version of the Bible (public domain in the USA)",
  sourceUrl: "https://www.gutenberg.org/files/10/10-0.txt",
  books,
};
writeFileSync(resolve(outputPath), `${JSON.stringify(result)}\n`, "utf8");
console.log(`Imported ${Object.keys(books).length} books, ${totalChapters} chapters, ${totalVerses} verses.`);