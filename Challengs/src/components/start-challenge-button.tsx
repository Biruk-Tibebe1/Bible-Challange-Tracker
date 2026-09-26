import Link from "next/link";

export function StartChallengeButton() {
  return (
    <Link
      className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[var(--forest)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--forest-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
      href="/challenge"
    >
      Start Challenge
      <span aria-hidden="true" className="text-lg leading-none">→</span>
    </Link>
  );
}