import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { findBibleChapter } from "@/features/bible-books/bible-data";
import { BibleReader } from "@/features/bible-books/components/bible-reader";

export const metadata: Metadata = {
  title: "Bible | Bible Challenge",
};

export default async function BiblePage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string | string[]; chapter?: string | string[] }>;
}) {
  const params = await searchParams;
  const bookId = typeof params.book === "string" ? params.book : "";
  const chapterNumber = typeof params.chapter === "string" ? Number(params.chapter) : NaN;
  const initialChapter = findBibleChapter(bookId, chapterNumber);

  return (
    <AppShell>
      <BibleReader initialLocation={initialChapter} />
    </AppShell>
  );
}