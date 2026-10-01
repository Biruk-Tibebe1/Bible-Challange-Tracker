import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { findBibleChapter } from "@/features/bible-books/bible-data";
import { BibleReader } from "@/features/bible-books/components/bible-reader";
import { BIBLE_TRANSLATIONS } from "@/features/bible-books/bible-translations";

export const metadata: Metadata = {
  title: "Bible | Bible Challenge",
};

export default async function BiblePage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string | string[]; chapter?: string | string[]; verse?: string | string[]; translation?: string | string[] }>;
}) {
  const params = await searchParams;
  const bookId = typeof params.book === "string" ? params.book : "";
  const chapterNumber = typeof params.chapter === "string" ? Number(params.chapter) : NaN;
  const verseNumber = typeof params.verse === "string" ? Number(params.verse) : NaN;
  const translation = BIBLE_TRANSLATIONS.some((item) => item.id === params.translation)
    ? params.translation as "amharic" | "niv" | "kjv"
    : undefined;
  const initialChapter = findBibleChapter(bookId, chapterNumber);

  return (
    <AppShell>
      <BibleReader
        initialLocation={initialChapter}
        initialVerseNumber={Number.isSafeInteger(verseNumber) && verseNumber > 0 ? verseNumber : undefined}
        initialTranslation={translation}
      />
    </AppShell>
  );
}