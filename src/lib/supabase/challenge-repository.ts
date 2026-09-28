import {
  findBibleChapter,
  getBibleBookById,
} from "@/features/bible-books/bible-data";
import type { BibleLocation } from "@/features/bible-books/bible-data";
import type { GeneratedChallenge, EthiopianDate, EthiopianMonth } from "@/features/challenges/challenge-types";
import { createSupabaseBrowserClient } from "./client";
import type { Database, Json } from "./database.types";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
type ChallengeDayRow = Database["public"]["Tables"]["challenge_days"]["Row"];

export interface SavedChallengeSummary {
  id: string;
  name: string;
  challengeType: "predefined" | "custom";
  startLocation: BibleLocation;
  endLocation: BibleLocation;
  totalDays: number;
  completedDays: number;
}

export interface LoadedSavedChallenge extends SavedChallengeSummary {
  schedule: GeneratedChallenge;
  startDate?: EthiopianDate;
  endDate?: EthiopianDate;
}

export class ChallengePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChallengePersistenceError";
  }
}

function getClient() {
  const client = createSupabaseBrowserClient();
  if (!client) throw new ChallengePersistenceError("Cloud saving is not configured yet.");
  return client;
}

function toJsonDays(
  challenge: GeneratedChallenge,
  startDate?: EthiopianDate,
  endDate?: EthiopianDate,
): Json {
  return challenge.days.map((day) => {
    const date = day.dayNumber === 1
      ? startDate
      : day.dayNumber === challenge.totalDays
        ? endDate
        : undefined;

    return {
      day_number: day.dayNumber,
      chapters: day.chapters.map((chapter) => ({
        bookId: chapter.bookId,
        chapterNumber: chapter.chapterNumber,
      })),
      ethiopian_year: date?.year ?? null,
      ethiopian_month: date?.month ?? null,
      ethiopian_day: date?.day ?? null,
    };
  }) as Json;
}

async function persistChallenge(
  name: string,
  challengeType: "predefined" | "custom",
  generation: {
    startLocation: BibleLocation;
    endLocation: BibleLocation;
  },
  schedule: GeneratedChallenge,
  options: { challengeKey?: string; startDate?: EthiopianDate; endDate?: EthiopianDate } = {},
): Promise<string> {
  const client = getClient();
  const { data, error } = await client.rpc("create_challenge_with_days", {
    p_name: name,
    p_challenge_type: challengeType,
    p_start_book_id: generation.startLocation.bookId,
    p_start_chapter: generation.startLocation.chapterNumber,
    p_end_book_id: generation.endLocation.bookId,
    p_end_chapter: generation.endLocation.chapterNumber,
    p_total_days: schedule.totalDays,
    p_days: toJsonDays(schedule, options.startDate, options.endDate),
    p_challenge_key: options.challengeKey ?? null,
  });

  if (error || !data) {
    throw new ChallengePersistenceError("Unable to save this challenge. Please try again.");
  }
  return data;
}

export function ensurePredefinedChallenge(
  generation: { startLocation: BibleLocation; endLocation: BibleLocation },
  schedule: GeneratedChallenge,
  name: string,
  dates: { startDate: EthiopianDate; endDate: EthiopianDate },
): Promise<string> {
  return persistChallenge(name, "predefined", generation, schedule, {
    challengeKey: "full-bible-2019",
    ...dates,
  });
}

export function saveCustomChallenge(
  name: string,
  generation: { startLocation: BibleLocation; endLocation: BibleLocation },
  schedule: GeneratedChallenge,
): Promise<string> {
  return persistChallenge(name, "custom", generation, schedule);
}

function mapChallengeRow(row: ChallengeRow, completedDays: number): SavedChallengeSummary {
  if (!getBibleBookById(row.start_book_id) || !getBibleBookById(row.end_book_id)) {
    throw new ChallengePersistenceError("A saved challenge references an unavailable Bible book.");
  }

  return {
    id: row.id,
    name: row.name,
    challengeType: row.challenge_type,
    startLocation: { bookId: row.start_book_id, chapterNumber: row.start_chapter },
    endLocation: { bookId: row.end_book_id, chapterNumber: row.end_chapter },
    totalDays: row.total_days,
    completedDays,
  };
}

export async function listMyChallenges(): Promise<SavedChallengeSummary[]> {
  const client = getClient();
  const { data: challengeRows, error: challengeError } = await client
    .from("challenges")
    .select("id,owner_id,name,challenge_type,start_book_id,start_chapter,end_book_id,end_chapter,total_days,challenge_key,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (challengeError) throw new ChallengePersistenceError("Unable to load your saved challenges.");
  if (!challengeRows.length) return [];

  const challengeIds = challengeRows.map((challenge) => challenge.id);
  const { data: completedProgress, error: progressError } = await client
    .from("user_challenge_progress")
    .select("challenge_id,day_number")
    .eq("completed", true)
    .in("challenge_id", challengeIds);

  if (progressError) throw new ChallengePersistenceError("Unable to load saved challenge progress.");

  const counts = new Map<string, number>();
  for (const record of completedProgress) {
    counts.set(record.challenge_id, (counts.get(record.challenge_id) ?? 0) + 1);
  }

  return challengeRows.map((challenge) => mapChallengeRow(challenge, counts.get(challenge.id) ?? 0));
}

export async function loadMyCompletedAtDates(): Promise<string[]> {
  const client = getClient();
  const { data, error } = await client
    .from("user_challenge_progress")
    .select("completed_at")
    .eq("completed", true);

  if (error) throw new ChallengePersistenceError("Unable to load your reading activity.");
  return data.flatMap((record) => record.completed_at ? [record.completed_at] : []);
}

function parseEthiopianDate(row: ChallengeDayRow): EthiopianDate | undefined {
  if (row.ethiopian_year === null && row.ethiopian_month === null && row.ethiopian_day === null) {
    return undefined;
  }

  const months: readonly EthiopianMonth[] = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
    "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
  ];
  if (
    row.ethiopian_year === null ||
    !months.includes(row.ethiopian_month as EthiopianMonth) ||
    row.ethiopian_day === null
  ) {
    throw new ChallengePersistenceError("A saved challenge contains an invalid Ethiopian date.");
  }

  return {
    year: row.ethiopian_year,
    month: row.ethiopian_month as EthiopianMonth,
    day: row.ethiopian_day,
  };
}

