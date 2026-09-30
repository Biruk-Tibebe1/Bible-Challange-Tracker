"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/authentication/auth-provider";
import { getBibleBookById } from "@/features/bible-books/bible-data";
import { listMyChallenges } from "@/lib/supabase/challenge-repository";
import type { SavedChallengeSummary } from "@/lib/supabase/challenge-repository";
import {
  attachChallengeToGroup,
  deleteGroup,
  GroupRepositoryError,
  leaveGroup,
  loadGroupDashboard,
  removeGroupChallenge,
  removeGroupMember,
  updateGroup,
} from "@/lib/supabase/group-repository";
import type { GroupDashboardData, GroupChallengeSummary } from "@/lib/supabase/group-repository";
import {
  buildGroupLeaderboard,
  calculateGroupCompletionPercentage,
} from "./group-model";
import type { GroupLeaderboardEntry } from "./group-model";

type GroupTab = "Overview" | "Challenges" | "Members" | "Leaderboard";
const tabs: GroupTab[] = ["Overview", "Challenges", "Members", "Leaderboard"];

function challengeReference(challenge: GroupChallengeSummary): string {
  const start = getBibleBookById(challenge.startLocation.bookId)?.name ?? challenge.startLocation.bookId;
  const end = getBibleBookById(challenge.endLocation.bookId)?.name ?? challenge.endLocation.bookId;
  return `${start} ${challenge.startLocation.chapterNumber} – ${end} ${challenge.endLocation.chapterNumber}`;
}

