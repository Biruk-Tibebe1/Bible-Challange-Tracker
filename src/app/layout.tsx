import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CapacitorRuntime } from "@/components/capacitor-runtime";
import { ConnectivityIndicator } from "@/components/connectivity-indicator";
import { PwaRuntime } from "@/components/pwa-runtime";
import { SupabaseAuthProvider } from "@/features/authentication/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Challenge",
  description: "Read Scripture at your pace, explore the Bible, and build a reading plan that fits your life.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#315b49",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SupabaseAuthProvider>
          <CapacitorRuntime />
          <PwaRuntime />
          <ConnectivityIndicator />
          {children}
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}