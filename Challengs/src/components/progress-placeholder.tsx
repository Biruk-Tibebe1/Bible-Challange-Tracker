export function ProgressPlaceholder() {
  return (
    <section aria-labelledby="progress-title" className="border-y border-[var(--line)] py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="progress-title" className="text-xl text-[var(--ink)]">Your progress</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Your reading progress will appear here once the challenge begins.
          </p>
        </div>
        <span aria-hidden="true" className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-[var(--forest)]">
          <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.6">
            <path d="M5 19.5h14M7.5 16V9.5M12 16V5M16.5 16v-4" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      <div aria-hidden="true" className="mt-5 h-2 overflow-hidden rounded-full bg-[#e9ebe4]">
        <div className="h-full w-0 rounded-full bg-[var(--forest)]" />
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Not started</p>
    </section>
  );
}