"use client";

import { useState } from "react";

type GroupAction = "create" | "join";

export function GroupsPage() {
  const [action, setAction] = useState<GroupAction | null>(null);

  return (
    <main className="mx-auto max-w-5xl py-4 sm:py-8">
      <header className="border-b border-[var(--line)] pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Read together</p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">Groups</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">A place for shared reading plans and encouragement with people you know.</p>
      </header>

      <section aria-labelledby="my-groups-title" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-groups-title" className="font-serif text-2xl text-[var(--ink)]">My groups</h2>
          <div className="flex flex-wrap gap-2">
            <button className="min-h-10 rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-white" type="button" onClick={() => setAction("join")}>Join group</button>
            <button className="min-h-10 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" type="button" onClick={() => setAction("create")}>Create group</button>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-dashed border-[var(--line)] bg-white/45 px-5 py-12 text-center sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Your reading community</p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--ink)]">Your groups will appear here</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Group challenges are being prepared. You can read on your own while group creation and joining are not yet connected.</p>
        </div>
      </section>

      {action && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAction(null);
        }}>
          <section aria-labelledby="group-action-title" aria-modal="true" className="w-full max-w-md rounded-md border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xl" role="dialog">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Groups</p>
            <h2 id="group-action-title" className="mt-2 font-serif text-2xl text-[var(--ink)]">{action === "create" ? "Create a group" : "Join a group"}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Group challenges are not connected yet. No group or membership data has been saved.</p>
            <button autoFocus className="mt-5 min-h-11 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" type="button" onClick={() => setAction(null)}>Close</button>
          </section>
        </div>
      )}
    </main>
  );
}