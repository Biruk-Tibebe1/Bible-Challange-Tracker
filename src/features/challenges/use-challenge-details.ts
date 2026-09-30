"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/authentication/auth-provider";
import {
  listMyChallengeDetails,
  type SavedChallengeDetail,
} from "@/lib/supabase/challenge-repository";

export function useChallengeDetails() {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const userId = user?.id;
  const [challenges, setChallenges] = useState<SavedChallengeDetail[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!userId || !isConfigured) {
      setChallenges([]);
      setError("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError("");
    void listMyChallengeDetails()
      .then((savedChallenges) => {
        if (!cancelled) setChallenges(savedChallenges);
      })
      .catch(() => {
        if (!cancelled) {
          setChallenges([]);
          setError("Unable to load your challenge schedule and progress.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthLoading, isConfigured, revision, userId]);

  return {
    challenges,
    error,
    isLoading: isAuthLoading || isLoading,
    reload: () => setRevision((current) => current + 1),
  };
}