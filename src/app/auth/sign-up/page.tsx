import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AuthForm } from "@/features/authentication/components/auth-form";

export const metadata: Metadata = { title: "Create account | Bible Challenge" };

export default function SignUpPage() {
  return (
    <AppShell>
      <main><AuthForm mode="sign-up" /></main>
    </AppShell>
  );
}