"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "../auth-provider";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    if (!isConfigured) {
      setError("Authentication is not configured. Add the Supabase environment variables to .env.local.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured. Add the Supabase environment variables to .env.local.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError("Unable to create your account. Please check your details and try again.");
        } else if (data.session) {
          router.replace("/challenge");
          router.refresh();
        } else {
          setMessage("Account created. Check your email to confirm your address, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError("Unable to sign in. Please check your credentials.");
        } else {
          router.replace("/challenge");
          router.refresh();
        }
      }
    } catch {
      setError(isSignUp
        ? "Unable to create your account. Please try again."
        : "Unable to sign in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Bible Challenge</p>
      <h1 className="mt-2 text-3xl text-[var(--ink)]">{isSignUp ? "Create your account" : "Sign in"}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {isSignUp ? "Create an account to prepare for saving your reading progress." : "Sign in to your Bible Challenge account. Reading progress is still session-only."}
      </p>

      {!isConfigured && (
        <p className="mt-5 rounded-md border border-[var(--line)] bg-white/60 p-3 text-sm leading-5 text-[var(--muted)]" role="status">
          Supabase is not configured in this environment yet. Add the variables from `.env.example` to `.env.local` to enable account access.
        </p>
      )}

      <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm text-[var(--muted)]" htmlFor="auth-email">Email</label>
          <input
            autoComplete="email"
            className="mt-1 min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
            id="auth-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted)]" htmlFor="auth-password">Password</label>
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="mt-1 min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
            id="auth-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-[#9a3f32]" role="alert">{error}</p>}
        {message && <p className="text-sm text-[var(--forest-deep)]" role="status">{message}</p>}

        <button
          className="min-h-12 w-full rounded-md bg-[var(--forest)] px-5 text-sm font-medium text-white hover:bg-[var(--forest-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)] disabled:cursor-wait disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        {isSignUp ? "Already have an account? " : "New to Bible Challenge? "}
        <Link className="font-medium text-[var(--forest)] underline underline-offset-4" href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}>
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}