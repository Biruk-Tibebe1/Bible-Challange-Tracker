import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGroupLeaderboard,
  calculateCompletionPercentage,
  calculateGroupCompletionPercentage,
  getJoinMembershipResult,
  isValidInviteCode,
  normalizeInviteCode,
} from "./group-model.ts";
import type { GroupMemberEntry } from "./group-model.ts";

const members: GroupMemberEntry[] = [
  { userId: "a", displayName: "A", email: "a@example.test", role: "owner", joinedAt: "2026-09-01" },
  { userId: "b", displayName: "B", email: "b@example.test", role: "member", joinedAt: "2026-09-02" },
  { userId: "c", displayName: "C", email: null, role: "member", joinedAt: "2026-09-03" },
];

test("invite codes normalize case and accept only ten hexadecimal characters", () => {
  assert.equal(normalizeInviteCode("  a1b2c3d4e5 "), "A1B2C3D4E5");
  assert.equal(isValidInviteCode("a1b2c3d4e5"), true);
  assert.equal(isValidInviteCode("A1B2-3D4E5"), false);
  assert.equal(isValidInviteCode("short"), false);
});

test("membership result distinguishes a new join from a duplicate membership", () => {
  assert.equal(getJoinMembershipResult(true), "joined");
  assert.equal(getJoinMembershipResult(false), "already-member");
});

test("leaderboard counts unique completed days, uses real dates, and sorts by completion", () => {
  const now = new Date(2026, 8, 30, 12);
  const leaderboard = buildGroupLeaderboard(members, [
    { userId: "a", challengeId: "reading-plan", dayNumber: 1, completedAt: new Date(2026, 8, 30, 8).toISOString() },
    { userId: "a", challengeId: "reading-plan", dayNumber: 1, completedAt: new Date(2026, 8, 30, 8).toISOString() },
    { userId: "a", challengeId: "reading-plan", dayNumber: 2, completedAt: new Date(2026, 8, 29, 8).toISOString() },
    { userId: "b", challengeId: "reading-plan", dayNumber: 1, completedAt: new Date(2026, 8, 30, 9).toISOString() },
  ], 4, now, "reading-plan");

  assert.deepEqual(leaderboard.map((member) => member.userId), ["a", "b", "c"]);
  assert.equal(leaderboard[0]?.completedDays, 2);
  assert.equal(leaderboard[0]?.completionPercentage, 50);
  assert.equal(leaderboard[0]?.currentStreak, 2);
  assert.equal(leaderboard[2]?.currentStreak, 0);
  assert.equal(calculateGroupCompletionPercentage(leaderboard), 25);
});

test("completion percentage is bounded and handles empty challenges", () => {
  assert.equal(calculateCompletionPercentage(20, 10), 100);
  assert.equal(calculateCompletionPercentage(-2, 10), 0);
  assert.equal(calculateCompletionPercentage(2, 0), 0);
});