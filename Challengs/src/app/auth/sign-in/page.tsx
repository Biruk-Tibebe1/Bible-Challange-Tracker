import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AuthForm } from "@/features/authentication/components/auth-form";

export const metadata: Metadata = { title: "Sign in | Bible Challenge" };

export default function SignInPage() {
  return (
    <AppShell>
      <main><AuthForm mode="sign-in" /></main>
    </AppShell>
  );
}