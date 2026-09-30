import { calculateCurrentStreak } from "../progress/progress-model.ts";

export interface GroupProgressEntry {
  userId: string;
  challengeId: string;
  dayNumber: number;
  completedAt: string | null;
}

export interface GroupMemberEntry {
  userId: string;
  displayName: string;
  email: string | null;
  role: "owner" | "member";
  joinedAt: string;
}

export interface GroupLeaderboardEntry extends GroupMemberEntry {
  completedDays: number;
  totalDays: number;
  completionPercentage: number;
  currentStreak: number;
}

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidInviteCode(value: string): boolean {
  return /^[A-F0-9]{10}$/.test(normalizeInviteCode(value));
}

export function getJoinMembershipResult(inserted: boolean): "joined" | "already-member" {
  return inserted ? "joined" : "already-member";
}

export function calculateCompletionPercentage(completedDays: number, totalDays: number): number {
  if (!Number.isFinite(totalDays) || totalDays <= 0) return 0;
  const boundedCompletedDays = Math.max(0, Math.min(completedDays, totalDays));
  return Math.round((boundedCompletedDays / totalDays) * 100);
}

export function buildGroupLeaderboard(
  members: readonly GroupMemberEntry[],
  progress: readonly GroupProgressEntry[],
  totalDays: number,
  now = new Date(),
  challengeId?: string,
): GroupLeaderboardEntry[] {
  return members.map((member) => {
    const memberProgress = progress.filter((entry) =>
      entry.userId === member.userId && (!challengeId || entry.challengeId === challengeId),
    );
    const completedDayNumbers = new Set(memberProgress.map((entry) => entry.dayNumber));
    const completionDates = memberProgress.flatMap((entry) => entry.completedAt ? [entry.completedAt] : []);
    const completedDays = Math.min(completedDayNumbers.size, totalDays);
    return {
      ...member,
      completedDays,
      totalDays,
      completionPercentage: calculateCompletionPercentage(completedDays, totalDays),
      currentStreak: calculateCurrentStreak(completionDates, now),
    };
  }).sort((left, right) =>
    right.completedDays - left.completedDays ||
    right.completionPercentage - left.completionPercentage,
  );
}

export function calculateGroupCompletionPercentage(
  leaderboard: readonly GroupLeaderboardEntry[],
): number {
  if (leaderboard.length === 0) return 0;
  const combined = leaderboard.reduce((sum, member) => sum + member.completionPercentage, 0);
  return Math.round(combined / leaderboard.length);
}