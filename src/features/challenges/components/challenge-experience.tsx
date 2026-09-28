"use client";

import { useEffect, useRef, useState } from "react";
import { FULL_BIBLE_CHALLENGE, FULL_BIBLE_CHALLENGE_CONFIG } from "../predefined-challenge.ts";
import type { ChallengeGenerationInput, GeneratedChallenge } from "../challenge-types.ts";
import { useChallengeProgress } from "../../progress/use-challenge-progress";
import { createProgressFromCompletedDays, isDayComplete } from "../../progress/progress-model.ts";
import { AuthEntryPoint } from "../../authentication/components/auth-entry-point";
import { useAuth } from "../../authentication/auth-provider";
import { ChallengeScheduleView } from "./challenge-schedule-view";
import { CustomChallengeForm } from "./custom-challenge-form";
import { getBibleBookById } from "../../bible-books/bible-data.ts";
import {
  ensurePredefinedChallenge,
  listMyChallenges,
  loadCompletedDayNumbers,
  loadSavedChallenge,
  saveCustomChallenge,
  saveDayCompletion,
} from "@/lib/supabase/challenge-repository";
import type { LoadedSavedChallenge, SavedChallengeSummary } from "@/lib/supabase/challenge-repository";

type ChallengeView = "full-bible" | "custom";

interface ActiveChallenge {
  id: string;
  name: string;
  schedule: GeneratedChallenge;
  generation: ChallengeGenerationInput;
  challengeType: "predefined" | "custom";
  persisted: boolean;
  startDate?: typeof FULL_BIBLE_CHALLENGE_CONFIG.startDate;
  endDate?: typeof FULL_BIBLE_CHALLENGE_CONFIG.endDate;
}

const PREDEFINED_CHALLENGE: ActiveChallenge = {
  id: "full-bible-2019",
  name: "Full Bible Challenge · 2019 E.C.",
  schedule: FULL_BIBLE_CHALLENGE,
  generation: FULL_BIBLE_CHALLENGE_CONFIG.generation,
  challengeType: "predefined",
  persisted: false,
  startDate: FULL_BIBLE_CHALLENGE_CONFIG.startDate,
  endDate: FULL_BIBLE_CHALLENGE_CONFIG.endDate,
};

