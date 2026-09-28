"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/authentication/auth-provider";
import {
  listMyChallenges,
  loadMyCompletedAtDates,
} from "@/lib/supabase/challenge-repository";
import type { SavedChallengeSummary } from "@/lib/supabase/challenge-repository";

export function useSavedChallenges() {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const userId = user?.id;
  const [challenges, setChallenges] = useState<SavedChallengeSummary[]>([]);
  const [completedAt, setCompletedAt] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!userId || !isConfigured) {
      setChallenges([]);
      setCompletedAt([]);
      setIsFetching(false);
      setError("");
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setError("");
    setChallenges([]);
    setCompletedAt([]);
    void Promise.all([listMyChallenges(), loadMyCompletedAtDates()])
      .then(([savedChallenges, dates]) => {
        if (cancelled) return;
        setChallenges(savedChallenges);
        setCompletedAt(dates);
      })
      .catch(() => {
        if (!cancelled) {
          setChallenges([]);
          setCompletedAt([]);
          setError("Unable to load your saved reading data.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isConfigured, userId, revision]);

  return {
    challenges,
    completedAt,
    error,
    isLoading: isAuthLoading || isFetching,
    reload: () => setRevision((current) => current + 1),
  };
}