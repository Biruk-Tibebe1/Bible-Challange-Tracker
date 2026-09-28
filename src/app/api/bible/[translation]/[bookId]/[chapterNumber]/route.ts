import { BIBLE_BOOKS } from "@/features/bible-books/bible-data";
import type { BibleChapterText } from "@/features/bible-books/bible-translations";
import kjvDataset from "@/features/bible-books/data/kjv.json";

interface RouteContext {
  params: Promise<{ translation: string; bookId: string; chapterNumber: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { translation, bookId, chapterNumber: rawChapterNumber } = await params;
  const chapterNumber = Number(rawChapterNumber);
  const book = BIBLE_BOOKS.find((item) => item.id === bookId);
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