function reconstructSchedule(
  challenge: ChallengeRow,
  dayRows: readonly ChallengeDayRow[],
): { schedule: GeneratedChallenge; startDate?: EthiopianDate; endDate?: EthiopianDate } {
  if (dayRows.length !== challenge.total_days) {
    throw new ChallengePersistenceError("Saved challenge schedule is incomplete.");
  }

  const orderedRows = [...dayRows].sort((left, right) => left.day_number - right.day_number);
  let previousGlobalChapter = 0;
  const seenGlobalChapters = new Set<number>();
  let startDate: EthiopianDate | undefined;
  let endDate: EthiopianDate | undefined;

  const days = orderedRows.map((row, index) => {
    if (row.day_number !== index + 1 || !Array.isArray(row.chapters)) {
      throw new ChallengePersistenceError("Saved challenge schedule has invalid day data.");
    }

    if (row.day_number === 1) startDate = parseEthiopianDate(row);
    if (row.day_number === challenge.total_days) endDate = parseEthiopianDate(row);

    const chapters = row.chapters.map((value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new ChallengePersistenceError("Saved challenge contains invalid chapter data.");
      }
      const bookId = value.bookId;
      const chapterNumber = value.chapterNumber;
      if (typeof bookId !== "string" || typeof chapterNumber !== "number") {
        throw new ChallengePersistenceError("Saved challenge contains invalid chapter references.");
      }
      const chapter = findBibleChapter(bookId, chapterNumber);
      if (!chapter || chapter.globalChapterNumber <= previousGlobalChapter || seenGlobalChapters.has(chapter.globalChapterNumber)) {
        throw new ChallengePersistenceError("Saved challenge chapter order is invalid.");
      }
      previousGlobalChapter = chapter.globalChapterNumber;
      seenGlobalChapters.add(chapter.globalChapterNumber);
      return chapter;
    });

    return { dayNumber: row.day_number, chapters, chapterCount: chapters.length };
  });

  const allChapters = days.flatMap((day) => day.chapters);
  if (
    allChapters[0]?.bookId !== challenge.start_book_id ||
    allChapters[0]?.chapterNumber !== challenge.start_chapter ||
    allChapters.at(-1)?.bookId !== challenge.end_book_id ||
    allChapters.at(-1)?.chapterNumber !== challenge.end_chapter
  ) {
    throw new ChallengePersistenceError("Saved challenge does not match its start and end locations.");
  }
  const firstGlobalChapter = allChapters[0]?.globalChapterNumber;
  allChapters.forEach((chapter, index) => {
    if (chapter.globalChapterNumber !== firstGlobalChapter! + index) {
      throw new ChallengePersistenceError("Saved challenge is missing one or more Bible chapters.");
    }
  });

  return {
    schedule: { totalDays: challenge.total_days, totalChapterCount: allChapters.length, days },
    startDate,
    endDate,
  };
}

export async function loadSavedChallenge(challengeId: string): Promise<LoadedSavedChallenge> {
  const client = getClient();
  const { data: challenge, error: challengeError } = await client
    .from("challenges")
    .select("id,owner_id,name,challenge_type,start_book_id,start_chapter,end_book_id,end_chapter,total_days,challenge_key,created_at,updated_at")
    .eq("id", challengeId)
    .single();

  if (challengeError || !challenge) {
    throw new ChallengePersistenceError("Unable to open this saved challenge.");
  }

  const { data: dayRows, error: daysError } = await client
    .from("challenge_days")
    .select("id,challenge_id,day_number,chapters,ethiopian_year,ethiopian_month,ethiopian_day,created_at")
    .eq("challenge_id", challengeId)
    .order("day_number");
  if (daysError) throw new ChallengePersistenceError("Unable to load this challenge schedule.");

  const reconstructed = reconstructSchedule(challenge, dayRows);
  const summary = mapChallengeRow(challenge, 0);
  return { ...summary, ...reconstructed };
}

export async function loadCompletedDayNumbers(challengeId: string): Promise<number[]> {
  const client = getClient();
  const { data, error } = await client
    .from("user_challenge_progress")
    .select("day_number")
    .eq("challenge_id", challengeId)
    .eq("completed", true);

  if (error) throw new ChallengePersistenceError("Unable to load your reading progress.");
  return data.map((record) => record.day_number);
}

export async function saveDayCompletion(
  challengeId: string,
  dayNumber: number,
  completed: boolean,
): Promise<void> {
  const client = getClient();
  const { error } = await client.from("user_challenge_progress").upsert({
    challenge_id: challengeId,
    day_number: dayNumber,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  }, { onConflict: "user_id,challenge_id,day_number", defaultToNull: false });

  if (error) throw new ChallengePersistenceError("Unable to save your reading progress. Please try again.");
}