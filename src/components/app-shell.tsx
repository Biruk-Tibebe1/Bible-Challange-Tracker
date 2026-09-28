import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";

export function AppShell({
  children,
  activeItem,
}: Readonly<{ children: ReactNode; activeItem?: "Home" | "Challenge" }>) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-5 pb-28 pt-6 sm:px-8 sm:pt-10 lg:px-12">
      {children}
      <BottomNavigation activeItem={activeItem} />
    </div>
  );
}