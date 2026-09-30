import { createSupabaseBrowserClient } from "./client";
import type { Database } from "./database.types";
import type { BibleLocation } from "@/features/bible-books/bible-data";
import type { SavedChallengeSummary } from "./challenge-repository";
import type { GroupMemberEntry, GroupProgressEntry } from "@/features/dashboard/group-model";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

export interface GroupSummary extends Pick<GroupRow, "id" | "name" | "description" | "owner_id" | "invite_code" | "created_at"> {
  memberCount: number;
  role: "owner" | "member";
}

export interface GroupChallengeSummary extends SavedChallengeSummary {
  totalChapterCount: number;
}

export interface GroupDashboardData {
  group: GroupRow;
  role: "owner" | "member";
  members: GroupMemberEntry[];
  challenges: GroupChallengeSummary[];
  progress: GroupProgressEntry[];
}

export class GroupRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroupRepositoryError";
  }
}

function getClient() {
  const client = createSupabaseBrowserClient();
  if (!client) throw new GroupRepositoryError("Group collaboration is not configured yet.");
  return client;
}

export async function listMyGroups(): Promise<GroupSummary[]> {
  const client = getClient();
  const { data: rows, error } = await client
    .from("groups")
    .select("id,name,description,owner_id,invite_code,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new GroupRepositoryError("Unable to load your groups.");

  const groupIds = rows.map((group) => group.id);
  if (!groupIds.length) return [];
  const { data: memberships, error: membershipError } = await client
    .from("group_members")
    .select("group_id,user_id,role")
    .in("group_id", groupIds);
  if (membershipError) throw new GroupRepositoryError("Unable to load group membership.");

  const { data: { user } } = await client.auth.getUser();
  const memberCounts = new Map<string, number>();
  const roles = new Map<string, "owner" | "member">();
  for (const membership of memberships) {
    memberCounts.set(membership.group_id, (memberCounts.get(membership.group_id) ?? 0) + 1);
    if (membership.user_id === user?.id) roles.set(membership.group_id, membership.role);
  }
  return rows.map((group) => ({
    ...group,
    memberCount: memberCounts.get(group.id) ?? 0,
    role: roles.get(group.id) ?? "member",
  }));
}

export async function createGroup(name: string, description: string): Promise<GroupRow> {
  const client = getClient();
  const { data, error } = await client.from("groups").insert({
    name: name.trim(),
    description: description.trim() || null,
  }).select("id,name,description,owner_id,invite_code,invite_expires_at,created_at,updated_at").single();
  if (error || !data) throw new GroupRepositoryError("Unable to create this group. Please try again.");
  return data;
}

export async function updateGroup(groupId: string, name: string, description: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("groups").update({
    name: name.trim(),
    description: description.trim() || null,
  }).eq("id", groupId);
  if (error) throw new GroupRepositoryError("Unable to update this group.");
}

export async function deleteGroup(groupId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("groups").delete().eq("id", groupId);
  if (error) throw new GroupRepositoryError("Unable to delete this group.");
}

export async function joinGroup(inviteCode: string): Promise<{ groupId: string; alreadyMember: boolean }> {
  const client = getClient();
  const { data, error } = await client.rpc("join_group_by_invite_code", {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });
  if (error || !data?.[0]) {
    const code = error?.code;
    if (code === "P0002") throw new GroupRepositoryError("That invite code was not found. Check it and try again.");
    if (code === "P0003") throw new GroupRepositoryError("That invite code has expired. Ask a group member for a current code.");
    if (code === "22023") throw new GroupRepositoryError("Enter a valid 10-character invite code.");
    throw new GroupRepositoryError("Unable to join this group. Please try again.");
  }
  return { groupId: data[0].group_id, alreadyMember: data[0].already_member };
}

export async function loadGroupDashboard(groupId: string): Promise<GroupDashboardData> {
  const client = getClient();
  const { data: group, error: groupError } = await client
    .from("groups")
    .select("id,name,description,owner_id,invite_code,invite_expires_at,created_at,updated_at")
    .eq("id", groupId)
    .single();
  if (groupError || !group) throw new GroupRepositoryError("Unable to load this group.");

  const [{ data: members, error: memberError }, { data: associations, error: challengeError }] = await Promise.all([
    client.rpc("list_group_members", { p_group_id: groupId }),
    client.from("group_challenges").select("id,group_id,challenge_id,created_at").eq("group_id", groupId),
  ]);
  if (memberError) throw new GroupRepositoryError("Unable to load group members.");
  if (challengeError) throw new GroupRepositoryError("Unable to load group challenges.");

  const { data: { user } } = await client.auth.getUser();
  const currentMember = members.find((member) => member.user_id === user?.id);
  if (!currentMember) throw new GroupRepositoryError("Your group membership could not be verified.");

  const challengeIds = associations.map((association) => association.challenge_id);
  if (!challengeIds.length) {
    return {
      group,
      role: currentMember.role as "owner" | "member",
      members: members.map((member) => ({
        userId: member.user_id,
        displayName: member.display_name,
        email: member.user_id === user?.id ? member.email : null,
        role: member.role as "owner" | "member",
        joinedAt: member.joined_at,
      })),
      challenges: [],
      progress: [],
    };
  }

  const [{ data: challengeRows, error: detailsError }, { data: progressRows, error: progressError }, { data: dayRows, error: dayError }] = await Promise.all([
    client.from("challenges")
      .select("id,owner_id,name,challenge_type,start_book_id,start_chapter,end_book_id,end_chapter,total_days,challenge_key,created_at,updated_at")
      .in("id", challengeIds),
    client.from("user_challenge_progress")
      .select("user_id,challenge_id,day_number,completed,completed_at")
      .in("challenge_id", challengeIds)
      .eq("completed", true),
    client.from("challenge_days").select("challenge_id,chapters").in("challenge_id", challengeIds),
  ]);
  if (detailsError || progressError || dayError) throw new GroupRepositoryError("Unable to load group reading progress.");

  const chapterCounts = new Map<string, number>();
  for (const day of dayRows) {
    const chapters = Array.isArray(day.chapters) ? day.chapters : [];
    chapterCounts.set(day.challenge_id, (chapterCounts.get(day.challenge_id) ?? 0) + chapters.length);
  }
  const completedCounts = new Map<string, number>();
  for (const row of progressRows) {
    const key = `${row.user_id}:${row.challenge_id}`;
    completedCounts.set(key, (completedCounts.get(key) ?? 0) + 1);
  }

  const challenges: GroupChallengeSummary[] = challengeRows.map((challenge) => ({
    id: challenge.id,
    name: challenge.challenge_type === "predefined" ? "The Full Bible" : challenge.name,
    challengeType: challenge.challenge_type,
    startLocation: { bookId: challenge.start_book_id, chapterNumber: challenge.start_chapter } as BibleLocation,
    endLocation: { bookId: challenge.end_book_id, chapterNumber: challenge.end_chapter } as BibleLocation,
    totalDays: challenge.total_days,
    completedDays: completedCounts.get(`${user?.id}:${challenge.id}`) ?? 0,
    totalChapterCount: chapterCounts.get(challenge.id) ?? 0,
  }));

  const progress: GroupProgressEntry[] = progressRows.map((row) => ({
    userId: row.user_id,
    challengeId: row.challenge_id,
    dayNumber: row.day_number,
    completedAt: row.completed_at,
  }));

  return {
    group,
    role: currentMember.role as "owner" | "member",
    members: members.map((member) => ({
      userId: member.user_id,
      displayName: member.display_name,
      email: member.user_id === user?.id ? member.email : null,
      role: member.role as "owner" | "member",
      joinedAt: member.joined_at,
    })),
    challenges,
    progress,
  };
}

export async function attachChallengeToGroup(groupId: string, challengeId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("group_challenges").insert({ group_id: groupId, challenge_id: challengeId });
  if (error?.code === "23505") throw new GroupRepositoryError("That challenge is already attached to this group.");
  if (error) throw new GroupRepositoryError("Unable to add this challenge. Only group owners can attach their saved challenges.");
}

export async function removeGroupChallenge(groupId: string, challengeId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("group_challenges").delete()
    .eq("group_id", groupId)
    .eq("challenge_id", challengeId);
  if (error) throw new GroupRepositoryError("Unable to remove this group challenge.");
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw new GroupRepositoryError("Unable to remove this member.");
}

export async function leaveGroup(groupId: string): Promise<void> {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new GroupRepositoryError("Sign in to leave a group.");
  const { error } = await client.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  if (error) throw new GroupRepositoryError("Group owners cannot leave. Transfer ownership or delete the group.");
}