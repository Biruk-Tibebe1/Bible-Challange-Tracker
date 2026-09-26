import Link from "next/link";

const destinations = [
  { label: "Home", icon: "⌂", href: "/" },
  { label: "Challenge", icon: "▤", href: "/challenge" },
  { label: "Bible", icon: "▥" },
  { label: "Profile", icon: "○" },
] as const;

export function BottomNavigation({ activeItem = "Home" }: { activeItem?: "Home" | "Challenge" }) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--line)] bg-[var(--paper)]/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur sm:left-1/2 sm:w-[min(100%-4rem,34rem)] sm:-translate-x-1/2 sm:rounded-t-xl sm:border-x"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {destinations.map((destination) => (
          <li key={destination.label}>
            {"href" in destination ? (
              <Link
                aria-current={destination.label === activeItem ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${destination.label === activeItem ? "text-[var(--forest)]" : "text-[var(--muted)]"}`}
                href={destination.href}
              >
                <span aria-hidden="true" className="text-xl leading-none">{destination.icon}</span>
                {destination.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-[var(--muted)]/70"
                title="Not available yet"
              >
                <span aria-hidden="true" className="text-xl leading-none">{destination.icon}</span>
                {destination.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}