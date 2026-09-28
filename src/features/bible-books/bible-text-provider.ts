import type { BibleLocation } from "./bible-data";
import type {
  BibleTextProvider,
  BibleTextResult,
  BibleTranslationId,
} from "./bible-translations";
import { getTranslationUnavailableState } from "./bible-translations";

export const bibleTextProvider: BibleTextProvider = {
  async getChapter(location: BibleLocation, translation: BibleTranslationId, signal?: AbortSignal) {
    const unavailable = getTranslationUnavailableState(translation);
    if (unavailable) return unavailable;

    try {
      const response = await fetch(
        `/api/bible/${translation}/${encodeURIComponent(location.bookId)}/${location.chapterNumber}`,
        { signal },
      );
      if (!response.ok) {
        return { status: "error", message: "Unable to load this Bible chapter." };
      }
      return await response.json() as BibleTextResult;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return { status: "error", message: "Unable to load this Bible chapter. Check your connection and try again." };
    }
  },
};