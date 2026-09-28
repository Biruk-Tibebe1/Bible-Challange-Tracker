import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/features/authentication/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Challenge",
  description: "Read Scripture at your pace, explore the Bible, and build a reading plan that fits your life.",
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