export function ChallengeExperience() {
  const [view, setView] = useState<ChallengeView>("full-bible");
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedChallenge, setSelectedChallenge] = useState<ActiveChallenge>(PREDEFINED_CHALLENGE);
  const [predefinedCloudId, setPredefinedCloudId] = useState<string | null>(null);
  const [savedChallenges, setSavedChallenges] = useState<SavedChallengeSummary[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const [isOpeningChallenge, setIsOpeningChallenge] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{
    challengeId: string;
    loading: boolean;
    savingDay: number | null;
    error: string;
    notice: string;
  }>({ challengeId: "", loading: false, savingDay: null, error: "", notice: "" });
  const [challengeError, setChallengeError] = useState("");
  const nextCustomChallengeNumber = useRef(0);
  const progressState = useChallengeProgress();
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const isAuthenticated = user !== null;
  const authUserId = user?.id;
  const { replaceProgress } = progressState;

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated || !isConfigured) {
      setSavedChallenges([]);
      setIsLoadingChallenges(false);
      return;
    }

    let cancelled = false;
    setIsLoadingChallenges(true);
    setChallengeError("");

    void (async () => {
      try {
        const challengeId = await ensurePredefinedChallenge(
          FULL_BIBLE_CHALLENGE_CONFIG.generation,
          FULL_BIBLE_CHALLENGE,
          PREDEFINED_CHALLENGE.name,
          {
            startDate: FULL_BIBLE_CHALLENGE_CONFIG.startDate,
            endDate: FULL_BIBLE_CHALLENGE_CONFIG.endDate,
          },
        );
        if (!cancelled) {
          setPredefinedCloudId(challengeId);
          setSelectedChallenge((current) => current.challengeType === "predefined"
            ? { ...PREDEFINED_CHALLENGE, id: challengeId, persisted: true }
            : current);
        }
      } catch {
        if (!cancelled) {
          setChallengeError("Cloud saving is unavailable. Reading progress will not be saved until the connection is restored.");
        }
      }

      try {
        const challenges = await listMyChallenges();
        if (!cancelled) setSavedChallenges(challenges);
      } catch {
        if (!cancelled) setChallengeError("Unable to load your saved challenges. Please try again later.");
      } finally {
        if (!cancelled) setIsLoadingChallenges(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isConfigured, isAuthenticated, authUserId]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && selectedChallenge.persisted) {
      setSelectedChallenge(PREDEFINED_CHALLENGE);
      setSelectedDay(1);
    }
  }, [isAuthLoading, isAuthenticated, selectedChallenge.persisted]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !selectedChallenge.persisted) {
      setCloudStatus({ challengeId: selectedChallenge.id, loading: false, savingDay: null, error: "", notice: "" });
      return;
    }

    let cancelled = false;
    setCloudStatus({ challengeId: selectedChallenge.id, loading: true, savingDay: null, error: "", notice: "" });
    void loadCompletedDayNumbers(selectedChallenge.id).then((completedDays) => {
      if (cancelled) return;
      replaceProgress(createProgressFromCompletedDays(
        selectedChallenge.id,
        selectedChallenge.schedule.totalDays,
        completedDays,
      ));
      setCloudStatus({ challengeId: selectedChallenge.id, loading: false, savingDay: null, error: "", notice: "" });
    }).catch(() => {
      if (!cancelled) {
        setCloudStatus({
          challengeId: selectedChallenge.id,
          loading: false,
          savingDay: null,
          error: "Unable to load your saved progress. Changes will not be marked as saved.",
          notice: "",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isAuthenticated, authUserId, selectedChallenge.id, selectedChallenge.persisted, selectedChallenge.schedule.totalDays, replaceProgress]);

  const currentProgress = progressState.getProgress(selectedChallenge.id, selectedChallenge.schedule.totalDays);
  const currentCloudStatus = cloudStatus.challengeId === selectedChallenge.id
    ? cloudStatus
    : {
      challengeId: selectedChallenge.id,
      loading: Boolean(user) && selectedChallenge.persisted,
      savingDay: null,
      error: user && !selectedChallenge.persisted
        ? "This challenge is not linked to cloud storage. Progress has not been saved."
        : "",
      notice: "",
    };

  async function handleDayCompletionToggle(dayNumber: number): Promise<void> {
    if (isAuthLoading || currentCloudStatus.loading || currentCloudStatus.savingDay !== null) return;

    if (!user) {
      progressState.toggleDayCompletion(selectedChallenge.id, selectedChallenge.schedule.totalDays, dayNumber);
      return;
    }

    if (!selectedChallenge.persisted || currentCloudStatus.error) {
      setCloudStatus({
        ...currentCloudStatus,
        error: "Progress was not saved. Restore the cloud connection and reopen this challenge to try again.",
      });
      return;
    }

    const willBeComplete = !isDayComplete(currentProgress, dayNumber);
    setCloudStatus({ ...currentCloudStatus, savingDay: dayNumber, error: "", notice: "" });
    try {
      await saveDayCompletion(selectedChallenge.id, dayNumber, willBeComplete);
      progressState.toggleDayCompletion(selectedChallenge.id, selectedChallenge.schedule.totalDays, dayNumber);
      setSavedChallenges((current) => current.map((challenge) => challenge.id === selectedChallenge.id
        ? {
          ...challenge,
          completedDays: Math.max(0, Math.min(challenge.totalDays, challenge.completedDays + (willBeComplete ? 1 : -1))),
        }
        : challenge));
      setCloudStatus({ ...currentCloudStatus, savingDay: null, error: "", notice: "Progress saved." });
    } catch {
      setCloudStatus({
        ...currentCloudStatus,
        savingDay: null,
        error: "Unable to save progress. Your completion state was not changed.",
        notice: "",
      });
    }
  }

  async function openSavedChallenge(summary: SavedChallengeSummary): Promise<void> {
    setIsOpeningChallenge(true);
    setChallengeError("");
    try {
      const saved: LoadedSavedChallenge = await loadSavedChallenge(summary.id);
      setSelectedChallenge({
        id: saved.id,
        name: saved.name,
        schedule: saved.schedule,
        generation: {
          startLocation: saved.startLocation,
          endLocation: saved.endLocation,
          totalDays: saved.totalDays,
        },
        challengeType: saved.challengeType,
        persisted: true,
        startDate: saved.startDate,
        endDate: saved.endDate,
      });
      setSelectedDay(1);
      setView(saved.challengeType === "predefined" ? "full-bible" : "custom");
    } catch {
      setChallengeError("Unable to open this saved challenge. Please try again.");
    } finally {
      setIsOpeningChallenge(false);
    }
  }

  function renderSchedule(
    challenge: ActiveChallenge,
  ) {
    const progress = progressState.getProgress(challenge.id, challenge.schedule.totalDays);

    return (
      <ChallengeScheduleView
        title={challenge.name}
        challenge={challenge.schedule}
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        startDate={challenge.startDate}
        endDate={challenge.endDate}
        progress={progress}
        onToggleDayCompletion={handleDayCompletionToggle}
        isProgressLoading={currentCloudStatus.loading}
        isSavingDay={currentCloudStatus.savingDay === selectedDay}
        progressError={currentCloudStatus.error}
        progressNotice={currentCloudStatus.notice}
        canToggleCompletion={!isAuthLoading && !currentCloudStatus.loading && !currentCloudStatus.error && (!user || selectedChallenge.persisted)}
      />
    );
  }

  async function handleCustomChallengeGenerated(
    name: string,
    schedule: GeneratedChallenge,
    generation: ChallengeGenerationInput,
  ): Promise<void> {
    setChallengeError("");
    nextCustomChallengeNumber.current += 1;

    if (user) {
      const challengeId = await saveCustomChallenge(name, generation, schedule);
      const challenge: ActiveChallenge = {
        id: challengeId,
        name,
        schedule,
        generation,
        challengeType: "custom",
        persisted: true,
      };
      setSelectedChallenge(challenge);
      progressState.replaceProgress(createProgressFromCompletedDays(challengeId, schedule.totalDays, []));
      setSelectedDay(1);
      try {
        const challenges = await listMyChallenges();
        setSavedChallenges(challenges);
      } catch {
        setChallengeError("Challenge saved, but your challenge list could not be refreshed.");
      }
    } else {
      setSelectedChallenge({
        id: `custom-session-${nextCustomChallengeNumber.current}`,
        name,
        schedule,
        generation,
        challengeType: "custom",
        persisted: false,
      });
      setSelectedDay(1);
    }
  }

  return (
    <main className="mx-auto max-w-4xl py-8 sm:py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Reading plans</p>
        <h1 className="mt-2 text-4xl text-[var(--ink)] sm:text-5xl">Challenge</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          Follow the full Bible plan or build a reading schedule for a selected passage.
        </p>
        <AuthEntryPoint />
      </header>

      <div aria-label="Challenge options" className="mt-7 grid grid-cols-2 gap-2 rounded-lg bg-[var(--sage)] p-1" role="tablist">
        <button
          aria-selected={view === "full-bible"}
          className={`min-h-11 rounded-md px-3 text-sm font-medium ${view === "full-bible" ? "bg-white text-[var(--forest-deep)] shadow-sm" : "text-[var(--muted)]"}`}
          id="full-bible-tab"
          role="tab"
          type="button"
          onClick={() => {
            setView("full-bible");
            setSelectedDay(1);
            setSelectedChallenge(predefinedCloudId
              ? { ...PREDEFINED_CHALLENGE, id: predefinedCloudId, persisted: Boolean(user) }
              : PREDEFINED_CHALLENGE);
          }}
        >
          Full Bible Challenge
        </button>
        <button
          aria-selected={view === "custom"}
          className={`min-h-11 rounded-md px-3 text-sm font-medium ${view === "custom" ? "bg-white text-[var(--forest-deep)] shadow-sm" : "text-[var(--muted)]"}`}
          id="custom-challenge-tab"
          role="tab"
          type="button"
          onClick={() => {
            setView("custom");
            setSelectedDay(1);
          }}
        >
          Create Custom Challenge
        </button>
      </div>

      {user && (
        <section aria-labelledby="my-challenges-title" className="mt-8 border-b border-[var(--line)] pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="my-challenges-title" className="text-xl text-[var(--ink)]">My Challenges</h2>
            {isLoadingChallenges && <p className="text-sm text-[var(--muted)]">Loading saved challenges…</p>}
          </div>
          {!isLoadingChallenges && savedChallenges.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Your saved challenges will appear here.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {savedChallenges.map((saved) => {
                const startBook = getBibleBookById(saved.startLocation.bookId)?.name ?? saved.startLocation.bookId;
                const endBook = getBibleBookById(saved.endLocation.bookId)?.name ?? saved.endLocation.bookId;
                const percentage = (saved.completedDays / saved.totalDays) * 100;
                return (
                  <li key={saved.id} className="flex flex-col justify-between gap-3 rounded-md border border-[var(--line)] bg-white/55 p-4">
                    <div>
                      <h3 className="font-medium text-[var(--ink)]">{saved.name}</h3>
                      <p className="mt-1 text-xs capitalize text-[var(--muted)]">{saved.challengeType} · {saved.totalDays} days</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{startBook} {saved.startLocation.chapterNumber} – {endBook} {saved.endLocation.chapterNumber}</p>
                      <p className="mt-2 text-sm text-[var(--muted)]">{saved.completedDays} / {saved.totalDays} days · {percentage.toFixed(1)}%</p>
                    </div>
                    <button
                      className="min-h-10 self-start rounded-md border border-[var(--line)] px-3 text-sm font-medium text-[var(--forest)] hover:bg-[var(--sage)] disabled:opacity-50"
                      disabled={isOpeningChallenge}
                      type="button"
                      onClick={() => void openSavedChallenge(saved)}
                    >
                      {isOpeningChallenge ? "Opening…" : "Open challenge"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {challengeError && <p className="mt-5 text-sm text-[#9a3f32]" role="alert">{challengeError}</p>}

      {view === "custom" && (
        <div aria-labelledby="custom-challenge-tab" role="tabpanel">
          <h2 className="mt-8 text-2xl text-[var(--ink)]">Create Custom Challenge</h2>
          <CustomChallengeForm
            onGenerated={handleCustomChallengeGenerated}
          />
        </div>
      )}

      <div aria-live="polite">{renderSchedule(selectedChallenge)}</div>
    </main>
  );
}