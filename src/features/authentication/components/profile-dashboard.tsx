"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../auth-provider";
import { useSavedChallenges } from "@/features/challenges/use-saved-challenges";

function ProfileValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b border-[var(--line)] py-4 last:border-b-0">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}

export function ProfileDashboard() {
  const { user, isLoading: isAuthLoading, isConfigured, signOut } = useAuth();
  const { challenges, error, isLoading: isChallengesLoading } = useSavedChallenges();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError("");
    try {
      setSignOutError(await signOut() ?? "");
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  const activeCount = challenges.filter((challenge) => challenge.completedDays < challenge.totalDays).length;
  const completedCount = challenges.filter((challenge) => challenge.completedDays >= challenge.totalDays).length;
  const completedReadingDays = challenges.reduce((sum, challenge) => sum + challenge.completedDays, 0);

  return (
    <main className="mx-auto max-w-4xl py-4 sm:py-8">
      <header className="border-b border-[var(--line)] pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Your account</p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">Profile</h1>
      </header>

      {isAuthLoading ? (
        <section aria-live="polite" className="mt-7 rounded-md border border-[var(--line)] bg-white/50 p-6">
          <p className="text-sm text-[var(--muted)]">Checking your account…</p>
          <div aria-hidden="true" className="mt-4 h-2 max-w-xs rounded-full bg-[var(--sage)]" />
        </section>
      ) : !user ? (
        <section className="mt-7 rounded-md border border-[var(--line)] bg-white/50 p-6 sm:p-8">
          <h2 className="font-serif text-2xl text-[var(--ink)]">You are not signed in</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            {isConfigured
              ? "Sign in to see saved challenges and keep your reading progress with your account."
              : "Account access is not configured yet. Your saved profile and challenge statistics will appear here when it is available."}
          </p>
          {isConfigured && <Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[var(--forest)] px-5 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" href="/auth/sign-in">Sign in</Link>}
        </section>
      ) : (
        <>
          <section aria-labelledby="account-details-title" className="mt-7 rounded-md border border-[var(--line)] bg-white/50 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 id="account-details-title" className="font-serif text-2xl text-[var(--ink)]">Account details</h2>
                <dl className="mt-3 grid w-full gap-x-12 sm:grid-cols-2">
                  <ProfileValue label="Email" value={user.email ?? "Email not available"} />
                  {typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim() && (
                    <ProfileValue label="Name" value={user.user_metadata.full_name.trim()} />
                  )}
                  {typeof user.user_metadata.display_name === "string" && user.user_metadata.display_name.trim() && (
                    <ProfileValue label="Display name" value={user.user_metadata.display_name.trim()} />
                  )}
                </dl>
              </div>
              <button className="min-h-11 rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--sage)] disabled:cursor-wait disabled:opacity-60" disabled={isSigningOut} type="button" onClick={() => void handleSignOut()}>
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </section>

          <section aria-labelledby="profile-reading-stats-title" className="mt-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">From your saved progress</p>
              <h2 id="profile-reading-stats-title" className="mt-1 font-serif text-2xl text-[var(--ink)]">Reading statistics</h2>
            </div>
            {isChallengesLoading ? (
              <p aria-live="polite" className="mt-4 text-sm text-[var(--muted)]">Loading your challenge statistics…</p>
            ) : error ? (
              <p className="mt-4 rounded-md border border-[#e4c8c1] bg-[#fff7f4] p-4 text-sm text-[#8c3f32]" role="alert">{error}</p>
            ) : (
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-[var(--line)] bg-white/50 p-4"><dt className="text-xs leading-5 text-[var(--muted)]">Active challenges</dt><dd className="mt-2 text-2xl font-semibold text-[var(--ink)]">{activeCount}</dd></div>
                <div className="rounded-md border border-[var(--line)] bg-white/50 p-4"><dt className="text-xs leading-5 text-[var(--muted)]">Completed challenges</dt><dd className="mt-2 text-2xl font-semibold text-[var(--ink)]">{completedCount}</dd></div>
                <div className="col-span-2 rounded-md border border-[var(--line)] bg-white/50 p-4 sm:col-span-2"><dt className="text-xs leading-5 text-[var(--muted)]">Completed reading days across saved challenges</dt><dd className="mt-2 text-2xl font-semibold text-[var(--ink)]">{completedReadingDays}</dd></div>
              </dl>
            )}
          </section>
          {signOutError && <p className="mt-5 text-sm text-[#8c3f32]" role="alert">{signOutError}</p>}
        </>
      )}
    </main>
  );
}