"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { label: "Home", href: "/" },
  { label: "Bible", href: "/bible" },
  { label: "Challenges", href: "/challenges" },
  { label: "Groups", href: "/groups" },
  { label: "Profile", href: "/profile" },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--paper)]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 backdrop-blur lg:inset-y-0 lg:right-auto lg:w-60 lg:border-r lg:border-t-0 lg:px-5 lg:py-8"
    >
      <div className="hidden lg:block">
        <Link className="font-serif text-xl text-[var(--forest-deep)]" href="/">Word & Way</Link>
        <p className="mt-1 text-xs text-[var(--muted)]">Bible reading, at your pace</p>
      </div>
      <ul className="mx-auto grid max-w-lg grid-cols-5 lg:mt-12 lg:max-w-none lg:grid-cols-1 lg:gap-1">
        {destinations.map((destination) => {
          const isActive = pathname === destination.href ||
            (destination.href === "/challenges" && pathname === "/challenge");
          return (
            <li key={destination.label}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center rounded-md px-1 text-[10px] font-medium sm:text-xs lg:justify-start lg:px-3 lg:text-sm ${isActive ? "bg-[var(--sage)] text-[var(--forest-deep)]" : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]"}`}
                href={destination.href}
              >
                {destination.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}