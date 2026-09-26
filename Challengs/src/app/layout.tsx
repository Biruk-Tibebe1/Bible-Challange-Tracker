import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { challengeConfig, formatChallengeDate } from "@/features/challenge-days/challenge-config";
import { SupabaseAuthProvider } from "@/features/authentication/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: `Bible Challenge | ${challengeConfig.year} E.C.`,
  description: `A shared ${challengeConfig.durationDays}-day journey through the Bible, from ${formatChallengeDate(challengeConfig.start)} through ${formatChallengeDate(challengeConfig.end)}.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f7f1",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
      </body>
    </html>
  );
}