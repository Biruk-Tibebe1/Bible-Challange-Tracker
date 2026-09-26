"use client";

import { useState, type FormEvent } from "react";
import {
  BIBLE_BOOKS,
  getBibleBookById,
  getChaptersInBook,
  getGlobalChapterNumber,
} from "../../bible-books/bible-data.ts";
import { generateChallenge } from "../challenge-generator.ts";
import type { ChallengeGenerationInput, GeneratedChallenge } from "../challenge-types.ts";

interface CustomChallengeFormProps {
  onGenerated: (
    name: string,
    challenge: GeneratedChallenge,
    generation: ChallengeGenerationInput,
  ) => void | Promise<void>;
}

function ChapterSelect({
  id,
  label,
  bookId,
  value,
  onChange,
}: {
  id: string;
  label: string;
  bookId: string;
  value: number;
  onChange: (chapterNumber: number) => void;
}) {
  const chapters = getChaptersInBook(bookId);

  return (
    <label className="block text-sm text-[var(--muted)]" htmlFor={id}>
      {label}
      <select
        className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {chapters.map((chapter) => (
          <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
            Chapter {chapter.chapterNumber}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CustomChallengeForm({ onGenerated }: CustomChallengeFormProps) {
  const [name, setName] = useState("");
  const [startBookId, setStartBookId] = useState("genesis");
  const [startChapter, setStartChapter] = useState(1);
  const [endBookId, setEndBookId] = useState("genesis");
  const [endChapter, setEndChapter] = useState(10);
  const [duration, setDuration] = useState("10");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Challenge name is required.");
      return;
    }

    const startBook = getBibleBookById(startBookId);
    if (!startBook || !Number.isInteger(startChapter) || startChapter < 1 || startChapter > startBook.chapterCount) {
      setError("Select a valid starting book and chapter.");
      return;
    }

    const endBook = getBibleBookById(endBookId);
    if (!endBook || !Number.isInteger(endChapter) || endChapter < 1 || endChapter > endBook.chapterCount) {
      setError("Select a valid ending book and chapter.");
      return;
    }

    const totalDays = Number(duration);
    if (!Number.isInteger(totalDays) || totalDays <= 0) {
      setError("Duration must be greater than 0 and use a whole number of days.");
      return;
    }
    if (totalDays > 3650) {
      setError("Duration cannot exceed 3650 days.");
      return;
    }

    const startGlobalNumber = getGlobalChapterNumber(startBookId, startChapter);
    const endGlobalNumber = getGlobalChapterNumber(endBookId, endChapter);
    if (startGlobalNumber === undefined || endGlobalNumber === undefined) {
      setError("Select valid start and end Bible locations.");
      return;
    }
    if (endGlobalNumber < startGlobalNumber) {
      setError("End chapter cannot come before the starting chapter.");
      return;
    }

    setIsSaving(true);
    try {
      const generation: ChallengeGenerationInput = {
        startLocation: { bookId: startBookId, chapterNumber: startChapter },
        endLocation: { bookId: endBookId, chapterNumber: endChapter },
        totalDays,
      };
      await onGenerated(trimmedName, generateChallenge(generation), generation);
    } catch {
      setError("The challenge could not be saved. Please check the connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mt-6 max-w-3xl space-y-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm text-[var(--muted)]" htmlFor="challenge-name">Challenge name</label>
        <input
          autoComplete="off"
          className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
          id="challenge-name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <fieldset className="grid gap-4 rounded-lg border border-[var(--line)] p-4 sm:grid-cols-2 sm:p-5">
        <legend className="px-2 text-sm font-medium text-[var(--ink)]">Starting location</legend>
        <label className="block text-sm text-[var(--muted)]" htmlFor="start-book">
          Book
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
            id="start-book"
            value={startBookId}
            onChange={(event) => {
              setStartBookId(event.target.value);
              setStartChapter(1);
            }}
          >
            {BIBLE_BOOKS.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
          </select>
        </label>
        <ChapterSelect id="start-chapter" label="Chapter" bookId={startBookId} value={startChapter} onChange={setStartChapter} />
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border border-[var(--line)] p-4 sm:grid-cols-2 sm:p-5">
        <legend className="px-2 text-sm font-medium text-[var(--ink)]">Ending location</legend>
        <label className="block text-sm text-[var(--muted)]" htmlFor="end-book">
          Book
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
            id="end-book"
            value={endBookId}
            onChange={(event) => {
              setEndBookId(event.target.value);
              setEndChapter(1);
            }}
          >
            {BIBLE_BOOKS.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
          </select>
        </label>
        <ChapterSelect id="end-chapter" label="Chapter" bookId={endBookId} value={endChapter} onChange={setEndChapter} />
      </fieldset>

      <div className="max-w-sm">
        <label className="block text-sm text-[var(--muted)]" htmlFor="challenge-duration">Duration in days</label>
        <input
          className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
          id="challenge-duration"
          inputMode="numeric"
          max={3650}
          min={1}
          step={1}
          type="number"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Examples: 7, 14, 30, 40, 60, 90, 180, or 365. Maximum 3650 days.</p>
      </div>

      {error && <p className="text-sm text-[#9a3f32]" role="alert">{error}</p>}

      <button
        className="min-h-12 rounded-md bg-[var(--forest)] px-5 text-sm font-medium text-white hover:bg-[var(--forest-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)] disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving challenge…" : "Generate custom challenge"}
      </button>
    </form>
  );
}