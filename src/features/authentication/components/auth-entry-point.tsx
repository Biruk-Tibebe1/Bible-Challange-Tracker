"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../auth-provider";

export function AuthEntryPoint() {
  const { user, isLoading, isConfigured, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState("");

  if (isLoading) {
    return <p aria-live="polite" className="mt-5 text-sm text-[var(--muted)]">Checking account status…</p>;
  }

  return (
    <aside aria-label="Account" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--sunlight)] pl-4">
      {user ? (
        <>
          <div>
            <p className="text-sm text-[var(--muted)]">Signed in as <span className="text-[var(--ink)]">{user.email}</span></p>
            <p className="mt-1 text-xs text-[var(--muted)]">Reading progress remains in this session for now.</p>
          </div>
          <button
            className="min-h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)] hover:bg-[var(--sage)]"
            type="button"
            onClick={async () => setSignOutError(await signOut() ?? "")}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <div>
            <p className="text-sm text-[var(--muted)]">Sign in to prepare for saving your progress</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Reading progress remains in this session for now.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="font-medium text-[var(--forest)] underline underline-offset-4" href="/auth/sign-in">Sign in</Link>
            <Link className="text-[var(--muted)] underline underline-offset-4" href="/auth/sign-up">Create account</Link>
          </div>
        </>
      )}
      {!isConfigured && !user && (
        <p className="basis-full text-xs text-[var(--muted)]">Account access will be available after Supabase is configured.</p>
      )}
      {signOutError && <p className="basis-full text-sm text-[#9a3f32]" role="alert">{signOutError}</p>}
    </aside>
  );
}