function ProgressBar({ percentage, label }: { percentage: number; label: string }) {
  return (
    <div>
      <div aria-label={label} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percentage} className="h-2 overflow-hidden rounded-full bg-[#e7ebe4]" role="progressbar">
        <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function LeaderboardList({ entries }: { entries: readonly GroupLeaderboardEntry[] }) {
  if (!entries.length) return <p className="text-sm text-[var(--muted)]">No group members are available.</p>;
  return (
    <ol className="mt-3 divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-white/50 px-4 sm:px-5">
      {entries.map((entry) => (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={entry.userId}>
          <div className="min-w-0">
            <p className="break-words font-medium text-[var(--ink)]">{entry.displayName}</p>
            {entry.role === "owner" && <p className="text-xs text-[var(--muted)]">Group owner</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-right text-xs text-[var(--muted)] sm:text-sm">
            <span>{entry.completedDays}/{entry.totalDays} days</span>
            <span>{entry.completionPercentage}%</span>
            <span>{entry.currentStreak} day streak</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function GroupDashboard({ groupId }: { groupId: string }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<GroupDashboardData | null>(null);
  const [savedChallenges, setSavedChallenges] = useState<SavedChallengeSummary[]>([]);
  const [selectedTab, setSelectedTab] = useState<GroupTab>("Overview");
  const [attachChallengeId, setAttachChallengeId] = useState("");
  const [leaderboardChallengeId, setLeaderboardChallengeId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    void (async () => {
      try {
        const dashboard = await loadGroupDashboard(groupId);
        if (cancelled) return;
        setData(dashboard);
        setGroupName(dashboard.group.name);
        setGroupDescription(dashboard.group.description ?? "");
        if (dashboard.role === "owner") {
          try {
            setSavedChallenges(await listMyChallenges());
          } catch {
            setSavedChallenges([]);
          }
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to load this group.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId, isAuthLoading, revision, userId]);

  async function refresh() {
    setRevision((current) => current + 1);
  }

  async function copyInvite() {
    if (!data) return;
    const inviteUrl = `${window.location.origin}/groups?invite=${encodeURIComponent(data.group.invite_code)}`;
    const shareText = `Join ${data.group.name} on Bible Challenge: ${inviteUrl}\nInvite code: ${data.group.invite_code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Join ${data.group.name}`, text: shareText });
        setNotice("Invite shared.");
        return;
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setNotice("Invite copied.");
    } catch {
      const field = document.createElement("textarea");
      field.value = shareText;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      setNotice(copied ? "Invite copied." : "Copy is unavailable in this browser.");
    }
  }

  async function handleAttach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachChallengeId) return;
    setIsSaving(true);
    setError("");
    try {
      await attachChallengeToGroup(groupId, attachChallengeId);
      setNotice("Challenge added to this group.");
      setAttachChallengeId("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to attach this challenge.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setIsSaving(true);
    setError("");
    try {
      await updateGroup(groupId, groupName, groupDescription);
      setIsEditing(false);
      setNotice("Group details updated.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to update group details.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string, displayName: string) {
    if (!window.confirm(`Remove ${displayName} from this group?`)) return;
    try {
      await removeGroupMember(groupId, memberId);
      setNotice(`${displayName} was removed from the group.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to remove this member.");
    }
  }

  async function handleRemoveChallenge(challenge: GroupChallengeSummary) {
    if (!window.confirm(`Remove ${challenge.name} from this group? The saved challenge and member progress will remain.`)) return;
    try {
      await removeGroupChallenge(groupId, challenge.id);
      setNotice("Challenge removed from this group. Saved progress was kept.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to remove this group challenge.");
    }
  }

  async function handleLeaveGroup() {
    if (!window.confirm("Leave this group?")) return;
    try {
      await leaveGroup(groupId);
      window.location.assign("/groups");
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to leave this group.");
    }
  }

  async function handleDeleteGroup() {
    if (!window.confirm("Delete this group and its group challenge links? Reading progress will remain in your account.")) return;
    try {
      await deleteGroup(groupId);
      window.location.assign("/groups");
    } catch (cause) {
      setError(cause instanceof GroupRepositoryError ? cause.message : "Unable to delete this group.");
    }
  }

  if (isAuthLoading || isLoading) {
    return <main className="mx-auto max-w-5xl py-8"><p aria-live="polite" className="text-sm text-[var(--muted)]">Loading group…</p></main>;
  }
  if (!user) {
    return (
      <main className="mx-auto max-w-4xl py-8">
        <section className="rounded-md border border-[var(--line)] bg-white/55 p-6">
          <h1 className="font-serif text-3xl text-[var(--ink)]">Sign in to view this group</h1>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white" href="/auth/sign-in">Sign in</Link>
        </section>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-4xl py-8">
        <Link className="text-sm text-[var(--forest)] underline underline-offset-4" href="/groups">Back to groups</Link>
        <p className="mt-5 rounded-md border border-[#e4c8c1] bg-[#fff7f4] p-4 text-sm text-[#8c3f32]" role="alert">{error || "This group is not available to your account."}</p>
      </main>
    );
  }

  const attachedIds = new Set(data.challenges.map((challenge) => challenge.id));
  const availableChallenges = savedChallenges.filter((challenge) => !attachedIds.has(challenge.id));
  const selectedChallenge = data.challenges.find((challenge) => challenge.id === leaderboardChallengeId) ?? data.challenges[0];
  const selectedLeaderboard = selectedChallenge
    ? buildGroupLeaderboard(data.members, data.progress, selectedChallenge.totalDays, new Date(), selectedChallenge.id)
    : [];
  const groupPercentage = calculateGroupCompletionPercentage(selectedLeaderboard);

  return (
    <main className="mx-auto max-w-5xl py-4 sm:py-8">
      <Link className="text-sm font-medium text-[var(--forest)] underline underline-offset-4" href="/groups">My groups</Link>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-5 border-b border-[var(--line)] pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words font-serif text-3xl text-[var(--ink)] sm:text-4xl">{data.group.name}</h1>
            <span className="rounded bg-[var(--sage)] px-2 py-1 text-xs font-medium capitalize text-[var(--forest-deep)]">{data.role}</span>
          </div>
          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-[var(--muted)]">{data.group.description || "A private Bible reading group."}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">{data.members.length} {data.members.length === 1 ? "member" : "members"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-10 rounded-md border border-[var(--line)] px-3 text-sm font-medium text-[var(--ink)] hover:bg-white" type="button" onClick={() => void copyInvite()}>Invite / share</button>
          <button aria-label="Refresh group" className="min-h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)] hover:bg-white" type="button" onClick={() => void refresh()}>Refresh</button>
        </div>
      </header>

      {error && <p className="mt-4 text-sm text-[#8c3f32]" role="alert">{error}</p>}
      {notice && <p className="mt-4 text-sm text-[var(--forest-deep)]" role="status">{notice}</p>}

      <nav aria-label="Group sections" className="mt-6 overflow-x-auto border-b border-[var(--line)]">
        <ul className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <li key={tab}>
              <button aria-current={selectedTab === tab ? "page" : undefined} className={`min-h-11 border-b-2 px-3 text-sm ${selectedTab === tab ? "border-[var(--forest)] font-semibold text-[var(--forest-deep)]" : "border-transparent text-[var(--muted)]"}`} type="button" onClick={() => setSelectedTab(tab)}>{tab}</button>
            </li>
          ))}
        </ul>
      </nav>

      {selectedTab === "Overview" && (
        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <div className="rounded-md border border-[var(--line)] bg-white/55 p-5">
            <h2 className="font-serif text-2xl text-[var(--ink)]">Group overview</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Reading plans and progress shared with this group are visible to its members.</p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-[var(--muted)]">Members</dt><dd className="mt-1 text-xl font-semibold text-[var(--ink)]">{data.members.length}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">Challenges</dt><dd className="mt-1 text-xl font-semibold text-[var(--ink)]">{data.challenges.length}</dd></div>
            </dl>
            {selectedChallenge && (
              <div className="mt-5 border-t border-[var(--line)] pt-4">
                <p className="text-sm font-medium text-[var(--ink)]">{selectedChallenge.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{selectedChallenge.totalChapterCount} chapters · {selectedChallenge.totalDays} days</p>
                <ProgressBar label={`Group completion ${groupPercentage}%`} percentage={groupPercentage} />
                <p className="mt-2 text-xs text-[var(--muted)]">{groupPercentage}% average completion across members</p>
              </div>
            )}
          </div>

          <div className="rounded-md border border-[var(--line)] bg-[#edf1e9] p-5">
            <h2 className="font-serif text-xl text-[var(--ink)]">Invite members</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Share this code with people you trust.</p>
            <p className="mt-4 select-all break-all rounded-md border border-[var(--line)] bg-white px-3 py-3 font-mono text-xl tracking-[0.14em] text-[var(--forest-deep)]">{data.group.invite_code}</p>
            <button className="mt-3 min-h-10 w-full rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white hover:bg-[var(--forest-deep)]" type="button" onClick={() => void copyInvite()}>Copy or share invite</button>
          </div>
        </section>
      )}

      {selectedTab === "Challenges" && (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Shared reading</p><h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Group challenges</h2></div>
          </div>
          {data.role === "owner" && (
            <form className="mt-4 flex flex-wrap items-end gap-2 rounded-md border border-[var(--line)] bg-white/55 p-4" onSubmit={(event) => void handleAttach(event)}>
              <label className="min-w-0 flex-1 text-sm text-[var(--muted)]" htmlFor="attach-challenge">Add one of your saved challenges
                <select className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]" id="attach-challenge" value={attachChallengeId} onChange={(event) => setAttachChallengeId(event.target.value)}>
                  <option value="">Select a challenge</option>
                  {availableChallenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.name} · {challenge.totalDays} days</option>)}
                </select>
              </label>
              <button className="min-h-11 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white disabled:opacity-50" disabled={!attachChallengeId || isSaving} type="submit">{isSaving ? "Adding…" : "Add challenge"}</button>
            </form>
          )}
          {!data.challenges.length ? (
            <p className="mt-5 rounded-md border border-dashed border-[var(--line)] bg-white/45 p-5 text-sm leading-6 text-[var(--muted)]">No group challenges yet. {data.role === "owner" ? "Attach one of your saved challenges above." : "The group owner can attach a saved challenge."}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.challenges.map((challenge) => {
                const leaderboard = buildGroupLeaderboard(data.members, data.progress, challenge.totalDays, new Date(), challenge.id);
                const groupCompletion = calculateGroupCompletionPercentage(leaderboard);
                const completeForAll = leaderboard.length > 0 && leaderboard.every((member) => member.completedDays >= challenge.totalDays);
                return (
                  <li className="rounded-md border border-[var(--line)] bg-white/55 p-4 sm:p-5" key={challenge.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-serif text-xl text-[var(--ink)]">{challenge.name}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{challengeReference(challenge)}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{challenge.totalChapterCount} chapters · {challenge.totalDays} days · {completeForAll ? "Completed by everyone" : "In progress"}</p>
                      </div>
                      <span className="text-sm text-[var(--muted)]">Your progress: {challenge.completedDays}/{challenge.totalDays} days</span>
                    </div>
                    {data.role === "owner" && <button className="mt-3 text-xs text-[#8c3f32] underline underline-offset-4" type="button" onClick={() => void handleRemoveChallenge(challenge)}>Remove from group</button>}
                    <div className="mt-4"><ProgressBar label={`Group completion ${groupCompletion}%`} percentage={groupCompletion} /><p className="mt-2 text-xs text-[var(--muted)]">{groupCompletion}% average group completion</p></div>
                    <details className="mt-4 border-t border-[var(--line)] pt-3">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--forest-deep)]">View member progress</summary>
                      <LeaderboardList entries={leaderboard} />
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {selectedTab === "Members" && (
        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Private to this group</p>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Members</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-white/55 px-4 sm:px-5">
            {data.members.map((member) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={member.userId}>
                <div className="min-w-0">
                  <p className="break-words font-medium text-[var(--ink)]">{member.displayName}{member.userId === user.id ? " (you)" : ""}</p>
                  {member.email && <p className="mt-0.5 break-all text-xs text-[var(--muted)]">{member.email}</p>}
                  {!member.email && member.userId !== user.id && <p className="mt-0.5 text-xs text-[var(--muted)]">Email private</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs capitalize text-[var(--muted)]">{member.role}</span>
                  {data.role === "owner" && member.role === "member" && <button className="min-h-9 rounded border border-[var(--line)] px-3 text-xs text-[#8c3f32] hover:bg-[#fff7f4]" type="button" onClick={() => void handleRemoveMember(member.userId, member.displayName)}>Remove</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedTab === "Leaderboard" && (
        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Personal progress, shared kindly</p>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Leaderboard</h2>
          {!data.challenges.length ? (
            <p className="mt-4 rounded-md border border-dashed border-[var(--line)] bg-white/45 p-5 text-sm text-[var(--muted)]">A leaderboard will appear when a challenge is attached and members record progress.</p>
          ) : (
            <>
              <label className="mt-4 block max-w-xl text-sm text-[var(--muted)]" htmlFor="leaderboard-challenge">Challenge
                <select className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]" id="leaderboard-challenge" value={selectedChallenge?.id ?? ""} onChange={(event) => setLeaderboardChallengeId(event.target.value)}>
                  {data.challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.name}</option>)}
                </select>
              </label>
              {selectedChallenge && <p className="mt-3 text-sm text-[var(--muted)]">Ranked by completed days, then completion percentage. Streaks use recorded completion dates.</p>}
              <LeaderboardList entries={selectedLeaderboard} />
            </>
          )}
        </section>
      )}

      <section aria-label="Group management" className="mt-10 border-t border-[var(--line)] pt-5">
        {data.role === "owner" ? (
          <div className="flex flex-wrap gap-3">
            <button className="text-sm text-[var(--forest)] underline underline-offset-4" type="button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Cancel editing" : "Edit group details"}</button>
            <button className="text-sm text-[#8c3f32] underline underline-offset-4" type="button" onClick={() => void handleDeleteGroup()}>Delete group</button>
          </div>
        ) : (
          <button className="text-sm text-[#8c3f32] underline underline-offset-4" type="button" onClick={() => void handleLeaveGroup()}>Leave group</button>
        )}
        {isEditing && data.role === "owner" && (
          <form className="mt-4 max-w-xl space-y-3 rounded-md border border-[var(--line)] bg-white/55 p-4" onSubmit={(event) => void handleSaveGroup(event)}>
            <label className="block text-sm text-[var(--muted)]" htmlFor="edit-group-name">Group name<input className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-[var(--ink)]" id="edit-group-name" maxLength={80} required value={groupName} onChange={(event) => setGroupName(event.target.value)} /></label>
            <label className="block text-sm text-[var(--muted)]" htmlFor="edit-group-description">Description<textarea className="mt-1 min-h-20 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]" id="edit-group-description" maxLength={500} value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} /></label>
            <button className="min-h-10 rounded-md bg-[var(--forest)] px-4 text-sm font-medium text-white" disabled={isSaving} type="submit">{isSaving ? "Saving…" : "Save details"}</button>
          </form>
        )}
      </section>
    </main>
  );
}