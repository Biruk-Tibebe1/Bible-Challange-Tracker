"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/authentication/auth-provider";
import {
  createGroup,
  GroupRepositoryError,
  joinGroup,
  listMyGroups,
} from "@/lib/supabase/group-repository";
import type { GroupSummary } from "@/lib/supabase/group-repository";
import { getJoinMembershipResult, isValidInviteCode } from "./group-model";

type GroupAction = "create" | "join" | null;

export function GroupsPage() {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const userId = user?.id;
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [action, setAction] = useState<GroupAction>(null);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refreshGroups() {
    setIsLoadingGroups(true);
    setError("");
    try {
      setGroups(await listMyGroups());
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to load your groups.");
    } finally {
      setIsLoadingGroups(false);
    }
  }

  useEffect(() => {
    if (isAuthLoading || !userId || !isConfigured) return;
    void refreshGroups();
  }, [isAuthLoading, isConfigured, userId]);

  useEffect(() => {
    if (!userId || !isConfigured) return;
    const code = new URLSearchParams(window.location.search).get("invite");
    if (code) {
      setInviteCode(code.toUpperCase());
      setAction("join");
    }
  }, [isConfigured, userId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (groupName.trim().length < 2) {
      setError("Group name must contain at least 2 characters.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const group = await createGroup(groupName, description);
      setGroups((current) => [{ ...group, memberCount: 1, role: "owner" }, ...current]);
      setAction(null);
      setGroupName("");
      setDescription("");
      window.location.assign(`/groups/${group.id}`);
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to create this group.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidInviteCode(inviteCode)) {
      setError("Enter the 10-character invite code.");
      return;
    }
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await joinGroup(inviteCode);
      if (result.alreadyMember) {
        setNotice("You are already a member of this group. It is listed below.");
        setAction(null);
        await refreshGroups();
        setIsSaving(false);
        return;
      }
      setNotice(getJoinMembershipResult(true) === "joined" ? "You joined the group." : "");
      await refreshGroups();
      window.location.assign(`/groups/${result.groupId}`);
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to join this group.");
      setIsSaving(false);
    }
  }

  function openAction(nextAction: Exclude<GroupAction, null>) {
    setError("");
    setNotice("");
    setAction(nextAction);
  }

  if (isAuthLoading) {
    return <main className="mx-auto max-w-5xl py-8"><p aria-live="polite" className="text-sm text-[var(--muted)]">Checking your account…</p></main>;
  }

  return (
    <main className="mx-auto max-w-5xl py-4 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">Read together</p>
          <h1 className="mt-2 font-serif text-4xl text-[var(--ink)] sm:text-5xl">Groups</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Share a reading plan and follow one another&apos;s progress.</p>
        </div>
        {user && isConfigured && (
          <div className="flex flex-wrap gap-2">
            <button className="min-h-11 rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-white" type="button" onClick={() => openAction("join")}>Join group</button>
            <button className="min-h-11 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" type="button" onClick={() => openAction("create")}>Create group</button>
          </div>
        )}
      </header>

      {notice && <p className="mt-4 text-sm text-[var(--forest-deep)]" role="status">{notice}</p>}

      {!user ? (
        <section className="mt-8 rounded-md border border-[var(--line)] bg-white/55 p-5 sm:p-7">
          <h2 className="font-serif text-2xl text-[var(--ink)]">Sign in to read together</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Your groups and shared reading progress are private to their members. Sign in to create or join a group.</p>
          {isConfigured ? (
            <Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white" href="/auth/sign-in">Sign in</Link>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Account access is not configured yet.</p>
          )}
        </section>
      ) : !isConfigured ? (
        <p className="mt-8 rounded-md border border-[var(--line)] bg-white/55 p-5 text-sm text-[var(--muted)]">Group collaboration is not configured yet.</p>
      ) : (
        <section aria-labelledby="my-groups-title" className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Your reading community</p>
              <h2 id="my-groups-title" className="mt-1 font-serif text-2xl text-[var(--ink)]">My groups</h2>
            </div>
            <button aria-label="Refresh groups" className="min-h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)] hover:bg-white" disabled={isLoadingGroups} type="button" onClick={() => void refreshGroups()}>
              {isLoadingGroups ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {error && !action && <p className="mt-4 text-sm text-[#8c3f32]" role="alert">{error}</p>}
          {isLoadingGroups ? (
            <p aria-live="polite" className="mt-5 text-sm text-[var(--muted)]">Loading your groups…</p>
          ) : groups.length ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <li key={group.id}>
                  <Link className="block h-full rounded-md border border-[var(--line)] bg-white/55 p-5 hover:bg-white" href={`/groups/${group.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-xl text-[var(--ink)]">{group.name}</h3>
                      <span className="rounded bg-[var(--sage)] px-2 py-1 text-xs font-medium capitalize text-[var(--forest-deep)]">{group.role}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]">{group.description || "A shared Bible reading group."}</p>
                    <p className="mt-4 text-xs text-[var(--muted)]">{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-[var(--line)] bg-white/45 px-5 py-10 text-center sm:py-14">
              <h3 className="font-serif text-xl text-[var(--ink)]">Start reading with your people</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Create a private group or join one with an invite code. Shared challenges use your existing reading progress.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button className="min-h-10 rounded-md border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)]" type="button" onClick={() => openAction("join")}>Join group</button>
                <button className="min-h-10 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white" type="button" onClick={() => openAction("create")}>Create group</button>
              </div>
            </div>
          )}
        </section>
      )}

      {action && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setAction(null);
        }}>
          <section aria-labelledby="group-action-title" aria-modal="true" className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xl sm:p-6" role="dialog">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Groups</p>
            <h2 id="group-action-title" className="mt-2 font-serif text-2xl text-[var(--ink)]">{action === "create" ? "Create a group" : "Join a group"}</h2>
            {action === "create" ? (
              <form className="mt-4 space-y-4" onSubmit={(event) => void handleCreate(event)}>
                <label className="block text-sm text-[var(--muted)]" htmlFor="new-group-name">Group name
                  <input autoComplete="off" className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]" id="new-group-name" maxLength={80} required value={groupName} onChange={(event) => setGroupName(event.target.value)} />
                </label>
                <label className="block text-sm text-[var(--muted)]" htmlFor="new-group-description">Description <span className="text-xs">(optional)</span>
                  <textarea className="mt-1 min-h-24 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]" id="new-group-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>
                {error && <p className="text-sm text-[#8c3f32]" role="alert">{error}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <button className="min-h-10 rounded-md border border-[var(--line)] px-4 text-sm" disabled={isSaving} type="button" onClick={() => setAction(null)}>Cancel</button>
                  <button className="min-h-10 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white disabled:opacity-55" disabled={isSaving} type="submit">{isSaving ? "Creating…" : "Create group"}</button>
                </div>
              </form>
            ) : (
              <form className="mt-4 space-y-4" onSubmit={(event) => void handleJoin(event)}>
                <label className="block text-sm text-[var(--muted)]" htmlFor="group-invite-code">Invite code
                  <input autoCapitalize="characters" autoComplete="off" className="mt-1 min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3 font-mono uppercase tracking-[0.16em] text-[var(--ink)]" id="group-invite-code" maxLength={10} required value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} />
                </label>
                {error && <p className="text-sm text-[#8c3f32]" role="alert">{error}</p>}
                {notice && <p className="text-sm text-[var(--forest-deep)]" role="status">{notice}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <button className="min-h-10 rounded-md border border-[var(--line)] px-4 text-sm" disabled={isSaving} type="button" onClick={() => setAction(null)}>Cancel</button>
                  <button className="min-h-10 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white disabled:opacity-55" disabled={isSaving} type="submit">{isSaving ? "Joining…" : "Join group"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}