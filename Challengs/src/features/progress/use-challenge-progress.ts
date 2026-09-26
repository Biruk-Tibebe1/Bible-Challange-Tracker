"use client";

import { useCallback, useState } from "react";
import {
  createInitialProgress,
  markDayComplete as markComplete,
  markDayIncomplete as markIncomplete,
  toggleDayCompletion as toggleCompletion,
} from "./progress-model.ts";
import type { ChallengeProgress } from "./progress-model.ts";

export function useChallengeProgress() {
  const [progressByChallenge, setProgressByChallenge] = useState<ReadonlyMap<string, ChallengeProgress>>(
    () => new Map(),
  );

  const replaceProgress = useCallback((progress: ChallengeProgress) => {
    setProgressByChallenge((currentProgressByChallenge) => {
      const nextProgressByChallenge = new Map(currentProgressByChallenge);
      nextProgressByChallenge.set(progress.challengeId, progress);
      return nextProgressByChallenge;
    });
  }, []);

  function getProgress(challengeId: string, totalDayCount: number): ChallengeProgress {
    const existingProgress = progressByChallenge.get(challengeId);
    return existingProgress?.totalDayCount === totalDayCount
      ? existingProgress
      : createInitialProgress(challengeId, totalDayCount);
  }

  function updateProgress(
    challengeId: string,
    totalDayCount: number,
    update: (progress: ChallengeProgress, dayNumber: number) => ChallengeProgress,
    dayNumber: number,
  ): void {
    setProgressByChallenge((currentProgressByChallenge) => {
      const storedProgress = currentProgressByChallenge.get(challengeId);
      const currentProgress = storedProgress?.totalDayCount === totalDayCount
        ? storedProgress
        : createInitialProgress(challengeId, totalDayCount);
      const nextProgressByChallenge = new Map(currentProgressByChallenge);
      nextProgressByChallenge.set(challengeId, update(currentProgress, dayNumber));
      return nextProgressByChallenge;
    });
  }

  return {
    getProgress,
    replaceProgress,
    markDayComplete: (challengeId: string, totalDayCount: number, dayNumber: number) =>
      updateProgress(challengeId, totalDayCount, markComplete, dayNumber),
    markDayIncomplete: (challengeId: string, totalDayCount: number, dayNumber: number) =>
      updateProgress(challengeId, totalDayCount, markIncomplete, dayNumber),
    toggleDayCompletion: (challengeId: string, totalDayCount: number, dayNumber: number) =>
      updateProgress(challengeId, totalDayCount, toggleCompletion, dayNumber),
  };
}