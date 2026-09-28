import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";

export function AppShell({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen lg:pl-60">
      <BottomNavigation />
      <div className="mx-auto min-h-screen w-full max-w-6xl px-5 pb-24 pt-6 sm:px-8 sm:pt-10 lg:px-12 lg:pb-12">
        {children}
      </div>
    </div>
  );
}