import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSupabasePublicConfig, isSupabaseConfigured } from "./config.ts";

const migration = readFileSync(
  "supabase/migrations/20260926000000_initial_schema.sql",
  "utf8",
);
const persistenceMigration = readFileSync(
  "supabase/migrations/20260926010000_atomic_challenge_persistence.sql",
  "utf8",
);
const groupMigration = readFileSync(
  "supabase/migrations/20260930000000_group_collaboration.sql",
  "utf8",
);

test("Supabase public client configuration comes from environment variables", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal(getSupabasePublicConfig(), null);
    assert.equal(isSupabaseConfigured(), false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "example-publishable-key";
    assert.deepEqual(getSupabasePublicConfig(), {
      url: "https://example.supabase.co",
      publishableKey: "example-publishable-key",
    });
    assert.equal(isSupabaseConfigured(), true);
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

test("initial schema contains the required tables, constraints, and RLS protections", () => {
  for (const tableName of ["profiles", "challenges", "challenge_days", "user_challenge_progress"]) {
    assert.match(migration, new RegExp(`create table public\\.${tableName}\\s*\\(`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }

  assert.match(migration, /unique \(challenge_id, day_number\)/i);
  assert.match(migration, /unique \(user_id, challenge_id, day_number\)/i);
  assert.match(migration, /total_days integer not null check \(total_days > 0\)/i);
  assert.match(migration, /using \(user_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(migration, /with check \(\s*user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /references public\.challenge_days \(challenge_id, day_number\)\s+on delete restrict/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.doesNotMatch(migration, /service[_-]?role/i);
});

test("persistence migration derives ownership from auth and saves schedules atomically", () => {
  assert.match(persistenceMigration, /alter column owner_id set default auth\.uid\(\)/i);
  assert.match(persistenceMigration, /alter column user_id set default auth\.uid\(\)/i);
  assert.match(persistenceMigration, /unique \(owner_id, challenge_key\)/i);
  assert.match(persistenceMigration, /create or replace function public\.create_challenge_with_days/i);
  assert.match(persistenceMigration, /language plpgsql\s+set search_path = ''\s+as \$function\$/i);
  assert.match(persistenceMigration, /on conflict \(owner_id, challenge_key\) do nothing/i);
  assert.match(persistenceMigration, /insert into public\.challenge_days/i);
  assert.match(persistenceMigration, /grant execute on function public\.create_challenge_with_days[\s\S]+to authenticated/i);
  assert.doesNotMatch(persistenceMigration, /security definer/i);
});

test("group migration restricts private data and membership to authenticated group members", () => {
  for (const tableName of ["groups", "group_members", "group_challenges"]) {
    assert.match(groupMigration, new RegExp(`create table public\\.${tableName}\\s*\\(`, "i"));
    assert.match(groupMigration, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }

  assert.match(groupMigration, /create unique index group_members_one_owner_per_group_idx[\s\S]+where role = 'owner'/i);
  assert.match(groupMigration, /create or replace function public\.set_group_owner_from_auth[\s\S]+new\.owner_id := \(select auth\.uid\(\)\)/i);
  assert.match(groupMigration, /new\.invite_code := pg_catalog\.upper\([\s\S]+gen_random_uuid\(\)/i);
  assert.match(groupMigration, /invite_expires_at timestamptz/i);
  assert.match(groupMigration, /create or replace function public\.join_group_by_invite_code[\s\S]+v_user_id uuid := \(select auth\.uid\(\)\)/i);
  assert.match(groupMigration, /values \(v_group_id, v_user_id, 'member'\)[\s\S]+on conflict \(group_id, user_id\) do nothing/i);
  assert.match(groupMigration, /if v_invite_expires_at is not null and v_invite_expires_at <= pg_catalog\.now\(\)[\s\S]+using errcode = 'P0003'/i);
  assert.match(groupMigration, /create policy groups_select_members[\s\S]+using \(public\.is_group_member\(id\)\)/i);
  assert.match(groupMigration, /create policy group_challenges_insert_owner_challenge[\s\S]+public\.is_group_owner\(group_id\)/i);
  assert.match(groupMigration, /create policy user_challenge_progress_insert_group_members[\s\S]+user_id = \(select auth\.uid\(\)\)[\s\S]+public\.is_group_member\(gc\.group_id\)/i);
  assert.match(groupMigration, /create or replace function public\.list_group_members[\s\S]+if not public\.is_group_member\(p_group_id\)/i);
  assert.match(groupMigration, /case when u\.id = \(select auth\.uid\(\)\) then u\.email::text else null end/i);
  assert.match(groupMigration, /revoke all on public\.groups, public\.group_members, public\.group_challenges from public, anon/i);
  assert.match(groupMigration, /grant update \(name, description\) on public\.groups to authenticated/i);
  assert.doesNotMatch(groupMigration, /grant insert[^;]*public\.group_members/i);
});