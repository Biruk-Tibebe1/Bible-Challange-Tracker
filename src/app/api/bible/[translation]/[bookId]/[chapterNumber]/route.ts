import { BIBLE_BOOKS, findBibleChapter } from "@/features/bible-books/bible-data";
import { createAmharicSourceClient, getAmharicSourceConfig } from "@/features/bible-books/amharic-source";
import type { BibleChapterText } from "@/features/bible-books/bible-translations";
import kjvDataset from "@/features/bible-books/data/kjv.json";

interface RouteContext {
  params: Promise<{ translation: string; bookId: string; chapterNumber: string }>;
}

function resultStatus(result: { status: string; reason?: string }): number {
  if (result.status === "available") return 200;
  if (result.status === "unavailable") return result.reason === "chapter-not-available" ? 404 : 503;
  return 502;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { translation, bookId, chapterNumber: rawChapterNumber } = await params;
  const chapterNumber = Number(rawChapterNumber);
  const book = BIBLE_BOOKS.find((item) => item.id === bookId);

  if (translation === "amharic") {
    if (!book || !Number.isInteger(chapterNumber) || !findBibleChapter(bookId, chapterNumber)) {
      return Response.json({ status: "unavailable", reason: "chapter-not-available", message: "This Amharic chapter is not available." }, { status: 404 });
    }
    const client = createAmharicSourceClient(getAmharicSourceConfig());
    const verseValue = new URL(request.url).searchParams.get("verse");
    if (verseValue !== null) {
      const verseNumber = Number(verseValue);
      if (!Number.isSafeInteger(verseNumber) || verseNumber < 1) {
        return Response.json({ status: "error", message: "Bible verse not found." }, { status: 400 });
      }
      const result = await client.getVerse({ bookId, chapterNumber }, verseNumber, request.signal);
      return Response.json(result, { status: resultStatus(result) });
    }
    const result = await client.getChapter({ bookId, chapterNumber }, request.signal);
    return Response.json(result, { status: resultStatus(result) });
  }

  if (
    translation !== "kjv" ||
    !book ||
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > book.chapterCount
  ) {
    return Response.json({ status: "error", message: "Bible chapter not found." }, { status: 404 });
  }

  const verses = kjvDataset.books[bookId as keyof typeof kjvDataset.books]?.chapters[
    String(chapterNumber) as keyof (typeof kjvDataset.books)[keyof typeof kjvDataset.books]["chapters"]
  ];
  if (!verses?.length) {
    return Response.json({ status: "error", message: "Bible chapter not found." }, { status: 404 });
  }

  const chapter: BibleChapterText = {
    location: { bookId, chapterNumber },
    translation: "kjv",
    verses,
  };
  return Response.json({ status: "available", chapter });
}